"use client";

import {
  CalendarClock,
  Cross,
  Feather,
  Flag,
  Plus,
  PocketKnife,
  Search,
  Star,
  Swords,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import { Pagination, usePagination } from "@/components/pagination";
import RequireFeature from "@/components/require-feature";
import RichTextEditor from "@/components/rich-text-editor";
import {
  listActivityChapters,
  type ActivityChapter,
} from "@/lib/activity-chapters";
import {
  FRONT_COLORS,
  FRONT_COLOR_STYLES,
  type FrontColor,
} from "@/lib/activity-fronts";
import { searchCharacters, type Character } from "@/lib/characters";
import {
  createMarechalTask,
  deleteMarechalTask,
  listAllMarechalTasks,
  updateMarechalTask,
  type MarechalTask,
} from "@/lib/marechal-tasks";
import {
  addMarechal,
  listAssignedActivityCountByMarechal,
  listAssignedMarechalIdsByActivity,
  listCampaignTeamAssignedCounts,
  listMarechalActivityStatuses,
  listMarechaux,
  listNonCampaignTeamStatusCounts,
  removeMarechal,
  setMarechalActivityStatus,
  setMarechalFormation,
  updateMarechal,
  type Marechal,
} from "@/lib/marechaux";
import {
  addMedic,
  listMedicActivityStatuses,
  listMedicActivityStatusCounts,
  listMedics,
  removeMedic,
  setMedicActivityStatus,
  setResponsableMedic,
  type Medic,
} from "@/lib/medics";
import { supabase } from "@/lib/supabase";
import { listTaskTypes, type TaskType } from "@/lib/task-types";
import {
  addWeaponMaster,
  listWeaponMasterActivityStatuses,
  listWeaponMasterActivityStatusCounts,
  listWeaponMasters,
  removeWeaponMaster,
  setWeaponMasterActivityStatus,
  type WeaponMaster,
} from "@/lib/weapon-masters";

type Tab = "marechaux" | "campagnes" | "medics" | "weapon-masters";

const TABS: {
  key: Tab;
  label: string;
  icon: typeof PocketKnife;
  separatorBefore?: boolean;
}[] = [
  { key: "marechaux", label: "Maréchaux", icon: PocketKnife },
  { key: "weapon-masters", label: "Maîtres d'armes", icon: Swords },
  { key: "medics", label: "Médics", icon: Cross },
  {
    key: "campagnes",
    label: "Campagnes",
    icon: CalendarClock,
    separatorBefore: true,
  },
];

type ActivityRow = {
  id: string;
  name: string;
  date: string;
  marshal_count: number | null;
  healer_count: number | null;
  campaign_team_count: number | null;
  weapon_master_count: number | null;
};

const pillClassName = (active: boolean) =>
  `rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
    active
      ? "border-primary bg-primary text-white"
      : "border-black/[.08] text-foreground/70 hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
  }`;

const filterSelectClassName =
  "rounded-full border border-black/[.08] bg-white px-3 py-1 text-xs font-medium text-foreground dark:border-white/[.145] dark:bg-zinc-800";

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

function getActivityYears(activities: ActivityRow[]): string[] {
  return Array.from(new Set(activities.map((a) => a.date.slice(0, 4)))).sort(
    (a, b) => b.localeCompare(a),
  );
}

function ActivityFiltersBar({
  year,
  onYearChange,
  years,
}: {
  year: string;
  onYearChange: (value: string) => void;
  years: string[];
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <select
        value={year}
        onChange={(e) => onYearChange(e.target.value)}
        className={filterSelectClassName}
      >
        <option value="">Toutes les années</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
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

function marechalDisplayName(m: { name: string; player_name: string | null }): string {
  return toTitleCase(m.player_name || m.name);
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

function MarechauxTab() {
  const [marechaux, setMarechaux] = useState<Marechal[]>([]);
  const [campaignCounts, setCampaignCounts] = useState<Record<string, number>>(
    {},
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingMarechal, setEditingMarechal] = useState<Marechal | null>(
    null,
  );
  const [query, setQuery] = useState("");

  const fetchAll = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [list, counts] = await Promise.all([
        listMarechaux(),
        listAssignedActivityCountByMarechal(),
      ]);
      setMarechaux(list);
      setCampaignCounts(counts);
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
    try {
      await addMarechal(character.external_id);
      await fetchAll();
    } catch {
      alert("Échec de l'ajout.");
    }
  };

  const handleRemove = async (marechal: Marechal) => {
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
      <AddMarechalSearch
        onAdd={handleAdd}
        excludeIds={marechaux.map((m) => m.character_id)}
      />

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
                        onToggle={() => handleToggleFormation(m, "formation_2025")}
                      />
                    </td>
                    <td className="py-2 pr-4 text-foreground/80">
                      <BooleanDot
                        value={m.formation_2026}
                        onToggle={() => handleToggleFormation(m, "formation_2026")}
                      />
                    </td>
                    <td className="py-2 pr-4 text-foreground/80">
                      {campaignCounts[m.id] ?? 0}
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditingMarechal(m)}
                          aria-label="Modifier"
                          className="rounded-full p-2 text-foreground/60 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                        >
                          <Feather size={16} />
                        </button>
                        <button
                          onClick={() => handleRemove(m)}
                          aria-label="Supprimer"
                          className="rounded-full p-2 text-foreground/60 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
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
    </div>
  );
}

function StatusModal({
  activity,
  marechaux,
  onClose,
}: {
  activity: ActivityRow;
  marechaux: Marechal[];
  onClose: () => void;
}) {
  const [statuses, setStatuses] = useState<
    Record<string, { is_available: boolean; is_assigned: boolean }>
  >({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    listMarechalActivityStatuses(activity.id)
      .then((rows) => {
        const map: Record<
          string,
          { is_available: boolean; is_assigned: boolean }
        > = {};
        rows.forEach((r) => {
          map[r.marechal_id] = {
            is_available: r.is_available,
            is_assigned: r.is_assigned,
          };
        });
        setStatuses(map);
      })
      .finally(() => setIsLoading(false));
  }, [activity.id]);

  const toggle = async (
    marechalId: string,
    field: "is_available" | "is_assigned",
  ) => {
    const current = statuses[marechalId] ?? {
      is_available: false,
      is_assigned: false,
    };
    const next = { ...current, [field]: !current[field] };

    if (field === "is_assigned" && next.is_assigned) {
      const marechal = marechaux.find((m) => m.id === marechalId);
      const isCampaignTeam = marechal?.is_campaign_team ?? false;

      if (isCampaignTeam && activity.campaign_team_count) {
        const campaignAssignedCount = marechaux.filter(
          (m) => m.is_campaign_team && statuses[m.id]?.is_assigned,
        ).length;
        if (campaignAssignedCount >= activity.campaign_team_count) {
          alert(
            `Le nombre de membres de l'équipe campagne (${activity.campaign_team_count}) prévu pour cette campagne est déjà atteint.`,
          );
          return;
        }
      } else if (!isCampaignTeam && activity.marshal_count) {
        const marshalAssignedCount = marechaux.filter(
          (m) => !m.is_campaign_team && statuses[m.id]?.is_assigned,
        ).length;
        if (marshalAssignedCount >= activity.marshal_count) {
          alert(
            `Le nombre de maréchaux assignés (${activity.marshal_count}) prévu pour cette campagne est déjà atteint.`,
          );
          return;
        }
      }
    }

    setStatuses((prev) => ({ ...prev, [marechalId]: next }));
    try {
      await setMarechalActivityStatus(marechalId, activity.id, {
        [field]: next[field],
      });
    } catch {
      setStatuses((prev) => ({ ...prev, [marechalId]: current }));
      alert("Échec de la mise à jour.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">{activity.name}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full p-1 hover:bg-black/[.04] dark:hover:bg-white/[.08]"
          >
            <X size={20} />
          </button>
        </div>

        {isLoading ? (
          <p className="text-sm text-foreground/60">Chargement…</p>
        ) : marechaux.length === 0 ? (
          <p className="text-sm text-foreground/60">
            Aucun maréchal — ajoutes-en depuis l&apos;onglet Maréchaux.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {[...marechaux]
              .sort((a, b) =>
                marechalDisplayName(a).localeCompare(marechalDisplayName(b), "fr"),
              )
              .map((m) => {
              const status = statuses[m.id] ?? {
                is_available: false,
                is_assigned: false,
              };
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-black/[.08] p-2 dark:border-white/[.145]"
                >
                  <span className="flex items-center gap-1.5 text-sm text-foreground">
                    {m.is_campaign_team && (
                      <Flag
                        size={14}
                        className="text-primary"
                        aria-label="Équipe campagne"
                      />
                    )}
                    {marechalDisplayName(m)}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggle(m.id, "is_available")}
                      className={pillClassName(status.is_available)}
                    >
                      Disponible
                    </button>
                    <button
                      type="button"
                      onClick={() => toggle(m.id, "is_assigned")}
                      className={pillClassName(status.is_assigned)}
                    >
                      Assigné
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function CampagnesTab({ marechaux }: { marechaux: Marechal[] }) {
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [counts, setCounts] = useState<
    Record<string, { available: number; assigned: number }>
  >({});
  const [campaignTeamCounts, setCampaignTeamCounts] = useState<
    Record<string, number>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusActivity, setStatusActivity] = useState<ActivityRow | null>(
    null,
  );
  const [tasksActivity, setTasksActivity] = useState<ActivityRow | null>(
    null,
  );
  const [filterYear, setFilterYear] = useState("");

  const fetchAll = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [{ data, error: fetchError }, countsResult, campaignTeamResult] =
        await Promise.all([
          supabase
            .from("activities")
            .select(
              "id, name, date, marshal_count, healer_count, campaign_team_count, weapon_master_count",
            )
            .order("date", { ascending: true }),
          listNonCampaignTeamStatusCounts(),
          listCampaignTeamAssignedCounts(),
        ]);
      if (fetchError) throw fetchError;
      setActivities(data ?? []);
      setCounts(countsResult);
      setCampaignTeamCounts(campaignTeamResult);
    } catch {
      setError("Impossible de charger les activités.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchAll sets a loading flag ahead of an async fetch
    fetchAll();
  }, []);

  const years = getActivityYears(activities);
  const visibleActivities = activities.filter(
    (a) => !filterYear || a.date.startsWith(filterYear),
  );

  return (
    <div>
      <ActivityFiltersBar
        year={filterYear}
        onYearChange={setFilterYear}
        years={years}
      />

      {isLoading && (
        <p className="text-sm text-foreground/60">Chargement…</p>
      )}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {!isLoading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/[.08] text-foreground/60 dark:border-white/[.08]">
                <th className="py-2 pr-4 font-medium">Nom</th>
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">Disponibles</th>
                <th className="py-2 pr-4 font-medium">Assignés</th>
                <th className="py-2 pr-4 font-medium">Équipe campagne</th>
                <th className="py-2 pr-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleActivities.map((activity) => (
                <tr
                  key={activity.id}
                  className="border-b border-black/[.06] odd:bg-black/[.015] dark:border-white/[.06] dark:odd:bg-white/[.03]"
                >
                  <td className="py-2 pr-4 text-foreground">
                    {activity.name}
                  </td>
                  <td className="py-2 pr-4 text-foreground/80">
                    {formatActivityDate(activity.date)}
                  </td>
                  <td className="py-2 pr-4 text-foreground/80">
                    {counts[activity.id]?.available ?? 0}
                  </td>
                  <td className="py-2 pr-4 text-foreground/80">
                    {counts[activity.id]?.assigned ?? 0} /{" "}
                    {activity.marshal_count ?? "—"}
                  </td>
                  <td className="py-2 pr-4 text-foreground/80">
                    {campaignTeamCounts[activity.id] ?? 0} /{" "}
                    {activity.campaign_team_count ?? "—"}
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setStatusActivity(activity)}
                        className="flex items-center gap-1.5 rounded-full border border-black/[.08] px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
                      >
                        Gérer l&apos;équipe
                      </button>
                      <button
                        onClick={() => setTasksActivity(activity)}
                        className="flex items-center gap-1.5 rounded-full border border-black/[.08] px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
                      >
                        Tâches
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleActivities.length === 0 && (
            <p className="py-3 text-sm text-foreground/60">
              Aucune activité pour l&apos;instant.
            </p>
          )}
        </div>
      )}

      {statusActivity && (
        <StatusModal
          activity={statusActivity}
          marechaux={marechaux}
          onClose={() => {
            setStatusActivity(null);
            fetchAll();
          }}
        />
      )}

      {tasksActivity && (
        <ActivityTasksModal
          activity={tasksActivity}
          marechaux={marechaux}
          onClose={() => setTasksActivity(null)}
        />
      )}
    </div>
  );
}

function ActivityTasksModal({
  activity,
  marechaux,
  onClose,
}: {
  activity: ActivityRow;
  marechaux: Marechal[];
  onClose: () => void;
}) {
  const [tasks, setTasks] = useState<MarechalTask[]>([]);
  const [filter, setFilter] = useState<"toutes" | "ramassage">("toutes");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [chapters, setChapters] = useState<ActivityChapter[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState("");
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [newTaskTypeId, setNewTaskTypeId] = useState("");
  const [newIsRamassage, setNewIsRamassage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTasks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setTasks(await listAllMarechalTasks());
    } catch {
      setError("Impossible de charger les tâches.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchTasks sets a loading flag ahead of an async fetch
    fetchTasks();
    listTaskTypes().then(setTaskTypes);
    listActivityChapters(activity.id).then((list) => {
      setChapters(list);
      setSelectedChapterId(list[0]?.id ?? "");
    });
    listAssignedMarechalIdsByActivity().then((map) =>
      setAssignedIds(map[activity.id] ?? []),
    );
  }, [activity.id]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChapterId || !newLabel.trim()) return;
    setIsSubmitting(true);
    try {
      await createMarechalTask({
        chapter_id: selectedChapterId,
        label: newLabel.trim(),
        task_type_id: newTaskTypeId || null,
        is_ramassage: newIsRamassage,
      });
      setNewLabel("");
      setNewTaskTypeId("");
      setNewIsRamassage(false);
      await fetchTasks();
    } catch {
      alert("Échec de l'ajout.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssign = async (task: MarechalTask, marechalId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? { ...t, assigned_marechal_id: marechalId || null }
          : t,
      ),
    );
    try {
      await updateMarechalTask(task.id, {
        assigned_marechal_id: marechalId || null,
      });
    } catch {
      alert("Échec de l'assignation.");
      fetchTasks();
    }
  };

  const handleSetTaskType = async (task: MarechalTask, taskTypeId: string) => {
    const taskType = taskTypes.find((t) => t.id === taskTypeId) ?? null;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              task_type_id: taskTypeId || null,
              task_type_name: taskType?.name ?? null,
            }
          : t,
      ),
    );
    try {
      await updateMarechalTask(task.id, { task_type_id: taskTypeId || null });
    } catch {
      alert("Échec de la mise à jour.");
      fetchTasks();
    }
  };

  const handleToggleDone = async (task: MarechalTask) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)),
    );
    try {
      await updateMarechalTask(task.id, { done: !task.done });
    } catch {
      alert("Échec de la mise à jour.");
      fetchTasks();
    }
  };

  const handleToggleRamassage = async (task: MarechalTask) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, is_ramassage: !t.is_ramassage } : t,
      ),
    );
    try {
      await updateMarechalTask(task.id, { is_ramassage: !task.is_ramassage });
    } catch {
      alert("Échec de la mise à jour.");
      fetchTasks();
    }
  };

  const handleDelete = async (task: MarechalTask) => {
    if (!window.confirm(`Supprimer la tâche "${task.label}" ?`)) return;
    try {
      await deleteMarechalTask(task.id);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    } catch {
      alert("Échec de la suppression.");
    }
  };

  const visibleTasks = tasks
    .filter((t) => t.activity_id === activity.id)
    .filter((t) => (filter === "ramassage" ? t.is_ramassage : true));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-3xl flex-col gap-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">
            Tâches — {activity.name}
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

          <form
            onSubmit={handleAddTask}
            className="flex flex-wrap items-end gap-2 rounded-lg border border-black/[.08] p-3 dark:border-white/[.145]"
          >
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-foreground/70">
                Chapitre
              </label>
              <select
                name="marechal-task-chapter"
                value={selectedChapterId}
                onChange={(e) => setSelectedChapterId(e.target.value)}
                disabled={chapters.length === 0}
                className="rounded border border-black/[.08] bg-white px-2 py-1.5 text-sm text-foreground disabled:opacity-50 dark:border-white/[.145] dark:bg-zinc-800"
              >
                {chapters.length === 0 && (
                  <option value="">Aucun chapitre</option>
                )}
                {chapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label className="text-xs font-medium text-foreground/70">
                Tâche
              </label>
              <input
                type="text"
                name="marechal-task-label"
                autoComplete="off"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Nom de la tâche…"
                className="rounded border border-black/[.08] bg-white px-2 py-1.5 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-foreground/70">
                Type
              </label>
              <select
                name="marechal-task-type"
                value={newTaskTypeId}
                onChange={(e) => setNewTaskTypeId(e.target.value)}
                className="rounded border border-black/[.08] bg-white px-2 py-1.5 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
              >
                <option value="">—</option>
                {taskTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-1.5 pb-1.5 text-xs text-foreground/70">
              <input
                type="checkbox"
                checked={newIsRamassage}
                onChange={(e) => setNewIsRamassage(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Ramassage
            </label>
            <button
              type="submit"
              disabled={isSubmitting || !selectedChapterId}
              className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#0c4390] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={14} />
              Ajouter
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFilter("toutes")}
              className={pillClassName(filter === "toutes")}
            >
              Toutes
            </button>
            <button
              type="button"
              onClick={() => setFilter("ramassage")}
              className={pillClassName(filter === "ramassage")}
            >
              Ramassage
            </button>
          </div>

          {isLoading && (
            <p className="text-sm text-foreground/60">Chargement…</p>
          )}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          {!isLoading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead>
                  <tr className="border-b border-black/[.08] text-foreground/60 dark:border-white/[.08]">
                    <th className="py-2 pr-4 font-medium">Chapitre</th>
                    <th className="py-2 pr-4 font-medium">Tâche</th>
                    <th className="py-2 pr-4 font-medium">Maréchal</th>
                    <th className="py-2 pr-4 font-medium">Type</th>
                    <th className="py-2 pr-4 font-medium">Ramassage</th>
                    <th className="py-2 pr-4 font-medium">Fait</th>
                    <th className="py-2 pr-4 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {visibleTasks.map((task) => (
                    <tr
                      key={task.id}
                      className="border-b border-black/[.06] odd:bg-black/[.015] dark:border-white/[.06] dark:odd:bg-white/[.03]"
                    >
                      <td className="py-2 pr-4 text-foreground/80">
                        {task.chapter_title}
                      </td>
                  <td className="py-2 pr-4 text-foreground">{task.label}</td>
                  <td className="py-2 pr-4">
                    <select
                      value={task.assigned_marechal_id ?? ""}
                      onChange={(e) => handleAssign(task, e.target.value)}
                      className="rounded border border-black/[.08] bg-white px-2 py-1 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
                    >
                      <option value="">—</option>
                      {marechaux
                        .filter(
                          (m) =>
                            assignedIds.includes(m.id) ||
                            m.id === task.assigned_marechal_id,
                        )
                        .sort((a, b) =>
                          marechalDisplayName(a).localeCompare(
                            marechalDisplayName(b),
                            "fr",
                          ),
                        )
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {marechalDisplayName(m)}
                          </option>
                        ))}
                    </select>
                  </td>
                  <td className="py-2 pr-4">
                    <select
                      value={task.task_type_id ?? ""}
                      onChange={(e) => handleSetTaskType(task, e.target.value)}
                      className="rounded border border-black/[.08] bg-white px-2 py-1 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
                    >
                      <option value="">—</option>
                      {taskTypes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-4">
                    <input
                      type="checkbox"
                      checked={task.is_ramassage}
                      onChange={() => handleToggleRamassage(task)}
                      className="h-4 w-4 cursor-pointer accent-primary"
                    />
                  </td>
                  <td className="py-2 pr-4">
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={() => handleToggleDone(task)}
                      className="h-4 w-4 cursor-pointer accent-primary"
                    />
                  </td>
                  <td className="py-2 pr-4">
                    <button
                      onClick={() => handleDelete(task)}
                      aria-label="Supprimer"
                      className="rounded-full p-2 text-foreground/60 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleTasks.length === 0 && (
            <p className="py-3 text-sm text-foreground/60">
              Aucune tâche pour l&apos;instant.
            </p>
          )}
          </div>
        )}
      </div>
    </div>
  );
}

function MedicStatusModal({
  activity,
  medics,
  onClose,
}: {
  activity: ActivityRow;
  medics: Medic[];
  onClose: () => void;
}) {
  const [statuses, setStatuses] = useState<
    Record<string, { is_available: boolean; is_assigned: boolean }>
  >({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    listMedicActivityStatuses(activity.id)
      .then((rows) => {
        const map: Record<
          string,
          { is_available: boolean; is_assigned: boolean }
        > = {};
        rows.forEach((r) => {
          map[r.medic_id] = {
            is_available: r.is_available,
            is_assigned: r.is_assigned,
          };
        });
        setStatuses(map);
      })
      .finally(() => setIsLoading(false));
  }, [activity.id]);

  const toggle = async (
    medicId: string,
    field: "is_available" | "is_assigned",
  ) => {
    const current = statuses[medicId] ?? {
      is_available: false,
      is_assigned: false,
    };
    const next = { ...current, [field]: !current[field] };

    if (
      field === "is_assigned" &&
      next.is_assigned &&
      activity.healer_count
    ) {
      const assignedCount = Object.values(statuses).filter(
        (s) => s.is_assigned,
      ).length;
      if (assignedCount >= activity.healer_count) {
        alert(
          `Le nombre de médics assignés (${activity.healer_count}) prévu pour cette campagne est déjà atteint.`,
        );
        return;
      }
    }

    setStatuses((prev) => ({ ...prev, [medicId]: next }));
    try {
      await setMedicActivityStatus(medicId, activity.id, {
        [field]: next[field],
      });
    } catch {
      setStatuses((prev) => ({ ...prev, [medicId]: current }));
      alert("Échec de la mise à jour.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">{activity.name}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full p-1 hover:bg-black/[.04] dark:hover:bg-white/[.08]"
          >
            <X size={20} />
          </button>
        </div>

        {isLoading ? (
          <p className="text-sm text-foreground/60">Chargement…</p>
        ) : medics.length === 0 ? (
          <p className="text-sm text-foreground/60">
            Aucun médic — ajoutes-en depuis l&apos;onglet Médics.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {[...medics]
              .sort((a, b) =>
                marechalDisplayName(a).localeCompare(marechalDisplayName(b), "fr"),
              )
              .map((m) => {
              const status = statuses[m.id] ?? {
                is_available: false,
                is_assigned: false,
              };
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-black/[.08] p-2 dark:border-white/[.145]"
                >
                  <span className="flex items-center gap-1.5 text-sm text-foreground">
                    {m.is_responsable && (
                      <Star
                        size={14}
                        className="text-amber-500"
                        fill="currentColor"
                      />
                    )}
                    {marechalDisplayName(m)}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggle(m.id, "is_available")}
                      className={pillClassName(status.is_available)}
                    >
                      Disponible
                    </button>
                    <button
                      type="button"
                      onClick={() => toggle(m.id, "is_assigned")}
                      className={pillClassName(status.is_assigned)}
                    >
                      Assigné
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function MedicsTab() {
  const [medics, setMedics] = useState<Medic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [counts, setCounts] = useState<
    Record<string, { available: number; assigned: number }>
  >({});
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [statusActivity, setStatusActivity] = useState<ActivityRow | null>(
    null,
  );
  const [filterYear, setFilterYear] = useState("");

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

  const fetchActivities = async () => {
    setIsLoadingActivities(true);
    try {
      const [{ data }, countsResult] = await Promise.all([
        supabase
          .from("activities")
          .select("id, name, date, marshal_count, healer_count, campaign_team_count, weapon_master_count")
          .order("date", { ascending: true }),
        listMedicActivityStatusCounts(),
      ]);
      setActivities(data ?? []);
      setCounts(countsResult);
    } finally {
      setIsLoadingActivities(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchMedics/fetchActivities set loading flags ahead of async fetches
    fetchMedics();
    fetchActivities();
  }, []);

  const handleAdd = async (character: Character) => {
    try {
      await addMedic(character.external_id);
      await fetchMedics();
    } catch {
      alert("Échec de l'ajout.");
    }
  };

  const handleRemove = async (medic: Medic) => {
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
        <AddMarechalSearch
          onAdd={handleAdd}
          excludeIds={medics.map((m) => m.character_id)}
        />

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
                          aria-label={
                            m.is_responsable
                              ? "Retirer comme responsable"
                              : "Désigner comme responsable"
                          }
                          className={`rounded-full p-2 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08] ${
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
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleRemove(m)}
                            aria-label="Supprimer"
                            className="rounded-full p-2 text-foreground/60 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
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

      <div>
        <h3 className="mb-3 font-semibold text-foreground">
          Assignation par activité
        </h3>
        <ActivityFiltersBar
          year={filterYear}
          onYearChange={setFilterYear}
          years={getActivityYears(activities)}
        />
        {isLoadingActivities ? (
          <p className="text-sm text-foreground/60">Chargement…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="border-b border-black/[.08] text-foreground/60 dark:border-white/[.08]">
                  <th className="py-2 pr-4 font-medium">Nom</th>
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Disponibles</th>
                  <th className="py-2 pr-4 font-medium">Assignés</th>
                  <th className="py-2 pr-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activities
                  .filter((a) => !filterYear || a.date.startsWith(filterYear))
                  .map((activity) => (
                    <tr
                      key={activity.id}
                      className="border-b border-black/[.06] odd:bg-black/[.015] dark:border-white/[.06] dark:odd:bg-white/[.03]"
                    >
                      <td className="py-2 pr-4 text-foreground">
                        {activity.name}
                      </td>
                      <td className="py-2 pr-4 text-foreground/80">
                        {formatActivityDate(activity.date)}
                      </td>
                      <td className="py-2 pr-4 text-foreground/80">
                        {counts[activity.id]?.available ?? 0}
                      </td>
                      <td className="py-2 pr-4 text-foreground/80">
                        {counts[activity.id]?.assigned ?? 0} /{" "}
                        {activity.healer_count ?? "—"}
                      </td>
                      <td className="py-2 pr-4">
                        <button
                          onClick={() => setStatusActivity(activity)}
                          className="flex items-center gap-1.5 rounded-full border border-black/[.08] px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
                        >
                          Gérer
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {activities.length === 0 && (
              <p className="py-3 text-sm text-foreground/60">
                Aucune activité pour l&apos;instant.
              </p>
            )}
          </div>
        )}
      </div>

      {statusActivity && (
        <MedicStatusModal
          activity={statusActivity}
          medics={medics}
          onClose={() => {
            setStatusActivity(null);
            fetchActivities();
          }}
        />
      )}
    </div>
  );
}

function WeaponMasterStatusModal({
  activity,
  weaponMasters,
  onClose,
}: {
  activity: ActivityRow;
  weaponMasters: WeaponMaster[];
  onClose: () => void;
}) {
  const [statuses, setStatuses] = useState<
    Record<
      string,
      { is_available: boolean; is_assigned: boolean; front_color: string | null }
    >
  >({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    listWeaponMasterActivityStatuses(activity.id)
      .then((rows) => {
        const map: Record<
          string,
          {
            is_available: boolean;
            is_assigned: boolean;
            front_color: string | null;
          }
        > = {};
        rows.forEach((r) => {
          map[r.weapon_master_id] = {
            is_available: r.is_available,
            is_assigned: r.is_assigned,
            front_color: r.front_color,
          };
        });
        setStatuses(map);
      })
      .finally(() => setIsLoading(false));
  }, [activity.id]);

  const toggle = async (
    weaponMasterId: string,
    field: "is_available" | "is_assigned",
  ) => {
    const current = statuses[weaponMasterId] ?? {
      is_available: false,
      is_assigned: false,
      front_color: null,
    };
    const next = { ...current, [field]: !current[field] };

    if (
      field === "is_assigned" &&
      next.is_assigned &&
      activity.weapon_master_count
    ) {
      const assignedCount = Object.values(statuses).filter(
        (s) => s.is_assigned,
      ).length;
      if (assignedCount >= activity.weapon_master_count) {
        alert(
          `Le nombre de maîtres d'armes assignés (${activity.weapon_master_count}) prévu pour cette campagne est déjà atteint.`,
        );
        return;
      }
    }

    setStatuses((prev) => ({ ...prev, [weaponMasterId]: next }));
    try {
      await setWeaponMasterActivityStatus(weaponMasterId, activity.id, {
        [field]: next[field],
      });
    } catch {
      setStatuses((prev) => ({ ...prev, [weaponMasterId]: current }));
      alert("Échec de la mise à jour.");
    }
  };

  const setFront = async (weaponMasterId: string, frontColor: string) => {
    const current = statuses[weaponMasterId] ?? {
      is_available: false,
      is_assigned: false,
      front_color: null,
    };
    const next = { ...current, front_color: frontColor || null };
    setStatuses((prev) => ({ ...prev, [weaponMasterId]: next }));
    try {
      await setWeaponMasterActivityStatus(weaponMasterId, activity.id, {
        front_color: frontColor || null,
      });
    } catch {
      setStatuses((prev) => ({ ...prev, [weaponMasterId]: current }));
      alert("Échec de la mise à jour.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-xl flex-col gap-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">{activity.name}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full p-1 hover:bg-black/[.04] dark:hover:bg-white/[.08]"
          >
            <X size={20} />
          </button>
        </div>

        {isLoading ? (
          <p className="text-sm text-foreground/60">Chargement…</p>
        ) : weaponMasters.length === 0 ? (
          <p className="text-sm text-foreground/60">
            Aucun maître d&apos;armes — ajoutes-en depuis l&apos;onglet
            Maîtres d&apos;armes.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {[...weaponMasters]
              .sort((a, b) =>
                marechalDisplayName(a).localeCompare(
                  marechalDisplayName(b),
                  "fr",
                ),
              )
              .map((wm) => {
                const status = statuses[wm.id] ?? {
                  is_available: false,
                  is_assigned: false,
                  front_color: null,
                };
                return (
                  <div
                    key={wm.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-black/[.08] p-2 dark:border-white/[.145]"
                  >
                    <span className="flex items-center gap-1.5 text-sm text-foreground">
                      {status.front_color && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${FRONT_COLOR_STYLES[status.front_color as FrontColor]}`}
                        >
                          {status.front_color}
                        </span>
                      )}
                      {marechalDisplayName(wm)}
                    </span>
                    <div className="flex items-center gap-2">
                      <select
                        value={status.front_color ?? ""}
                        onChange={(e) => setFront(wm.id, e.target.value)}
                        className="rounded border border-black/[.08] bg-white px-2 py-1 text-xs text-foreground dark:border-white/[.145] dark:bg-zinc-800"
                      >
                        <option value="">Front —</option>
                        {FRONT_COLORS.map((color) => (
                          <option key={color} value={color}>
                            {color}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => toggle(wm.id, "is_available")}
                        className={pillClassName(status.is_available)}
                      >
                        Disponible
                      </button>
                      <button
                        type="button"
                        onClick={() => toggle(wm.id, "is_assigned")}
                        className={pillClassName(status.is_assigned)}
                      >
                        Assigné
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

function WeaponMastersTab() {
  const [weaponMasters, setWeaponMasters] = useState<WeaponMaster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [counts, setCounts] = useState<
    Record<string, { available: number; assigned: number }>
  >({});
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [statusActivity, setStatusActivity] = useState<ActivityRow | null>(
    null,
  );
  const [filterYear, setFilterYear] = useState("");

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

  const fetchActivities = async () => {
    setIsLoadingActivities(true);
    try {
      const [{ data }, countsResult] = await Promise.all([
        supabase
          .from("activities")
          .select(
            "id, name, date, marshal_count, healer_count, campaign_team_count, weapon_master_count",
          )
          .order("date", { ascending: true }),
        listWeaponMasterActivityStatusCounts(),
      ]);
      setActivities(data ?? []);
      setCounts(countsResult);
    } finally {
      setIsLoadingActivities(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchWeaponMasters/fetchActivities set loading flags ahead of async fetches
    fetchWeaponMasters();
    fetchActivities();
  }, []);

  const handleAdd = async (character: Character) => {
    try {
      await addWeaponMaster(character.external_id);
      await fetchWeaponMasters();
    } catch {
      alert("Échec de l'ajout.");
    }
  };

  const handleRemove = async (weaponMaster: WeaponMaster) => {
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
        <AddMarechalSearch
          onAdd={handleAdd}
          excludeIds={weaponMasters.map((w) => w.character_id)}
        />

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
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleRemove(w)}
                            aria-label="Supprimer"
                            className="rounded-full p-2 text-foreground/60 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
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

      <div>
        <h3 className="mb-3 font-semibold text-foreground">
          Assignation par activité
        </h3>
        <ActivityFiltersBar
          year={filterYear}
          onYearChange={setFilterYear}
          years={getActivityYears(activities)}
        />
        {isLoadingActivities ? (
          <p className="text-sm text-foreground/60">Chargement…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="border-b border-black/[.08] text-foreground/60 dark:border-white/[.08]">
                  <th className="py-2 pr-4 font-medium">Nom</th>
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Disponibles</th>
                  <th className="py-2 pr-4 font-medium">Assignés</th>
                  <th className="py-2 pr-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activities
                  .filter((a) => !filterYear || a.date.startsWith(filterYear))
                  .map((activity) => (
                    <tr
                      key={activity.id}
                      className="border-b border-black/[.06] odd:bg-black/[.015] dark:border-white/[.06] dark:odd:bg-white/[.03]"
                    >
                      <td className="py-2 pr-4 text-foreground">
                        {activity.name}
                      </td>
                      <td className="py-2 pr-4 text-foreground/80">
                        {formatActivityDate(activity.date)}
                      </td>
                      <td className="py-2 pr-4 text-foreground/80">
                        {counts[activity.id]?.available ?? 0}
                      </td>
                      <td className="py-2 pr-4 text-foreground/80">
                        {counts[activity.id]?.assigned ?? 0} /{" "}
                        {activity.weapon_master_count ?? "—"}
                      </td>
                      <td className="py-2 pr-4">
                        <button
                          onClick={() => setStatusActivity(activity)}
                          className="flex items-center gap-1.5 rounded-full border border-black/[.08] px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
                        >
                          Gérer
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {activities.length === 0 && (
              <p className="py-3 text-sm text-foreground/60">
                Aucune activité pour l&apos;instant.
              </p>
            )}
          </div>
        )}
      </div>

      {statusActivity && (
        <WeaponMasterStatusModal
          activity={statusActivity}
          weaponMasters={weaponMasters}
          onClose={() => {
            setStatusActivity(null);
            fetchActivities();
          }}
        />
      )}
    </div>
  );
}

function MarechauxContent() {
  const [tab, setTab] = useState<Tab>("marechaux");
  const [marechaux, setMarechaux] = useState<Marechal[]>([]);

  useEffect(() => {
    if (tab === "campagnes") {
      listMarechaux().then(setMarechaux);
    }
  }, [tab]);

  return (
    <div>
      <h1 className={`${glofters.className} text-3xl text-foreground`}>
        Maréchaux
      </h1>
      <Breadcrumb />

      <div className="mt-6 flex gap-2 border-b border-black/[.08] dark:border-white/[.08]">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <div key={t.key} className="flex items-center gap-2">
              {t.separatorBefore && (
                <div className="mb-2 h-6 w-px self-center bg-black/[.08] dark:bg-white/[.08]" />
              )}
              <button
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
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
        {tab === "marechaux" && <MarechauxTab />}
        {tab === "campagnes" && <CampagnesTab marechaux={marechaux} />}
        {tab === "medics" && <MedicsTab />}
        {tab === "weapon-masters" && <WeaponMastersTab />}
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
