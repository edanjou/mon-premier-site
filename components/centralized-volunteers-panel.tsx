"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { listAllDepartmentSlots, type DepartmentSlot } from "@/lib/department-slots";
import { getModuleAccessLevels } from "@/lib/features";
import { ALL_COORDINATIONS } from "@/lib/hub-items";
import { getOwnProfile } from "@/lib/profile";
import {
  computeDiscountLabel,
  computeGiftEligible,
  computeMealsCount,
  computeParkingAccess,
  computeShowersCount,
  getVolunteerBenefitSettings,
  type VolunteerBenefitSettings,
} from "@/lib/volunteer-benefit-settings";
import {
  EARLY_ARRIVALS,
  listVolunteerReviewStatuses,
  upsertVolunteerReviewStatus,
  VOLUNTEER_STATUSES,
  type EarlyArrival,
  type VolunteerReviewStatusInput,
  type VolunteerStatus,
} from "@/lib/volunteer-review-status";
import { listAssignmentsForVolunteers } from "@/lib/volunteer-slot-assignments";
import {
  listVolunteers,
  setDiscountScheduledForCharacter,
} from "@/lib/volunteers";

const MODULE_KEY = "volontaires-centralise";

const inputClassName =
  "rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-foreground hover:border-black/[.08] focus:border-black/[.15] focus:bg-white focus:outline-none dark:hover:border-white/[.145] dark:focus:border-white/[.25] dark:focus:bg-zinc-800";

type AggregatedVolunteer = {
  characterId: number;
  name: string;
  playerName: string | null;
  playerEmail: string | null;
  hoursByCoordination: Record<string, number>;
  totalHours: number;
  absentHours: number;
  workDates: Set<string>;
  status: VolunteerStatus | null;
  notes: string | null;
  earlyArrival: EarlyArrival | null;
};

// Works Sunday -> can arrive Saturday; works Saturday (and not Sunday) ->
// can arrive Friday. Pure suggestion — always overridable per volunteer.
function computeSuggestedEarlyArrival(
  workDates: Set<string>,
): EarlyArrival | null {
  const days = new Set(
    Array.from(workDates).map((d) => new Date(`${d}T00:00:00`).getDay()),
  );
  if (days.has(0)) return "Samedi";
  if (days.has(6)) return "Vendredi";
  return null;
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { firstName: fullName.trim(), lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

const STATUS_STYLES: Record<VolunteerStatus, string> = {
  Fait: "bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-400",
  Erratum: "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400",
  "À modifier":
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-400",
};

const STATUS_UNSET_STYLE = "bg-transparent text-foreground";

const statusBaseClassName =
  "rounded border border-transparent px-1 py-0.5 text-xs hover:border-black/[.08] focus:border-black/[.15] focus:outline-none dark:hover:border-white/[.145] dark:focus:border-white/[.25]";

function statusSelectClassName(status: VolunteerStatus | null): string {
  const style = status ? STATUS_STYLES[status] : STATUS_UNSET_STYLE;
  return `${statusBaseClassName} ${style}`;
}

function reviewInputFrom(v: AggregatedVolunteer): VolunteerReviewStatusInput {
  return {
    status: v.status,
    notes: v.notes,
    early_arrival: v.earlyArrival,
  };
}

function BooleanDot({
  value,
  onToggle,
}: {
  value: boolean;
  onToggle?: () => void;
}) {
  const className = `inline-block h-2.5 w-2.5 rounded-full ${value ? "bg-green-500" : "bg-red-500"}`;
  if (!onToggle) {
    return (
      <span
        role="img"
        aria-label={value ? "Oui" : "Non"}
        title={value ? "Oui" : "Non"}
        className={className}
      />
    );
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={value ? "Oui" : "Non"}
      title={value ? "Oui" : "Non"}
      className="dot-button p-1"
    >
      <span className={className} />
    </button>
  );
}

type SortField = "lastName" | "firstName";

function SortHeader({
  label,
  field,
  sortField,
  sortDir,
  onSort,
}: {
  label: string;
  field: SortField;
  sortField: SortField;
  sortDir: "asc" | "desc";
  onSort: (field: SortField) => void;
}) {
  const active = sortField === field;
  return (
    <th className="px-2 py-2 align-bottom font-medium">
      <button
        type="button"
        onClick={() => onSort(field)}
        className="flex items-center gap-1 whitespace-nowrap hover:text-foreground"
      >
        {label}
        {active ? (
          sortDir === "asc" ? (
            <ArrowUp size={12} />
          ) : (
            <ArrowDown size={12} />
          )
        ) : (
          <ArrowUpDown size={12} className="text-foreground/30" />
        )}
      </button>
    </th>
  );
}

function VerticalTh({ label }: { label: string }) {
  return (
    <th className="px-1 py-2 text-center align-bottom font-medium">
      <span className="inline-block [writing-mode:vertical-rl] rotate-180 whitespace-nowrap">
        {label}
      </span>
    </th>
  );
}

export default function CentralizedVolunteersPanel({ year }: { year: number }) {
  const [volunteers, setVolunteers] = useState<AggregatedVolunteer[]>([]);
  const [settings, setSettings] = useState<VolunteerBenefitSettings | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [canWrite, setCanWrite] = useState(false);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("lastName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [expandedEmails, setExpandedEmails] = useState<Set<number>>(
    new Set(),
  );

  const toggleEmailExpanded = (characterId: number) => {
    setExpandedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(characterId)) next.delete(characterId);
      else next.add(characterId);
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      setIsLoading(true);
      const byCharacter = new Map<number, AggregatedVolunteer>();

      const [, reviewStatuses, benefitSettings] = await Promise.all([
        Promise.all(
          ALL_COORDINATIONS.map(async ({ key }) => {
            const vols = await listVolunteers(key, year);
            if (vols.length === 0) return;
            const volunteerIds = vols.map((v) => v.id);
            const [slots, assignments] = await Promise.all([
              listAllDepartmentSlots(key, year),
              listAssignmentsForVolunteers(volunteerIds),
            ]);

            for (const v of vols) {
              const volunteerAssignments = assignments.filter(
                (a) => a.volunteer_id === v.id,
              );
              // Unconfirmed hours don't count toward the total (or anything
              // derived from it — discount, meals, showers, gift, parking)
              // until a coordinator confirms them.
              const hours = v.hours_confirmed
                ? volunteerAssignments.reduce((sum, a) => {
                    const slot = slots.find(
                      (s: DepartmentSlot) => s.id === a.slot_id,
                    );
                    return sum + (slot?.hours ?? 0);
                  }, 0)
                : 0;
              const dates = volunteerAssignments
                .map(
                  (a) =>
                    slots.find((s: DepartmentSlot) => s.id === a.slot_id)
                      ?.date ?? null,
                )
                .filter((d): d is string => d !== null);
              // Tracked regardless of confirmation — an absence matters
              // even before hours are confirmed.
              const absentHours = volunteerAssignments
                .filter((a) => a.absent)
                .reduce((sum, a) => {
                  const slot = slots.find(
                    (s: DepartmentSlot) => s.id === a.slot_id,
                  );
                  return sum + (slot?.hours ?? 0);
                }, 0);

              const existing = byCharacter.get(v.character_id);
              if (existing) {
                if (hours > 0) {
                  existing.hoursByCoordination[key] =
                    (existing.hoursByCoordination[key] ?? 0) + hours;
                  existing.totalHours += hours;
                }
                existing.absentHours += absentHours;
                for (const d of dates) existing.workDates.add(d);
              } else {
                byCharacter.set(v.character_id, {
                  characterId: v.character_id,
                  name: v.name,
                  playerName: v.player_name,
                  playerEmail: v.player_email,
                  hoursByCoordination: hours > 0 ? { [key]: hours } : {},
                  totalHours: hours,
                  absentHours,
                  workDates: new Set(dates),
                  status: null,
                  notes: null,
                  earlyArrival: null,
                });
              }
            }
          }),
        ),
        listVolunteerReviewStatuses(),
        getVolunteerBenefitSettings(),
      ]);

      for (const rs of reviewStatuses) {
        const v = byCharacter.get(rs.character_id);
        if (v) {
          v.status = rs.status;
          v.notes = rs.notes;
          v.earlyArrival = rs.early_arrival;
        }
      }

      if (cancelled) return;
      setVolunteers(Array.from(byCharacter.values()));
      setSettings(benefitSettings);
      setIsLoading(false);
    }

    getOwnProfile().then((profile) => {
      if (!profile) return;
      getModuleAccessLevels(profile).then((levels) => {
        setCanWrite(levels[MODULE_KEY] === "ecriture");
      });
    });
    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [year]);

  const handleFieldChange = <K extends keyof AggregatedVolunteer>(
    characterId: number,
    field: K,
    value: AggregatedVolunteer[K],
  ) => {
    setVolunteers((prev) =>
      prev.map((v) =>
        v.characterId === characterId ? { ...v, [field]: value } : v,
      ),
    );
  };

  const handleFieldBlur = (characterId: number) => {
    if (!canWrite) return;
    const volunteer = volunteers.find((v) => v.characterId === characterId);
    if (!volunteer) return;
    upsertVolunteerReviewStatus(characterId, reviewInputFrom(volunteer)).catch(
      () => alert("Échec de la mise à jour."),
    );
  };

  const handleImmediateChange = <K extends keyof AggregatedVolunteer>(
    characterId: number,
    field: K,
    value: AggregatedVolunteer[K],
  ) => {
    const current = volunteers.find((v) => v.characterId === characterId);
    if (!current) return;
    const updated = { ...current, [field]: value };
    setVolunteers((prev) =>
      prev.map((v) => (v.characterId === characterId ? updated : v)),
    );
    if (!canWrite) return;
    upsertVolunteerReviewStatus(characterId, reviewInputFrom(updated)).catch(
      () => alert("Échec de la mise à jour."),
    );
  };

  // Rabais programmé (par coordination) est relié au Statut ici : Fait
  // l'active partout où la personne est volontaire, tout autre statut le
  // désactive.
  const handleStatusChange = (
    characterId: number,
    status: VolunteerStatus | null,
  ) => {
    handleImmediateChange(characterId, "status", status);
    if (!canWrite) return;
    setDiscountScheduledForCharacter(characterId, status === "Fait").catch(
      () => alert("Échec de la mise à jour du rabais programmé."),
    );
  };

  // Si le statut était Fait, tout changement d'arrivée hâtive le repasse à
  // À modifier — le dossier a bougé, il faut le revalider.
  const handleEarlyArrivalChange = (
    characterId: number,
    earlyArrival: EarlyArrival | null,
  ) => {
    const current = volunteers.find((v) => v.characterId === characterId);
    if (!current) return;
    const nextStatus =
      current.status === "Fait" ? "À modifier" : current.status;
    const updated = { ...current, earlyArrival, status: nextStatus };
    setVolunteers((prev) =>
      prev.map((v) => (v.characterId === characterId ? updated : v)),
    );
    if (!canWrite) return;
    upsertVolunteerReviewStatus(characterId, reviewInputFrom(updated)).catch(
      () => alert("Échec de la mise à jour."),
    );
    if (nextStatus !== current.status) {
      setDiscountScheduledForCharacter(characterId, false).catch(() =>
        alert("Échec de la mise à jour du rabais programmé."),
      );
    }
  };

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filtered = volunteers
    .filter((v) => v.totalHours > 0 || v.absentHours > 0)
    .filter((v) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        v.name.toLowerCase().includes(q) ||
        (v.playerName ?? "").toLowerCase().includes(q) ||
        (v.playerEmail ?? "").toLowerCase().includes(q)
      );
    });

  const sorted = [...filtered].sort((a, b) => {
    const na = splitName(a.playerName ?? a.name);
    const nb = splitName(b.playerName ?? b.name);
    const va = sortField === "lastName" ? na.lastName : na.firstName;
    const vb = sortField === "lastName" ? nb.lastName : nb.firstName;
    const cmp = va.localeCompare(vb);
    return sortDir === "asc" ? cmp : -cmp;
  });

  if (isLoading || !settings) {
    return <p className="text-sm text-foreground/60">Chargement…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Search size={16} className="text-foreground/40" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un volontaire, un joueur ou un courriel…"
          className="flex-1 rounded-full border border-black/[.08] bg-white px-4 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
        />
      </div>

      <p className="text-xs text-foreground/40">
        {sorted.length} volontaire{sorted.length > 1 ? "s" : ""} — heures
        agrégées en lecture seule depuis chaque coordination ; rabais, repas,
        douches, cadeau et stationnement calculés selon les règles définies
        dans Paramètres ; statut, notes et arrivée hâtive propres à cette
        vue.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-black/[.08] dark:border-white/[.145]">
              <SortHeader
                label="Nom"
                field="lastName"
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <SortHeader
                label="Prénom"
                field="firstName"
                sortField={sortField}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <th className="px-2 py-2 align-bottom font-medium whitespace-nowrap">
                Courriel
              </th>
              {ALL_COORDINATIONS.map((c) => (
                <VerticalTh key={c.key} label={c.label} />
              ))}
              <VerticalTh label="Total" />
              <VerticalTh label="Absences" />
              <VerticalTh label="Rabais" />
              <VerticalTh label="Repas" />
              <VerticalTh label="Douches" />
              <VerticalTh label="Cadeau" />
              <VerticalTh label="Stationnement" />
              <VerticalTh label="Arrivée hâtive" />
              <th className="px-2 py-2 align-bottom font-medium">Statut</th>
              <th className="px-2 py-2 align-bottom font-medium">Notes</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((v) => {
              const { firstName, lastName } = splitName(
                v.playerName ?? v.name,
              );
              return (
                <tr
                  key={v.characterId}
                  className="border-b border-black/[.04] dark:border-white/[.06]"
                >
                  <td className="px-2 py-2 font-medium whitespace-nowrap text-foreground">
                    {lastName || "—"}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-foreground">
                    {firstName || "—"}
                  </td>
                  <td className="px-2 py-2 text-foreground/60">
                    {v.playerEmail ? (
                      <button
                        type="button"
                        onClick={() => toggleEmailExpanded(v.characterId)}
                        title={v.playerEmail}
                        className={
                          expandedEmails.has(v.characterId)
                            ? "text-left hover:underline"
                            : "block max-w-[9rem] truncate text-left hover:underline"
                        }
                      >
                        {v.playerEmail}
                      </button>
                    ) : (
                      "—"
                    )}
                  </td>
                  {ALL_COORDINATIONS.map((c) => (
                    <td
                      key={c.key}
                      className="px-2 py-2 text-right text-foreground/70"
                    >
                      {v.hoursByCoordination[c.key]
                        ? `${v.hoursByCoordination[c.key]}h`
                        : ""}
                    </td>
                  ))}
                  <td className="px-2 py-2 text-right font-medium text-foreground">
                    {v.totalHours}h
                  </td>
                  <td
                    className={`px-2 py-2 text-center ${v.absentHours > 0 ? "font-medium text-red-600 dark:text-red-400" : "text-foreground/70"}`}
                  >
                    {v.absentHours > 0 ? `${v.absentHours}h` : ""}
                  </td>
                  <td className="px-2 py-2 text-right font-medium text-primary">
                    {computeDiscountLabel(v.totalHours, settings)}
                  </td>
                  <td className="px-2 py-2 text-right text-foreground/70">
                    {computeMealsCount(v.totalHours, settings)}
                  </td>
                  <td className="px-2 py-2 text-right text-foreground/70">
                    {computeShowersCount(v.totalHours, settings)}
                  </td>
                  <td className="px-2 py-2">
                    <BooleanDot
                      value={computeGiftEligible(v.totalHours, settings)}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <BooleanDot
                      value={computeParkingAccess(v.totalHours, settings)}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={
                        v.earlyArrival ??
                        computeSuggestedEarlyArrival(v.workDates) ??
                        ""
                      }
                      disabled={!canWrite}
                      onChange={(e) =>
                        handleEarlyArrivalChange(
                          v.characterId,
                          (e.target.value || null) as EarlyArrival | null,
                        )
                      }
                      className={inputClassName}
                    >
                      <option value="">—</option>
                      {EARLY_ARRIVALS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={v.status ?? ""}
                      disabled={!canWrite}
                      onChange={(e) =>
                        handleStatusChange(
                          v.characterId,
                          (e.target.value || null) as VolunteerStatus | null,
                        )
                      }
                      className={statusSelectClassName(v.status)}
                    >
                      <option value="">—</option>
                      {VOLUNTEER_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={v.notes ?? ""}
                      disabled={!canWrite}
                      onChange={(e) =>
                        handleFieldChange(
                          v.characterId,
                          "notes",
                          e.target.value,
                        )
                      }
                      onBlur={() => handleFieldBlur(v.characterId)}
                      className={`${inputClassName} w-32`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <p className="mt-4 text-sm text-foreground/60">
            Aucun volontaire trouvé.
          </p>
        )}
      </div>
    </div>
  );
}
