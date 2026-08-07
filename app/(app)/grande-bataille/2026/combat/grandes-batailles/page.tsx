"use client";

import {
  ChevronDown,
  ChevronUp,
  Feather,
  Map as MapIcon,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import { Pagination, usePagination } from "@/components/pagination";
import RequireFeature from "@/components/require-feature";
import RichTextEditor from "@/components/rich-text-editor";
import { listBattlefields, type Battlefield } from "@/lib/battlefields";
import { getModuleAccessLevels } from "@/lib/features";
import {
  CHAPTER_HEALING_MODES,
  createGrandeBatailleChapter,
  deleteGrandeBatailleChapter,
  listGrandeBatailleChapters,
  updateGrandeBatailleChapter,
  type ChapterObjectiveInput,
  type GrandeBatailleChapter,
  type GrandeBatailleChapterInput,
} from "@/lib/grande-bataille-chapters";
import { uploadMedia } from "@/lib/media-library";
import { getOwnProfile } from "@/lib/profile";

const MapEditor = dynamic(() => import("@/components/map-editor"), {
  ssr: false,
});

const COORDINATION_KEY = "combat";
const YEAR = 2026;

function formatChapterDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

type SortDirection = "asc" | "desc";

const chapterFieldClassName =
  "rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800";

type ObjectiveFormRow = {
  key: string;
  description: string;
  rewardsDetail: string;
  percentage: string;
};

function GrandeBatailleChapterModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: GrandeBatailleChapter;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [date, setDate] = useState(initial?.date ?? "");
  const [gameText, setGameText] = useState(initial?.game_text ?? "");
  const [terrainLimits, setTerrainLimits] = useState(
    initial?.terrain_limits ?? "",
  );
  const [battlefields, setBattlefields] = useState<Battlefield[]>([]);
  const [selectedBattlefieldIds, setSelectedBattlefieldIds] = useState<
    string[]
  >(initial?.battlefields.map((b) => b.id) ?? []);
  const [duration, setDuration] = useState(initial?.duration ?? "");
  const [startTime, setStartTime] = useState(initial?.start_time ?? "");
  const [healingModes, setHealingModes] = useState<string[]>(
    initial?.healing_mode ?? [],
  );
  const [healingModeDetails, setHealingModeDetails] = useState(
    initial?.healing_mode_details ?? "",
  );
  const [objectiveRows, setObjectiveRows] = useState<ObjectiveFormRow[]>(
    () =>
      initial?.objectives.map((o) => ({
        key: o.id,
        description: o.description ?? "",
        rewardsDetail: o.rewards_detail ?? "",
        percentage: String(o.percentage),
      })) ?? [],
  );
  const [mapUrl, setMapUrl] = useState(initial?.map_url ?? "");
  const [specialRules, setSpecialRules] = useState(
    initial?.special_rules ?? "",
  );
  const [specialElements, setSpecialElements] = useState(
    initial?.special_elements ?? "",
  );
  const [monstersWarMachines, setMonstersWarMachines] = useState(
    initial?.monsters_war_machines ?? "",
  );
  const [isUploadingMap, setIsUploadingMap] = useState(false);
  const [isMapEditorOpen, setIsMapEditorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listBattlefields().then(setBattlefields);
  }, []);

  const toggleBattlefield = (id: string) => {
    setSelectedBattlefieldIds((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id],
    );
  };

  const toggleHealingMode = (mode: string) => {
    setHealingModes((prev) =>
      prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode],
    );
  };

  const addObjective = () => {
    setObjectiveRows((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        description: "",
        rewardsDetail: "",
        percentage: "",
      },
    ]);
  };

  const updateObjective = (
    key: string,
    field: "description" | "rewardsDetail" | "percentage",
    value: string,
  ) => {
    setObjectiveRows((prev) =>
      prev.map((o) => (o.key === key ? { ...o, [field]: value } : o)),
    );
  };

  const removeObjective = (key: string) => {
    setObjectiveRows((prev) => prev.filter((o) => o.key !== key));
  };

  const totalPercentage = objectiveRows.reduce(
    (sum, o) => sum + (parseFloat(o.percentage) || 0),
    0,
  );

  const handleMapUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setIsUploadingMap(true);
    try {
      const uploaded = await uploadMedia(file, "chapitres-grandes-batailles");
      setMapUrl(uploaded.url);
    } catch {
      setError("Échec du téléversement de la carte.");
    } finally {
      setIsUploadingMap(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    const objective_inputs: ChapterObjectiveInput[] = objectiveRows.map(
      (o, index) => ({
        description: o.description || null,
        rewards_detail: o.rewardsDetail || null,
        percentage: parseFloat(o.percentage) || 0,
        position: index,
      }),
    );

    const payload: GrandeBatailleChapterInput = {
      coordination_key: COORDINATION_KEY,
      year: YEAR,
      date,
      title,
      game_text: gameText || null,
      terrain_limits: terrainLimits || null,
      battlefield_ids: selectedBattlefieldIds,
      duration: duration || null,
      start_time: startTime || null,
      healing_mode: healingModes.length > 0 ? healingModes : null,
      healing_mode_details: healingModeDetails || null,
      objective_inputs,
      map_url: mapUrl || null,
      special_rules: specialRules || null,
      special_elements: specialElements || null,
      monsters_war_machines: monstersWarMachines || null,
    };

    try {
      if (initial) {
        await updateGrandeBatailleChapter(initial.id, payload);
      } else {
        await createGrandeBatailleChapter(payload);
      }
      await onSaved();
      onClose();
    } catch {
      setError("Échec de l'enregistrement.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-5xl flex-col gap-3 overflow-y-auto rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900"
      >
        <h2 className="font-semibold text-foreground">
          {initial ? "Modifier le chapitre" : "Créer un chapitre"}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre (ex. Reconnaissance des terres)"
            className={chapterFieldClassName}
          />
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={chapterFieldClassName}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-foreground">
            Texte jeu
          </label>
          <RichTextEditor
            value={gameText}
            onChange={setGameText}
            placeholder="Texte jeu"
            minHeight="10rem"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-foreground">
            Champs de bataille
          </label>
          {battlefields.length === 0 ? (
            <p className="text-xs text-foreground/40">
              Aucun champ de bataille défini — gère-les depuis la section
              &quot;Champs de bataille&quot; de la page Paramètres.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {battlefields.map((b) => {
                const isSelected = selectedBattlefieldIds.includes(b.id);
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => toggleBattlefield(b.id)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      isSelected
                        ? "border-primary bg-primary text-white"
                        : "border-black/[.08] text-foreground/70 hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
                    }`}
                  >
                    {b.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-foreground">
            Limites de terrain
          </label>
          <RichTextEditor
            value={terrainLimits}
            onChange={setTerrainLimits}
            placeholder="Détailler les limites de terrain"
            minHeight="8rem"
          />
        </div>
        <label className="mb-1 block text-sm font-semibold text-foreground">
          Temps
        </label>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            required
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="Durée (ex. 45 minutes)"
            className={chapterFieldClassName}
          />
          <input
            type="time"
            required
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className={chapterFieldClassName}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-foreground">
            Mode de guérison
          </label>
          <div className="flex flex-wrap gap-2">
            {CHAPTER_HEALING_MODES.map((m) => {
              const isSelected = healingModes.includes(m);
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleHealingMode(m)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    isSelected
                      ? "border-primary bg-primary text-white"
                      : "border-black/[.08] text-foreground/70 hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-foreground">
            Détail du mode de guérison
          </label>
          <RichTextEditor
            value={healingModeDetails}
            onChange={setHealingModeDetails}
            placeholder="Détail du mode de guérison"
            minHeight="10rem"
          />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm font-semibold text-foreground">
              Objectifs
            </label>
            <span
              className={`text-xs font-medium ${
                totalPercentage === 100
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              Total : {totalPercentage}%
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {objectiveRows.map((o, index) => (
              <div
                key={o.key}
                className="flex flex-col gap-2 rounded-lg border border-black/[.08] p-3 dark:border-white/[.145]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    Objectif {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeObjective(o.key)}
                    aria-label="Retirer l'objectif"
                    className="text-foreground/50 hover:text-foreground"
                  >
                    <X size={14} />
                  </button>
                </div>
                <label className="text-sm font-semibold text-foreground">
                  Objectifs et mécaniques
                </label>
                <RichTextEditor
                  value={o.description}
                  onChange={(html) => updateObjective(o.key, "description", html)}
                  placeholder="Détailler l'objectif et les mécaniques de jeu"
                  minHeight="8rem"
                />
                <label className="text-sm font-semibold text-foreground">
                  Gains
                </label>
                <RichTextEditor
                  value={o.rewardsDetail}
                  onChange={(html) =>
                    updateObjective(o.key, "rewardsDetail", html)
                  }
                  placeholder="Détailler les gains reliés"
                  minHeight="8rem"
                />
                <label className="flex items-center gap-2 text-sm text-foreground/70">
                  Valeur
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={o.percentage}
                    onChange={(e) =>
                      updateObjective(o.key, "percentage", e.target.value)
                    }
                    className={`w-24 ${chapterFieldClassName}`}
                  />
                  %
                </label>
              </div>
            ))}
            {objectiveRows.length === 0 && (
              <p className="text-xs text-foreground/40">
                Aucun objectif pour l&apos;instant.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={addObjective}
            className="mt-2 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <Plus size={14} />
            Ajouter un objectif
          </button>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-foreground">
            Règles spéciales
          </label>
          <RichTextEditor
            value={specialRules}
            onChange={setSpecialRules}
            placeholder="Détailler les règles spéciales"
            minHeight="8rem"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-foreground">
            Éléments spéciaux
          </label>
          <RichTextEditor
            value={specialElements}
            onChange={setSpecialElements}
            placeholder="Détailler les éléments spéciaux"
            minHeight="8rem"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-foreground">
            Monstres et machines de guerre
          </label>
          <RichTextEditor
            value={monstersWarMachines}
            onChange={setMonstersWarMachines}
            placeholder="Détailler les monstres et machines de guerre"
            minHeight="8rem"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-foreground">
            Carte
          </label>
          {mapUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mapUrl}
              alt="Carte du chapitre"
              className="mb-2 max-h-40 rounded border border-black/[.08] dark:border-white/[.145]"
            />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex w-fit cursor-pointer items-center gap-2 rounded-full border border-black/[.08] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]">
              <Upload size={14} />
              {isUploadingMap
                ? "Téléversement…"
                : mapUrl
                  ? "Remplacer la carte"
                  : "Téléverser une carte"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isUploadingMap}
                onChange={handleMapUpload}
              />
            </label>
            <button
              type="button"
              onClick={() => setIsMapEditorOpen(true)}
              className="flex items-center gap-2 rounded-full border border-black/[.08] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
            >
              <MapIcon size={14} />
              Création de carte
            </button>
          </div>
        </div>

        {isMapEditorOpen && (
          <div className="fixed inset-0 z-[60] overflow-y-auto bg-background">
            <MapEditor
              embedded
              onCancel={() => setIsMapEditorOpen(false)}
              onAttach={({ url }) => {
                setMapUrl(url);
                setIsMapEditorOpen(false);
              }}
            />
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="mt-1 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSaving || isUploadingMap}
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function GrandesBataillesPage() {
  const [chapters, setChapters] = useState<GrandeBatailleChapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingChapter, setEditingChapter] =
    useState<GrandeBatailleChapter | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [canWrite, setCanWrite] = useState(true);

  useEffect(() => {
    getOwnProfile().then((profile) => {
      if (!profile) return;
      getModuleAccessLevels(profile).then((levels) => {
        setCanWrite(levels["grandes-batailles"] === "ecriture");
      });
    });
  }, []);

  const fetchChapters = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listGrandeBatailleChapters(COORDINATION_KEY, YEAR);
      setChapters(data);
    } catch {
      setError("Impossible de charger les chapitres.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchChapters sets a loading flag ahead of an async fetch
    fetchChapters();
  }, []);

  const handleDelete = async (chapter: GrandeBatailleChapter) => {
    if (!canWrite) return;
    if (!window.confirm(`Supprimer le chapitre "${chapter.title}" ?`)) return;
    try {
      await deleteGrandeBatailleChapter(chapter.id);
      setChapters((prev) => prev.filter((c) => c.id !== chapter.id));
    } catch {
      alert("Échec de la suppression.");
    }
  };

  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const query = searchQuery.trim().toLowerCase();
  const visibleChapters = chapters
    .filter(
      (c) =>
        !query ||
        c.title.toLowerCase().includes(query) ||
        formatChapterDate(c.date).toLowerCase().includes(query),
    )
    .sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      return sortDirection === "asc" ? cmp : -cmp;
    });

  const {
    page: chaptersPage,
    pageCount: chaptersPageCount,
    setPage: setChaptersPage,
    pageItems: pagedChapters,
  } = usePagination(visibleChapters);

  return (
    <RequireFeature feature="grandes-batailles">
      <div>
        <h1 className={`${glofters.className} text-3xl text-foreground`}>
          Grandes Batailles
        </h1>
        <Breadcrumb />

        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
          {isLoading && (
            <p className="text-sm text-foreground/60">Chargement…</p>
          )}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          {!isLoading && !error && (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="relative">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher par titre…"
                    className="w-56 rounded-full border border-black/[.08] bg-white py-2 pl-9 pr-3 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
                  />
                </div>
                {canWrite && (
                  <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390]"
                  >
                    <Plus size={16} />
                    Créer un chapitre
                  </button>
                )}
              </div>

              {chapters.length === 0 && (
                <p className="text-sm text-foreground/60">
                  Aucun chapitre pour l&apos;instant.
                </p>
              )}

              {chapters.length > 0 && visibleChapters.length === 0 && (
                <p className="text-sm text-foreground/60">
                  Aucun chapitre ne correspond à ces critères.
                </p>
              )}

              {visibleChapters.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-black/[.08] text-foreground/60 dark:border-white/[.08]">
                        <th className="py-2 pr-4 font-medium">Titre</th>
                        <th className="py-2 pr-4 font-medium">
                          <button
                            type="button"
                            onClick={toggleSortDirection}
                            className="flex items-center gap-1 hover:text-foreground"
                          >
                            Date
                            {sortDirection === "asc" ? (
                              <ChevronUp size={14} />
                            ) : (
                              <ChevronDown size={14} />
                            )}
                          </button>
                        </th>
                        <th className="py-2 pr-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedChapters.map((chapter) => (
                        <tr
                          key={chapter.id}
                          className="border-b border-black/[.06] odd:bg-black/[.015] dark:border-white/[.06] dark:odd:bg-white/[.03]"
                        >
                          <td className="py-2 pr-4 text-foreground">
                            {chapter.title}
                          </td>
                          <td className="py-2 pr-4 text-foreground/80">
                            {formatChapterDate(chapter.date)}
                          </td>
                          <td className="py-2 pr-4">
                            {canWrite && (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => setEditingChapter(chapter)}
                                  aria-label="Modifier"
                                  className="rounded-full p-2 text-foreground/60 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                                >
                                  <Feather size={16} />
                                </button>
                                <button
                                  onClick={() => handleDelete(chapter)}
                                  aria-label="Supprimer"
                                  className="rounded-full p-2 text-foreground/60 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Pagination
                    page={chaptersPage}
                    pageCount={chaptersPageCount}
                    onPageChange={setChaptersPage}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {isCreateOpen && (
          <GrandeBatailleChapterModal
            onClose={() => setIsCreateOpen(false)}
            onSaved={fetchChapters}
          />
        )}
        {editingChapter && (
          <GrandeBatailleChapterModal
            initial={editingChapter}
            onClose={() => setEditingChapter(null)}
            onSaved={fetchChapters}
          />
        )}
      </div>
    </RequireFeature>
  );
}
