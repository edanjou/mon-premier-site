"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Clock,
  Feather,
  GripVertical,
  Plus,
  ScrollText,
  Trash2,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import RequireFeature from "@/components/require-feature";
import RichTextEditor from "@/components/rich-text-editor";
import { searchCharacters, type Character } from "@/lib/characters";
import { getModuleAccessLevels } from "@/lib/features";
import { getOwnProfile } from "@/lib/profile";
import {
  addTournamentVolunteer,
  createTournament,
  deleteTournament,
  listTournamentScheduleBlocks,
  listTournamentVolunteers,
  listTournaments,
  removeTournamentVolunteer,
  saveTournamentScheduleBlocks,
  updateTournament,
  updateTournamentRules,
  updateTournamentVolunteerRole,
  type Tournament,
  type TournamentVolunteer,
} from "@/lib/tournaments";

const fieldClassName =
  "rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800";

function toTitleCase(value: string): string {
  return value
    .split(" ")
    .map((word) =>
      word
        .split("-")
        .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
        .join("-"),
    )
    .join(" ");
}

function volunteerDisplayName(v: {
  name: string;
  player_name: string | null;
}): string {
  return toTitleCase(v.player_name || v.name);
}

function formatTournamentDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

type DetailTab = "horaire" | "regles" | "benevoles";

const DETAIL_TABS: { key: DetailTab; label: string; icon: typeof Clock }[] = [
  { key: "horaire", label: "Horaire", icon: Clock },
  { key: "regles", label: "Règles", icon: ScrollText },
  { key: "benevoles", label: "Bénévoles", icon: Users },
];

function TournamentFormModal({
  tournament,
  onClose,
  onSaved,
}: {
  tournament: Tournament | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(tournament?.name ?? "");
  const [date, setDate] = useState(tournament?.date ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      if (tournament) {
        await updateTournament(tournament.id, { name, date: date || null });
      } else {
        await createTournament({ name, date: date || null });
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
        className="flex w-full max-w-sm flex-col gap-3 rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900"
      >
        <h2 className="font-semibold text-foreground">
          {tournament ? "Modifier le tournoi" : "Nouveau tournoi"}
        </h2>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom du tournoi"
          className={fieldClassName}
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={fieldClassName}
        />
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
            disabled={isSaving}
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}

type ScheduleFormRow = {
  key: string;
  label: string;
  startTime: string;
  endTime: string;
  position: number;
};

function SortableScheduleRow({
  row,
  canWrite,
  onUpdate,
  onRemove,
}: {
  row: ScheduleFormRow;
  canWrite: boolean;
  onUpdate: (
    key: string,
    field: "label" | "startTime" | "endTime",
    value: string,
  ) => void;
  onRemove: (key: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: row.key, disabled: !canWrite });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-lg border border-black/[.06] p-2 dark:border-white/[.06] ${
        isDragging ? "relative z-10 opacity-50" : ""
      }`}
    >
      {canWrite && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Déplacer"
          className="cursor-grab touch-none text-foreground/40 hover:text-foreground/70"
        >
          <GripVertical size={14} />
        </button>
      )}
      <input
        type="time"
        value={row.startTime}
        onChange={(e) => onUpdate(row.key, "startTime", e.target.value)}
        disabled={!canWrite}
        className={`${fieldClassName} disabled:opacity-60`}
      />
      <input
        type="time"
        value={row.endTime}
        onChange={(e) => onUpdate(row.key, "endTime", e.target.value)}
        disabled={!canWrite}
        className={`${fieldClassName} disabled:opacity-60`}
      />
      <input
        type="text"
        value={row.label}
        onChange={(e) => onUpdate(row.key, "label", e.target.value)}
        placeholder="Nom du bloc (ex. Inscriptions)"
        disabled={!canWrite}
        className={`flex-1 ${fieldClassName} disabled:opacity-60`}
      />
      {canWrite && (
        <button
          type="button"
          onClick={() => onRemove(row.key)}
          aria-label="Retirer"
          className="rounded-full p-1.5 text-foreground/50 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

function AddVolunteerSearch({
  onAdd,
  excludeIds,
}: {
  onAdd: (character: Character) => void;
  excludeIds: number[];
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Character[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing results synchronously when the search box is emptied
      setResults([]);
      return;
    }
    const handle = setTimeout(() => {
      setIsSearching(true);
      searchCharacters(trimmed)
        .then(setResults)
        .finally(() => setIsSearching(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  const suggestions = results.filter(
    (c) => !excludeIds.includes(c.external_id),
  );

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher un personnage à ajouter comme bénévole…"
        className="w-full rounded-full border border-black/[.08] bg-white px-4 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
      />
      {isSearching && (
        <p className="mt-1 text-xs text-foreground/40">Recherche…</p>
      )}
      {suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-black/[.08] bg-white shadow-lg dark:border-white/[.145] dark:bg-zinc-800">
          {suggestions.map((c) => (
            <button
              key={c.external_id}
              type="button"
              onClick={() => {
                onAdd(c);
                setQuery("");
                setResults([]);
              }}
              className="picker-button block w-full px-3 py-2 text-left text-sm hover:bg-black/[.04] dark:hover:bg-white/[.08]"
            >
              {toTitleCase(c.player_name || c.name)}
              {c.player_name ? ` — ${toTitleCase(c.name)}` : ""}
              {c.player_email ? ` — ${c.player_email}` : ""}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TournamentDetailsModal({
  tournament,
  canWrite,
  onClose,
  onSaved,
}: {
  tournament: Tournament;
  canWrite: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [tab, setTab] = useState<DetailTab>("horaire");
  const [rules, setRules] = useState(tournament.rules ?? "");
  const [scheduleRows, setScheduleRows] = useState<ScheduleFormRow[]>([]);
  const [volunteers, setVolunteers] = useState<TournamentVolunteer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      listTournamentScheduleBlocks(tournament.id),
      listTournamentVolunteers(tournament.id),
    ])
      .then(([blocks, vols]) => {
        setScheduleRows(
          blocks.map((b) => ({
            key: b.id,
            label: b.label,
            startTime: b.start_time ?? "",
            endTime: b.end_time ?? "",
            position: b.position,
          })),
        );
        setVolunteers(vols);
      })
      .finally(() => setIsLoading(false));
  }, [tournament.id]);

  const addScheduleRow = () => {
    if (!canWrite) return;
    const maxPosition = Math.max(-1, ...scheduleRows.map((r) => r.position));
    setScheduleRows((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        label: "",
        startTime: "",
        endTime: "",
        position: maxPosition + 1,
      },
    ]);
  };

  const updateScheduleRow = (
    key: string,
    field: "label" | "startTime" | "endTime",
    value: string,
  ) => {
    if (!canWrite) return;
    setScheduleRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)),
    );
  };

  const removeScheduleRow = (key: string) => {
    if (!canWrite) return;
    setScheduleRows((prev) => prev.filter((r) => r.key !== key));
  };

  const scheduleSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleScheduleDragEnd = (event: DragEndEvent) => {
    if (!canWrite) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = scheduleRows.findIndex((r) => r.key === active.id);
    const toIndex = scheduleRows.findIndex((r) => r.key === over.id);
    if (fromIndex === -1 || toIndex === -1) return;
    const reordered = arrayMove(scheduleRows, fromIndex, toIndex);
    setScheduleRows(
      reordered.map((r, index) => ({ ...r, position: index })),
    );
  };

  const handleAddVolunteer = async (character: Character) => {
    if (!canWrite) return;
    try {
      const created = await addTournamentVolunteer(
        tournament.id,
        character.external_id,
      );
      setVolunteers((prev) => [...prev, created]);
    } catch {
      alert("Échec de l'ajout.");
    }
  };

  const handleVolunteerRoleChange = (id: string, role: string) => {
    if (!canWrite) return;
    setVolunteers((prev) =>
      prev.map((v) => (v.id === id ? { ...v, role } : v)),
    );
  };

  const handleVolunteerRoleBlur = async (volunteer: TournamentVolunteer) => {
    if (!canWrite) return;
    try {
      await updateTournamentVolunteerRole(
        volunteer.id,
        volunteer.role || null,
      );
    } catch {
      alert("Échec de la mise à jour.");
    }
  };

  const handleRemoveVolunteer = async (volunteer: TournamentVolunteer) => {
    if (!canWrite) return;
    setVolunteers((prev) => prev.filter((v) => v.id !== volunteer.id));
    try {
      await removeTournamentVolunteer(volunteer.id);
    } catch {
      alert("Échec du retrait.");
      setVolunteers((prev) => [...prev, volunteer]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
    setError(null);
    setIsSaving(true);
    try {
      await Promise.all([
        updateTournamentRules(tournament.id, rules || null),
        saveTournamentScheduleBlocks(
          tournament.id,
          scheduleRows.map((r, index) => ({
            label: r.label,
            start_time: r.startTime || null,
            end_time: r.endTime || null,
            position: index,
          })),
        ),
      ]);
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
        className="flex max-h-[85vh] w-full max-w-3xl flex-col gap-4 overflow-hidden rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">
            {tournament.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full p-1 hover:bg-black/[.04] dark:hover:bg-white/[.08]"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-2 border-b border-black/[.08] dark:border-white/[.08]">
          {DETAIL_TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 rounded-t-lg px-3 py-2 text-sm font-medium transition-colors ${
                  tab === t.key
                    ? "border-b-2 border-primary text-primary"
                    : "text-foreground/60 hover:text-foreground"
                }`}
              >
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-foreground/60">Chargement…</p>
          ) : (
            <>
              {tab === "horaire" && (
                <div className="flex flex-col gap-3">
                  <DndContext
                    sensors={scheduleSensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleScheduleDragEnd}
                  >
                    <SortableContext
                      items={scheduleRows.map((r) => r.key)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="flex flex-col gap-2">
                        {scheduleRows.map((row) => (
                          <SortableScheduleRow
                            key={row.key}
                            row={row}
                            canWrite={canWrite}
                            onUpdate={updateScheduleRow}
                            onRemove={removeScheduleRow}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                  {scheduleRows.length === 0 && (
                    <p className="text-sm text-foreground/60">
                      Aucun bloc pour l&apos;instant.
                    </p>
                  )}
                  {canWrite && (
                    <button
                      type="button"
                      onClick={addScheduleRow}
                      className="flex w-fit items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      <Plus size={14} />
                      Ajouter un bloc
                    </button>
                  )}
                </div>
              )}

              {tab === "regles" && (
                <RichTextEditor
                  value={rules}
                  onChange={setRules}
                  placeholder="Détailler les règles du tournoi"
                  minHeight="10rem"
                  readOnly={!canWrite}
                />
              )}

              {tab === "benevoles" && (
                <div className="flex flex-col gap-4">
                  {canWrite && (
                    <AddVolunteerSearch
                      onAdd={handleAddVolunteer}
                      excludeIds={volunteers.map((v) => v.character_id)}
                    />
                  )}
                  {volunteers.length === 0 && (
                    <p className="text-sm text-foreground/60">
                      Aucun bénévole pour l&apos;instant.
                    </p>
                  )}
                  <div className="flex flex-col gap-2">
                    {volunteers.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center gap-3 rounded-lg border border-black/[.06] px-3 py-2 dark:border-white/[.06]"
                      >
                        <span className="flex-1 text-sm text-foreground">
                          {volunteerDisplayName(v)}
                        </span>
                        <input
                          type="text"
                          value={v.role ?? ""}
                          onChange={(e) =>
                            handleVolunteerRoleChange(v.id, e.target.value)
                          }
                          onBlur={() => handleVolunteerRoleBlur(v)}
                          placeholder="Rôle (ex. Arbitre, Inscriptions)"
                          disabled={!canWrite}
                          className={`w-64 ${fieldClassName} disabled:opacity-60`}
                        />
                        {canWrite && (
                        <button
                          type="button"
                          onClick={() => handleRemoveVolunteer(v)}
                          aria-label="Retirer"
                          className="rounded-full p-1.5 text-foreground/50 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                        >
                          <Trash2 size={14} />
                        </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
          >
            Fermer
          </button>
          {canWrite && (
            <button
              type="submit"
              disabled={isSaving || isLoading}
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "…" : "Enregistrer"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function TournamentsContent() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formTournament, setFormTournament] = useState<
    Tournament | "new" | null
  >(null);
  const [detailsTournament, setDetailsTournament] = useState<Tournament | null>(
    null,
  );
  const [canWrite, setCanWrite] = useState(true);

  useEffect(() => {
    getOwnProfile().then((profile) => {
      if (!profile) return;
      getModuleAccessLevels(profile).then((levels) => {
        setCanWrite(levels["tournois"] === "ecriture");
      });
    });
  }, []);

  const fetchAll = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setTournaments(await listTournaments());
    } catch {
      setError("Impossible de charger les tournois.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchAll sets a loading flag ahead of an async fetch
    fetchAll();
  }, []);

  const handleDelete = async (tournament: Tournament) => {
    if (!canWrite) return;
    if (!window.confirm(`Supprimer le tournoi "${tournament.name}" ?`))
      return;
    try {
      await deleteTournament(tournament.id);
      setTournaments((prev) => prev.filter((t) => t.id !== tournament.id));
    } catch {
      alert("Échec de la suppression.");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className={`${glofters.className} text-3xl text-foreground`}>
          Tournois
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href="/grande-bataille/2026/tournois/feuille-de-temps"
            className="flex items-center gap-2 rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-black/[.05] dark:border-white/[.145] dark:hover:bg-white/[.08]"
          >
            <Clock size={16} />
            Feuille de temps
          </Link>
          {canWrite && (
            <button
              type="button"
              onClick={() => setFormTournament("new")}
              className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390]"
            >
              <Plus size={16} />
              Ajouter un tournoi
            </button>
          )}
        </div>
      </div>
      <Breadcrumb />

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
        {isLoading && (
          <p className="text-sm text-foreground/60">Chargement…</p>
        )}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {!isLoading && !error && tournaments.length === 0 && (
          <p className="text-sm text-foreground/60">
            Aucun tournoi pour l&apos;instant.
          </p>
        )}
        {!isLoading && !error && tournaments.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead>
                <tr className="border-b border-black/[.08] text-foreground/60 dark:border-white/[.08]">
                  <th className="py-2 pr-4 font-medium">Nom</th>
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tournaments.map((tournament) => (
                  <tr
                    key={tournament.id}
                    className="border-b border-black/[.06] odd:bg-black/[.015] dark:border-white/[.06] dark:odd:bg-white/[.03]"
                  >
                    <td className="py-2 pr-4 text-foreground">
                      {tournament.name}
                    </td>
                    <td className="py-2 pr-4 text-foreground/80">
                      {formatTournamentDate(tournament.date)}
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setDetailsTournament(tournament)}
                          className="flex items-center gap-1.5 rounded-full border border-black/[.08] px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
                        >
                          Détails
                        </button>
                        {canWrite && (
                          <>
                            <button
                              type="button"
                              onClick={() => setFormTournament(tournament)}
                              aria-label="Modifier"
                              className="rounded-full p-2 text-foreground/60 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                            >
                              <Feather size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(tournament)}
                              aria-label="Supprimer"
                              className="rounded-full p-2 text-foreground/60 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formTournament && (
        <TournamentFormModal
          tournament={formTournament === "new" ? null : formTournament}
          onClose={() => setFormTournament(null)}
          onSaved={fetchAll}
        />
      )}

      {detailsTournament && (
        <TournamentDetailsModal
          tournament={detailsTournament}
          canWrite={canWrite}
          onClose={() => setDetailsTournament(null)}
          onSaved={fetchAll}
        />
      )}
    </div>
  );
}

export default function TournoisPage() {
  return (
    <RequireFeature feature="tournois">
      <TournamentsContent />
    </RequireFeature>
  );
}
