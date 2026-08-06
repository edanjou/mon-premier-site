"use client";

import {
  Axe,
  BadgeCheck,
  ChevronLeft,
  Plus,
  Search,
  Shield,
  Star,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { glofters } from "@/app/fonts/glofters";
import { searchCharacters, type Character } from "@/lib/characters";
import {
  createDepartmentSlot,
  deleteDepartmentSlot,
  listAllDepartmentSlots,
  updateDepartmentSlot,
  VOLUNTEER_DEPARTMENTS,
  type DepartmentSlot,
  type VolunteerDepartment,
} from "@/lib/department-slots";
import { getModuleAccessLevels } from "@/lib/features";
import { marechalDisplayName, toTitleCase } from "@/lib/marechaux";
import {
  addVolunteerToDepartment,
  listVolunteerDepartments,
  removeVolunteerFromDepartment,
  setVolunteerTeamLead,
  type VolunteerDepartmentLink,
} from "@/lib/volunteer-departments";
import {
  assignVolunteerToSlot,
  listAssignmentsForVolunteers,
  unassignVolunteerFromSlot,
  type VolunteerSlotAssignment,
} from "@/lib/volunteer-slot-assignments";
import {
  getOrCreateVolunteer,
  listVolunteers,
  setVolunteerStatus,
  type Volunteer,
} from "@/lib/volunteers";
import { getOwnProfile } from "@/lib/profile";

const cellFieldClassName =
  "min-w-0 rounded border border-black/[.08] bg-white px-2 py-1 text-sm text-foreground disabled:opacity-60 dark:border-white/[.145] dark:bg-zinc-800";

const DEPARTMENT_ICONS: Record<VolunteerDepartment, typeof Axe> = {
  Escarmouches: Axe,
  Homologation: BadgeCheck,
  "Grandes Batailles": Shield,
};

function slotHours(slots: DepartmentSlot[], slotId: string): number {
  return slots.find((s) => s.id === slotId)?.hours ?? 0;
}

function departmentTotal(
  slots: DepartmentSlot[],
  assignments: VolunteerSlotAssignment[],
  department: VolunteerDepartment,
): number {
  const slotIds = new Set(
    slots.filter((s) => s.department === department).map((s) => s.id),
  );
  return assignments
    .filter((a) => slotIds.has(a.slot_id))
    .reduce((sum, a) => sum + slotHours(slots, a.slot_id), 0);
}

function volunteerTotal(
  slots: DepartmentSlot[],
  assignments: VolunteerSlotAssignment[],
  department: VolunteerDepartment,
  volunteerId: string,
): number {
  const slotIds = new Set(
    slots.filter((s) => s.department === department).map((s) => s.id),
  );
  return assignments
    .filter((a) => a.volunteer_id === volunteerId && slotIds.has(a.slot_id))
    .reduce((sum, a) => sum + slotHours(slots, a.slot_id), 0);
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
      className={`picker-button cursor-pointer ${className}`}
    />
  );
}

function SlotManager({
  coordinationKey,
  department,
  slots,
  onChange,
}: {
  coordinationKey: string;
  department: VolunteerDepartment;
  slots: DepartmentSlot[];
  onChange: () => Promise<void>;
}) {
  const [newLabel, setNewLabel] = useState("");
  const [newHours, setNewHours] = useState("");
  const [error, setError] = useState<string | null>(null);

  const departmentSlots = slots.filter((s) => s.department === department);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const hours = parseFloat(newHours) || 0;
    if (!newLabel.trim() || hours <= 0) return;
    setError(null);
    try {
      await createDepartmentSlot({
        coordination_key: coordinationKey,
        department,
        label: newLabel.trim(),
        hours,
        position: departmentSlots.length,
      });
      setNewLabel("");
      setNewHours("");
      await onChange();
    } catch {
      setError("Échec de la création.");
    }
  };

  const handleUpdate = async (
    slot: DepartmentSlot,
    patch: { label?: string; hours?: number },
  ) => {
    try {
      await updateDepartmentSlot(slot.id, {
        label: patch.label ?? slot.label,
        hours: patch.hours ?? slot.hours,
      });
      await onChange();
    } catch {
      setError("Échec de la modification.");
    }
  };

  const handleDelete = async (slot: DepartmentSlot) => {
    if (!window.confirm(`Supprimer le bloc "${slot.label}" ?`)) return;
    try {
      await deleteDepartmentSlot(slot.id);
      await onChange();
    } catch {
      setError("Échec de la suppression.");
    }
  };

  return (
    <div className="rounded-lg border border-black/[.08] p-3 dark:border-white/[.145]">
      <h3 className="mb-2 text-sm font-semibold text-foreground">
        Blocs — {department}
      </h3>
      <div className="flex flex-col gap-2">
        {departmentSlots.map((slot) => (
          <div key={slot.id} className="flex items-center gap-2">
            <input
              type="text"
              defaultValue={slot.label}
              onBlur={(e) => handleUpdate(slot, { label: e.target.value })}
              className={`${cellFieldClassName} flex-1`}
            />
            <input
              type="number"
              min={0}
              step={0.25}
              defaultValue={slot.hours}
              onBlur={(e) =>
                handleUpdate(slot, { hours: parseFloat(e.target.value) || 0 })
              }
              className={`${cellFieldClassName} w-24`}
            />
            <button
              type="button"
              onClick={() => handleDelete(slot)}
              aria-label="Supprimer"
              className="rounded-full p-1.5 text-foreground/50 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {departmentSlots.length === 0 && (
          <p className="text-xs text-foreground/40">
            Aucun bloc pour l&apos;instant.
          </p>
        )}
      </div>
      <form onSubmit={handleCreate} className="mt-2 flex items-center gap-2">
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Ex. Lundi de 9h à 13h"
          className={`${cellFieldClassName} flex-1`}
        />
        <input
          type="number"
          min={0}
          step={0.25}
          value={newHours}
          onChange={(e) => setNewHours(e.target.value)}
          placeholder="Heures"
          className={`${cellFieldClassName} w-24`}
        />
        <button
          type="submit"
          className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#0c4390]"
        >
          <Plus size={14} />
          Ajouter
        </button>
      </form>
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
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
      <Search
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40"
      />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher un personnage à ajouter comme volontaire…"
        className="w-full rounded-full border border-black/[.08] bg-white py-2 pl-9 pr-3 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
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

export default function VolunteersPanel({
  coordinationKey,
  moduleKey,
}: {
  coordinationKey: string;
  moduleKey: string;
}) {
  const [view, setView] = useState<"dashboard" | VolunteerDepartment>(
    "dashboard",
  );
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [departmentLinks, setDepartmentLinks] = useState<
    VolunteerDepartmentLink[]
  >([]);
  const [slots, setSlots] = useState<DepartmentSlot[]>([]);
  const [assignments, setAssignments] = useState<VolunteerSlotAssignment[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canWrite, setCanWrite] = useState(true);
  const [departmentTab, setDepartmentTab] = useState<"blocs" | "volontaires">(
    "volontaires",
  );

  useEffect(() => {
    getOwnProfile().then((profile) => {
      if (!profile) return;
      getModuleAccessLevels(profile).then((levels) => {
        setCanWrite(levels[moduleKey] === "ecriture");
      });
    });
  }, [moduleKey]);

  const fetchAll = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const volunteerList = await listVolunteers(coordinationKey);
      const volunteerIds = volunteerList.map((v) => v.id);
      const [slotList, assignmentList, linkList] = await Promise.all([
        listAllDepartmentSlots(coordinationKey),
        listAssignmentsForVolunteers(volunteerIds),
        listVolunteerDepartments(volunteerIds),
      ]);
      setVolunteers(volunteerList);
      setSlots(slotList);
      setAssignments(assignmentList);
      setDepartmentLinks(linkList);
    } catch {
      setError("Impossible de charger les volontaires.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchAll sets a loading flag ahead of an async fetch
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchAll is stable for a given coordinationKey
  }, [coordinationKey]);

  const handleAddVolunteer = async (
    character: Character,
    department: VolunteerDepartment,
  ) => {
    if (!canWrite) return;
    try {
      const volunteer = await getOrCreateVolunteer(
        coordinationKey,
        character.external_id,
      );
      await addVolunteerToDepartment(volunteer.id, department);
      await fetchAll();
    } catch {
      alert("Échec de l'ajout.");
    }
  };

  const handleRemoveFromDepartment = async (
    volunteer: Volunteer,
    department: VolunteerDepartment,
  ) => {
    if (!canWrite) return;
    if (
      !window.confirm(
        `Retirer ${marechalDisplayName(volunteer)} de ${department} ?`,
      )
    )
      return;
    try {
      await removeVolunteerFromDepartment(volunteer.id, department);
      await fetchAll();
    } catch {
      alert("Échec de la suppression.");
    }
  };

  const handleToggleStatus = async (
    volunteer: Volunteer,
    field: "hours_confirmed" | "discount_scheduled",
  ) => {
    if (!canWrite) return;
    const value = !volunteer[field];
    setVolunteers((prev) =>
      prev.map((v) => (v.id === volunteer.id ? { ...v, [field]: value } : v)),
    );
    try {
      await setVolunteerStatus(volunteer.id, field, value);
    } catch {
      alert("Échec de la mise à jour.");
      await fetchAll();
    }
  };

  const handleToggleTeamLead = async (
    volunteerId: string,
    department: VolunteerDepartment,
  ) => {
    if (!canWrite) return;
    const current = departmentLinks.find(
      (l) => l.volunteer_id === volunteerId && l.department === department,
    );
    const value = !current?.team_lead;
    setDepartmentLinks((prev) =>
      prev.map((l) =>
        l.volunteer_id === volunteerId && l.department === department
          ? { ...l, team_lead: value }
          : l,
      ),
    );
    try {
      await setVolunteerTeamLead(volunteerId, department, value);
    } catch {
      alert("Échec de la mise à jour.");
      await fetchAll();
    }
  };

  const handleToggleAssignment = async (
    volunteerId: string,
    slotId: string,
    checked: boolean,
  ) => {
    if (!canWrite) return;
    setAssignments((prev) =>
      checked
        ? [...prev, { volunteer_id: volunteerId, slot_id: slotId }]
        : prev.filter(
            (a) => !(a.volunteer_id === volunteerId && a.slot_id === slotId),
          ),
    );
    try {
      if (checked) {
        await assignVolunteerToSlot(volunteerId, slotId);
      } else {
        await unassignVolunteerFromSlot(volunteerId, slotId);
      }
    } catch {
      alert("Échec de la mise à jour.");
      await fetchAll();
    }
  };

  if (isLoading) {
    return <p className="text-sm text-foreground/60">Chargement…</p>;
  }
  if (error) {
    return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  }

  const isInDepartment = (volunteerId: string, department: VolunteerDepartment) =>
    departmentLinks.some(
      (l) => l.volunteer_id === volunteerId && l.department === department,
    );

  const isTeamLead = (volunteerId: string, department: VolunteerDepartment) =>
    departmentLinks.some(
      (l) =>
        l.volunteer_id === volunteerId &&
        l.department === department &&
        l.team_lead,
    );

  if (view === "dashboard") {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {VOLUNTEER_DEPARTMENTS.map((department) => {
            const Icon = DEPARTMENT_ICONS[department];
            return (
              <div
                key={department}
                onClick={() => {
                  setView(department);
                  setDepartmentTab("volontaires");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setView(department);
                    setDepartmentTab("volontaires");
                  }
                }}
                role="button"
                tabIndex={0}
                className="group flex cursor-pointer items-center gap-3 rounded-2xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border dark:border-white/60 dark:bg-zinc-900"
              >
                <span className="icon-badge-hover flex h-[55px] w-[55px] flex-shrink-0 items-center justify-center rounded-full bg-primary text-white">
                  <Icon size={25} className="group-hover:animate-wiggle" />
                </span>
                <h2
                  className={`${glofters.className} translate-y-[4px] text-[28px] leading-none text-foreground`}
                >
                  {department}
                </h2>
              </div>
            );
          })}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] table-fixed text-left text-sm">
            <colgroup>
              <col />
              {VOLUNTEER_DEPARTMENTS.map((d) => (
                <col key={d} className="w-32" />
              ))}
              <col className="w-20" />
              <col className="w-24" />
              <col className="w-24" />
            </colgroup>
            <thead>
              <tr className="border-b border-black/[.08] text-foreground/60 dark:border-white/[.08]">
                <th className="py-2 pr-4 font-medium">Nom</th>
                {VOLUNTEER_DEPARTMENTS.map((d) => (
                  <th key={d} className="py-2 pr-4 font-medium">
                    {d}
                  </th>
                ))}
                <th className="py-2 pr-4 font-medium">Total</th>
                <th className="py-2 pr-4 text-center font-medium">
                  Heures confirmées
                </th>
                <th className="py-2 pr-4 text-center font-medium">
                  Rabais programmé
                </th>
              </tr>
            </thead>
            <tbody>
              {volunteers.map((v) => {
                const total = VOLUNTEER_DEPARTMENTS.reduce(
                  (sum, d) => sum + volunteerTotal(slots, assignments, d, v.id),
                  0,
                );
                return (
                  <tr
                    key={v.id}
                    className="border-b border-black/[.06] odd:bg-black/[.015] dark:border-white/[.06] dark:odd:bg-white/[.03]"
                  >
                    <td className="py-2 pr-4 text-foreground">
                      {marechalDisplayName(v)}
                      {v.player_email && (
                        <span className="block text-xs text-foreground/50">
                          {v.player_email}
                        </span>
                      )}
                    </td>
                    {VOLUNTEER_DEPARTMENTS.map((d) => (
                      <td key={d} className="py-2 pr-4 text-foreground/80">
                        {isInDepartment(v.id, d)
                          ? `${volunteerTotal(slots, assignments, d, v.id)} h`
                          : "—"}
                      </td>
                    ))}
                    <td className="py-2 pr-4 font-medium text-foreground">
                      {total} h
                    </td>
                    <td className="py-2 pr-4 text-center">
                      <BooleanDot
                        value={v.hours_confirmed}
                        onToggle={
                          canWrite
                            ? () => handleToggleStatus(v, "hours_confirmed")
                            : undefined
                        }
                      />
                    </td>
                    <td className="py-2 pr-4 text-center">
                      <BooleanDot
                        value={v.discount_scheduled}
                        onToggle={
                          canWrite
                            ? () =>
                                handleToggleStatus(v, "discount_scheduled")
                            : undefined
                        }
                      />
                    </td>
                  </tr>
                );
              })}
              {volunteers.length === 0 && (
                <tr>
                  <td
                    colSpan={VOLUNTEER_DEPARTMENTS.length + 4}
                    className="py-3 text-center text-sm text-foreground/60"
                  >
                    Aucun volontaire pour l&apos;instant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const department = view;
  const departmentSlots = slots.filter((s) => s.department === department);
  const departmentVolunteers = volunteers.filter((v) =>
    isInDepartment(v.id, department),
  );
  const DepartmentIcon = DEPARTMENT_ICONS[department];

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setView("dashboard")}
        className="flex w-fit items-center gap-1 text-sm font-medium text-foreground/60 hover:text-foreground"
      >
        <ChevronLeft size={16} />
        Retour
      </button>

      <div className="flex items-center gap-2">
        <DepartmentIcon size={20} className="text-primary" />
        <h2 className="text-xl font-semibold text-foreground">
          {department}
        </h2>
        <span className="text-sm text-foreground/60">
          — {departmentTotal(slots, assignments, department)} h au total
        </span>
      </div>

      <div className="flex gap-1 border-b border-black/[.08] dark:border-white/[.08]">
        {(
          [
            { key: "volontaires", label: "Volontaires" },
            { key: "blocs", label: "Gestion des blocs" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setDepartmentTab(tab.key)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
              departmentTab === tab.key
                ? "border-b-2 border-primary text-primary"
                : "text-foreground/60 hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {departmentTab === "blocs" && canWrite && (
        <SlotManager
          coordinationKey={coordinationKey}
          department={department}
          slots={slots}
          onChange={fetchAll}
        />
      )}

      {departmentTab === "volontaires" && (
        <>
          {canWrite && (
            <AddVolunteerSearch
              onAdd={(character) => handleAddVolunteer(character, department)}
              excludeIds={departmentVolunteers.map((v) => v.character_id)}
            />
          )}

          <div className="overflow-x-auto">
            <table
              className="w-full table-fixed text-left text-sm"
              style={{
                minWidth: `${180 + departmentSlots.length * 160 + 144}px`,
              }}
            >
              <colgroup>
                <col className="w-44" />
                {departmentSlots.map((s) => (
                  <col key={s.id} className="w-40" />
                ))}
                <col className="w-20" />
                <col className="w-16" />
              </colgroup>
              <thead>
                <tr className="border-b border-black/[.08] text-foreground/60 dark:border-white/[.08]">
                  <th className="py-2 pr-4 font-medium">Nom</th>
                  {departmentSlots.map((s) => (
                    <th
                      key={s.id}
                      className="whitespace-normal py-2 pr-4 font-medium"
                    >
                      {s.label}
                      <span className="block text-xs font-normal text-foreground/50">
                        {s.hours} h
                      </span>
                    </th>
                  ))}
                  <th className="py-2 pr-4 font-medium">Total</th>
                  <th className="py-2 pr-4 font-medium" />
                </tr>
              </thead>
              <tbody>
                {departmentVolunteers.map((v) => (
                  <tr
                    key={v.id}
                    className="border-b border-black/[.06] odd:bg-black/[.015] dark:border-white/[.06] dark:odd:bg-white/[.03]"
                  >
                    <td className="py-2 pr-4 text-foreground">
                      <span className="flex items-center gap-1.5">
                        {(department === "Homologation" ||
                          department === "Escarmouches") && (
                          <button
                            type="button"
                            disabled={!canWrite}
                            onClick={() => handleToggleTeamLead(v.id, department)}
                            aria-label={
                              isTeamLead(v.id, department)
                                ? "Chef d'équipe"
                                : "Marquer comme chef d'équipe"
                            }
                            title={
                              isTeamLead(v.id, department)
                                ? "Chef d'équipe"
                                : "Marquer comme chef d'équipe"
                            }
                            className="picker-button flex-shrink-0 disabled:cursor-not-allowed"
                          >
                            <Star
                              size={14}
                              className={
                                isTeamLead(v.id, department)
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-foreground/30"
                              }
                            />
                          </button>
                        )}
                        {marechalDisplayName(v)}
                      </span>
                      {v.player_email && (
                        <span className="block text-xs text-foreground/50">
                          {v.player_email}
                        </span>
                      )}
                    </td>
                    {departmentSlots.map((s) => (
                      <td key={s.id} className="py-2 pr-4">
                        <input
                          type="checkbox"
                          disabled={!canWrite}
                          checked={assignments.some(
                            (a) =>
                              a.volunteer_id === v.id && a.slot_id === s.id,
                          )}
                          onChange={(e) =>
                            handleToggleAssignment(
                              v.id,
                              s.id,
                              e.target.checked,
                            )
                          }
                          className="h-4 w-4 accent-primary disabled:cursor-not-allowed"
                        />
                      </td>
                    ))}
                    <td className="py-2 pr-4 font-medium text-foreground">
                      {volunteerTotal(slots, assignments, department, v.id)}
                    </td>
                    <td className="py-2 pr-4">
                      {canWrite && (
                        <button
                          type="button"
                          onClick={() =>
                            handleRemoveFromDepartment(v, department)
                          }
                          aria-label="Retirer"
                          className="rounded-full p-1.5 text-foreground/60 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {departmentVolunteers.length === 0 && (
                  <tr>
                    <td
                      colSpan={departmentSlots.length + 3}
                      className="py-3 text-center text-sm text-foreground/60"
                    >
                      Aucun volontaire pour l&apos;instant.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
