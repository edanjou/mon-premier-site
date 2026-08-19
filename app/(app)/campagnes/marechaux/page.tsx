"use client";

import {
  CalendarCheck,
  Cross,
  FileText,
  Flag,
  PocketKnife,
  Search,
  Star,
  Swords,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import { Pagination, usePagination } from "@/components/pagination";
import RequireFeature from "@/components/require-feature";
import RichTextEditor from "@/components/rich-text-editor";
import { listActivities, type ActivitySummary } from "@/lib/activities";
import { searchCharacters, type Character } from "@/lib/characters";
import { getModuleAccessLevels } from "@/lib/features";
import {
  addMarechal,
  listActivityStatusesForMarechal,
  listAssignedActivityCountByMarechal,
  listMarechaux,
  marechalDisplayName,
  removeMarechal,
  setMarechalActivityStatus,
  setMarechalFormation,
  toTitleCase,
  updateMarechal,
  type Marechal,
  type MarechalActivityStatus,
} from "@/lib/marechaux";
import {
  addMedic,
  listMedics,
  removeMedic,
  setResponsableMedic,
  type Medic,
} from "@/lib/medics";
import { getOwnProfile } from "@/lib/profile";
import {
  addWeaponMaster,
  listWeaponMasters,
  removeWeaponMaster,
  type WeaponMaster,
} from "@/lib/weapon-masters";

type Tab = "marechaux" | "medics" | "weapon-masters";

const TABS: {
  key: Tab;
  label: string;
  icon: typeof PocketKnife;
}[] = [
  { key: "marechaux", label: "Maréchaux", icon: PocketKnife },
  { key: "weapon-masters", label: "Maîtres d'armes", icon: Swords },
  { key: "medics", label: "Médics", icon: Cross },
];

function BooleanDot({
  value,
  onToggle,
}: {
  value: boolean;
  onToggle?: () => void;
}) {
  const className = `inline-block h-2.5 w-2.5 rounded-full ${
    value ? "bg-green-500" : "bg-red-500"
  }`;
  if (!onToggle) {
    return (
      <span role="img" aria-label={value ? "Oui" : "Non"} title={value ? "Oui" : "Non"} className={className} />
    );
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={value ? "Oui" : "Non"}
      title={value ? "Oui" : "Non"}
      className={`picker-button cursor-pointer ${className}`}
    />
  );
}

const inputClassName =
  "w-64 rounded-full border border-black/[.08] bg-white py-2 pl-9 pr-3 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800";
const rowClassName =
  "border-b border-black/[.06] odd:bg-black/[.015] dark:border-white/[.06] dark:odd:bg-white/[.03]";

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Search
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClassName}
      />
    </div>
  );
}

function AddMarechalSearch({
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
        placeholder="Rechercher un personnage à ajouter comme maréchal…"
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

function MarechalEditModal({
  marechal,
  onClose,
  onSaved,
}: {
  marechal: Marechal;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [isCampaignTeam, setIsCampaignTeam] = useState(
    marechal.is_campaign_team,
  );
  const [notes, setNotes] = useState(marechal.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await updateMarechal(marechal.id, {
        is_campaign_team: isCampaignTeam,
        notes: notes || null,
      });
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
        className="flex w-full max-w-md flex-col gap-3 rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900"
      >
        <h2 className="font-semibold text-foreground">
          {marechalDisplayName(marechal)}
        </h2>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={isCampaignTeam}
            onChange={(e) => setIsCampaignTeam(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Membre de l&apos;équipe campagne
        </label>
        <div>
          <label className="mb-1 block text-sm font-semibold text-foreground">
            Notes internes
          </label>
          <RichTextEditor
            value={notes}
            onChange={setNotes}
            placeholder="Notes et commentaires…"
            minHeight="6rem"
          />
        </div>
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

function formatActivityDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function MarechalAvailabilityModal({
  marechal,
  activities,
  canWrite,
  onClose,
}: {
  marechal: Marechal;
  activities: ActivitySummary[];
  canWrite: boolean;
  onClose: () => void;
}) {
  const [statuses, setStatuses] = useState<MarechalActivityStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listActivityStatusesForMarechal(marechal.id)
      .then(setStatuses)
      .catch(() => setError("Impossible de charger les disponibilités."))
      .finally(() => setIsLoading(false));
  }, [marechal.id]);

  const handleToggle = async (activityId: string, checked: boolean) => {
    if (!canWrite) return;
    setStatuses((prev) => {
      const exists = prev.some((s) => s.activity_id === activityId);
      if (exists) {
        return prev.map((s) =>
          s.activity_id === activityId ? { ...s, is_available: checked } : s,
        );
      }
      return [
        ...prev,
        {
          marechal_id: marechal.id,
          activity_id: activityId,
          is_available: checked,
          is_assigned: false,
          is_confirmed: false,
          is_registered: false,
          briefing_7h45: null,
          homologation_8h9h: null,
          homologation_9h10h: null,
          briefing_17h: null,
          position: 0,
        },
      ];
    });
    try {
      await setMarechalActivityStatus(marechal.id, activityId, {
        is_available: checked,
      });
    } catch {
      alert("Échec de la mise à jour.");
      setStatuses((prev) =>
        prev.map((s) =>
          s.activity_id === activityId
            ? { ...s, is_available: !checked }
            : s,
        ),
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-md flex-col gap-3 rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900"
      >
        <h2 className="font-semibold text-foreground">
          Disponibilités — {marechalDisplayName(marechal)}
        </h2>
        {isLoading && (
          <p className="text-sm text-foreground/60">Chargement…</p>
        )}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {!isLoading && !error && (
          <div className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto">
            {activities.map((activity) => (
              <label
                key={activity.id}
                className="flex items-center gap-2 rounded px-1 py-1.5 text-sm text-foreground hover:bg-black/[.03] dark:hover:bg-white/[.05]"
              >
                <input
                  type="checkbox"
                  disabled={!canWrite}
                  checked={
                    statuses.find((s) => s.activity_id === activity.id)
                      ?.is_available ?? false
                  }
                  onChange={(e) =>
                    handleToggle(activity.id, e.target.checked)
                  }
                  className="h-4 w-4 accent-primary disabled:cursor-not-allowed"
                />
                {activity.name} — {formatActivityDate(activity.date)}
              </label>
            ))}
            {activities.length === 0 && (
              <p className="text-sm text-foreground/60">
                Aucune campagne pour l&apos;instant.
              </p>
            )}
          </div>
        )}
        <div className="mt-1 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

function MarechauxTab({ canWrite }: { canWrite: boolean }) {
  const [marechaux, setMarechaux] = useState<Marechal[]>([]);
  const [campaignCounts, setCampaignCounts] = useState<Record<string, number>>(
    {},
  );
  const [activities, setActivities] = useState<ActivitySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingMarechal, setEditingMarechal] = useState<Marechal | null>(
    null,
  );
  const [availabilityMarechal, setAvailabilityMarechal] =
    useState<Marechal | null>(null);
  const [query, setQuery] = useState("");

  const fetchAll = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [list, counts, activityList] = await Promise.all([
        listMarechaux(),
        listAssignedActivityCountByMarechal(),
        listActivities(),
      ]);
      setMarechaux(list);
      setCampaignCounts(counts);
      setActivities(activityList);
    } catch {
      setError("Impossible de charger les maréchaux.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchAll sets a loading flag ahead of an async fetch
    fetchAll();
  }, []);

  const handleAdd = async (character: Character) => {
    if (!canWrite) return;
    try {
      await addMarechal(character.external_id);
      await fetchAll();
    } catch {
      alert("Échec de l'ajout.");
    }
  };

  const handleRemove = async (marechal: Marechal) => {
    if (!canWrite) return;
    if (!window.confirm(`Retirer ${marechalDisplayName(marechal)} des maréchaux ?`))
      return;
    try {
      await removeMarechal(marechal.id);
      setMarechaux((prev) => prev.filter((m) => m.id !== marechal.id));
    } catch {
      alert("Échec du retrait.");
    }
  };

  const handleToggleFormation = async (
    marechal: Marechal,
    field: "formation_2025" | "formation_2026",
  ) => {
    if (!canWrite) return;
    const nextValue = !marechal[field];
    setMarechaux((prev) =>
      prev.map((m) => (m.id === marechal.id ? { ...m, [field]: nextValue } : m)),
    );
    try {
      await setMarechalFormation(marechal.id, field, nextValue);
    } catch {
      alert("Échec de la mise à jour.");
      setMarechaux((prev) =>
        prev.map((m) =>
          m.id === marechal.id ? { ...m, [field]: !nextValue } : m,
        ),
      );
    }
  };

  const filterQuery = query.toLowerCase();
  const visible = marechaux
    .filter(
      (m) =>
        marechalDisplayName(m).toLowerCase().includes(filterQuery) ||
        m.name.toLowerCase().includes(filterQuery) ||
        (m.guild_name ?? "").toLowerCase().includes(filterQuery),
    )
    .sort((a, b) =>
      marechalDisplayName(a).localeCompare(marechalDisplayName(b), "fr"),
    );
  const { page, pageCount, setPage, pageItems } = usePagination(visible);

  return (
    <div className="flex flex-col gap-4">
      {canWrite && (
        <AddMarechalSearch
          onAdd={handleAdd}
          excludeIds={marechaux.map((m) => m.character_id)}
        />
      )}

      {isLoading && (
        <p className="text-sm text-foreground/60">Chargement…</p>
      )}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {!isLoading && !error && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Rechercher un maréchal…"
            />
            <span className="text-sm text-foreground/60">
              {visible.length} / {marechaux.length} maréchaux
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-black/[.08] text-foreground/60 dark:border-white/[.08]">
                  <th className="py-2 pr-4 font-medium">Nom</th>
                  <th className="py-2 pr-4 font-medium">Formation 2025</th>
                  <th className="py-2 pr-4 font-medium">Formation 2026</th>
                  <th className="py-2 pr-4 font-medium">Campagnes</th>
                  <th className="py-2 pr-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((m) => (
                  <tr key={m.id} className={rowClassName}>
                    <td className="py-2 pr-4 text-foreground">
                      <span className="flex items-center gap-1.5">
                        {m.is_campaign_team && (
                          <Flag
                            size={14}
                            className="text-primary"
                            aria-label="Équipe campagne"
                          />
                        )}
                        {marechalDisplayName(m)}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-foreground/80">
                      <BooleanDot
                        value={m.formation_2025}
                        onToggle={
                          canWrite
                            ? () => handleToggleFormation(m, "formation_2025")
                            : undefined
                        }
                      />
                    </td>
                    <td className="py-2 pr-4 text-foreground/80">
                      <BooleanDot
                        value={m.formation_2026}
                        onToggle={
                          canWrite
                            ? () => handleToggleFormation(m, "formation_2026")
                            : undefined
                        }
                      />
                    </td>
                    <td className="py-2 pr-4 text-foreground/80">
                      {campaignCounts[m.id] ?? 0}
                    </td>
                    <td className="py-2 pr-4">
                      {canWrite && (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setAvailabilityMarechal(m)}
                            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-foreground/60 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                          >
                            <CalendarCheck size={14} />
                            Disponibilités
                          </button>
                          <button
                            onClick={() => setEditingMarechal(m)}
                            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-foreground/60 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                          >
                            <FileText size={14} />
                            Détails
                          </button>
                          <button
                            onClick={() => handleRemove(m)}
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
            {visible.length === 0 && (
              <p className="py-3 text-sm text-foreground/60">
                Aucun maréchal pour l&apos;instant.
              </p>
            )}
          </div>
          <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
        </div>
      )}

      {editingMarechal && (
        <MarechalEditModal
          marechal={editingMarechal}
          onClose={() => setEditingMarechal(null)}
          onSaved={fetchAll}
        />
      )}

      {availabilityMarechal && (
        <MarechalAvailabilityModal
          marechal={availabilityMarechal}
          activities={activities}
          canWrite={canWrite}
          onClose={() => setAvailabilityMarechal(null)}
        />
      )}
    </div>
  );
}

function MedicsTab({ canWrite }: { canWrite: boolean }) {
  const [medics, setMedics] = useState<Medic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const fetchMedics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setMedics(await listMedics());
    } catch {
      setError("Impossible de charger les médics.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchMedics sets a loading flag ahead of an async fetch
    fetchMedics();
  }, []);

  const handleAdd = async (character: Character) => {
    if (!canWrite) return;
    try {
      await addMedic(character.external_id);
      await fetchMedics();
    } catch {
      alert("Échec de l'ajout.");
    }
  };

  const handleRemove = async (medic: Medic) => {
    if (!canWrite) return;
    if (!window.confirm(`Retirer ${marechalDisplayName(medic)} des médics ?`))
      return;
    try {
      await removeMedic(medic.id);
      setMedics((prev) => prev.filter((m) => m.id !== medic.id));
    } catch {
      alert("Échec du retrait.");
    }
  };

  const handleToggleResponsable = async (medic: Medic) => {
    if (!canWrite) return;
    const nextId = medic.is_responsable ? null : medic.id;
    setMedics((prev) =>
      prev.map((m) => ({ ...m, is_responsable: m.id === nextId })),
    );
    try {
      await setResponsableMedic(nextId);
    } catch {
      alert("Échec de la mise à jour.");
      fetchMedics();
    }
  };

  const filterQuery = query.toLowerCase();
  const visible = medics
    .filter(
      (m) =>
        marechalDisplayName(m).toLowerCase().includes(filterQuery) ||
        m.name.toLowerCase().includes(filterQuery),
    )
    .sort((a, b) =>
      marechalDisplayName(a).localeCompare(marechalDisplayName(b), "fr"),
    );
  const { page, pageCount, setPage, pageItems } = usePagination(visible);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        {canWrite && (
          <AddMarechalSearch
            onAdd={handleAdd}
            excludeIds={medics.map((m) => m.character_id)}
          />
        )}

        {isLoading && (
          <p className="text-sm text-foreground/60">Chargement…</p>
        )}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {!isLoading && !error && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder="Rechercher un médic…"
              />
              <span className="text-sm text-foreground/60">
                {visible.length} / {medics.length} médics
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[400px] text-left text-sm">
                <thead>
                  <tr className="border-b border-black/[.08] text-foreground/60 dark:border-white/[.08]">
                    <th className="py-2 pr-4 font-medium">Nom</th>
                    <th className="py-2 pr-4 font-medium">Responsable</th>
                    <th className="py-2 pr-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((m) => (
                    <tr key={m.id} className={rowClassName}>
                      <td className="py-2 pr-4 text-foreground">
                        {marechalDisplayName(m)}
                      </td>
                      <td className="py-2 pr-4">
                        <button
                          onClick={() => handleToggleResponsable(m)}
                          disabled={!canWrite}
                          aria-label={
                            m.is_responsable
                              ? "Retirer comme responsable"
                              : "Désigner comme responsable"
                          }
                          className={`rounded-full p-2 transition-colors hover:bg-black/[.05] disabled:cursor-default disabled:hover:bg-transparent dark:hover:bg-white/[.08] ${
                            m.is_responsable
                              ? "text-amber-500"
                              : "text-foreground/30"
                          }`}
                        >
                          <Star
                            size={16}
                            fill={m.is_responsable ? "currentColor" : "none"}
                          />
                        </button>
                      </td>
                      <td className="py-2 pr-4">
                        {canWrite && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleRemove(m)}
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
              {visible.length === 0 && (
                <p className="py-3 text-sm text-foreground/60">
                  Aucun médic pour l&apos;instant.
                </p>
              )}
            </div>
            <Pagination
              page={page}
              pageCount={pageCount}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function WeaponMastersTab({ canWrite }: { canWrite: boolean }) {
  const [weaponMasters, setWeaponMasters] = useState<WeaponMaster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const fetchWeaponMasters = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setWeaponMasters(await listWeaponMasters());
    } catch {
      setError("Impossible de charger les maîtres d'armes.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchWeaponMasters sets a loading flag ahead of an async fetch
    fetchWeaponMasters();
  }, []);

  const handleAdd = async (character: Character) => {
    if (!canWrite) return;
    try {
      await addWeaponMaster(character.external_id);
      await fetchWeaponMasters();
    } catch {
      alert("Échec de l'ajout.");
    }
  };

  const handleRemove = async (weaponMaster: WeaponMaster) => {
    if (!canWrite) return;
    if (
      !window.confirm(
        `Retirer ${marechalDisplayName(weaponMaster)} des maîtres d'armes ?`,
      )
    )
      return;
    try {
      await removeWeaponMaster(weaponMaster.id);
      setWeaponMasters((prev) => prev.filter((w) => w.id !== weaponMaster.id));
    } catch {
      alert("Échec du retrait.");
    }
  };

  const filterQuery = query.toLowerCase();
  const visible = weaponMasters
    .filter(
      (w) =>
        marechalDisplayName(w).toLowerCase().includes(filterQuery) ||
        w.name.toLowerCase().includes(filterQuery),
    )
    .sort((a, b) =>
      marechalDisplayName(a).localeCompare(marechalDisplayName(b), "fr"),
    );
  const { page, pageCount, setPage, pageItems } = usePagination(visible);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        {canWrite && (
          <AddMarechalSearch
            onAdd={handleAdd}
            excludeIds={weaponMasters.map((w) => w.character_id)}
          />
        )}

        {isLoading && (
          <p className="text-sm text-foreground/60">Chargement…</p>
        )}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {!isLoading && !error && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder="Rechercher un maître d'armes…"
              />
              <span className="text-sm text-foreground/60">
                {visible.length} / {weaponMasters.length} maîtres d&apos;armes
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[400px] text-left text-sm">
                <thead>
                  <tr className="border-b border-black/[.08] text-foreground/60 dark:border-white/[.08]">
                    <th className="py-2 pr-4 font-medium">Nom</th>
                    <th className="py-2 pr-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((w) => (
                    <tr key={w.id} className={rowClassName}>
                      <td className="py-2 pr-4 text-foreground">
                        {marechalDisplayName(w)}
                      </td>
                      <td className="py-2 pr-4">
                        {canWrite && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleRemove(w)}
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
              {visible.length === 0 && (
                <p className="py-3 text-sm text-foreground/60">
                  Aucun maître d&apos;armes pour l&apos;instant.
                </p>
              )}
            </div>
            <Pagination
              page={page}
              pageCount={pageCount}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function MarechauxContent() {
  const [tab, setTab] = useState<Tab>("marechaux");
  const [canWrite, setCanWrite] = useState(true);

  useEffect(() => {
    getOwnProfile().then((profile) => {
      if (!profile) return;
      getModuleAccessLevels(profile).then((levels) => {
        setCanWrite(levels["marechaux"] === "ecriture");
      });
    });
  }, []);

  return (
    <div>
      <h1 className={`${glofters.className} text-3xl text-foreground`}>
        Liste maréchaux
      </h1>
      <Breadcrumb />

      <div className="mt-6 flex gap-2 border-b border-black/[.08] dark:border-white/[.08]">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
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

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
        {tab === "marechaux" && <MarechauxTab canWrite={canWrite} />}
        {tab === "medics" && <MedicsTab canWrite={canWrite} />}
        {tab === "weapon-masters" && (
          <WeaponMastersTab canWrite={canWrite} />
        )}
      </div>
    </div>
  );
}

export default function MarechauxPage() {
  return (
    <RequireFeature feature="marechaux">
      <MarechauxContent />
    </RequireFeature>
  );
}
