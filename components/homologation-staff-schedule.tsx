"use client";

import { useEffect, useState } from "react";
import { listDepartments, type DepartmentDefinition } from "@/lib/department-definitions";
import {
  listAllDepartmentSlots,
  updateDepartmentSlot,
  type DepartmentSlot,
} from "@/lib/department-slots";
import { getModuleAccessLevels } from "@/lib/features";
import {
  clearStaffStation,
  HOMOLOGATION_STATIONS,
  listStaffAssignmentsForSlots,
  setStaffStation,
  type HomologationStaffAssignment,
  type HomologationStation,
} from "@/lib/homologation-staff-assignments";
import {
  listStationNeedsForSlots,
  setStationNeed,
  type HomologationStationNeed,
} from "@/lib/homologation-station-needs";
import { marechalDisplayName } from "@/lib/marechaux";
import { getOwnProfile } from "@/lib/profile";
import {
  listAssignmentsForVolunteers,
  type VolunteerSlotAssignment,
} from "@/lib/volunteer-slot-assignments";
import { listVolunteerDepartments } from "@/lib/volunteer-departments";
import { listVolunteers, type Volunteer } from "@/lib/volunteers";

const COORDINATION_KEY = "combat";
const YEAR = 2026;
const DEPARTMENT_NAME = "Homologation";

const STATION_SHORT_LABELS: Record<HomologationStation, string> = {
  kiosque_haute_ville: "HV",
  kiosque_vieille_ville: "VV",
  mobile: "Mob.",
};

const STATION_STYLES: Record<HomologationStation, string> = {
  kiosque_haute_ville:
    "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400",
  kiosque_vieille_ville:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-400",
  mobile:
    "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-400",
};

function stationSelectClassName(station: HomologationStation | ""): string {
  const colors = station
    ? STATION_STYLES[station]
    : "bg-white text-foreground dark:bg-zinc-800";
  return `w-full rounded border border-transparent px-1 py-1 text-xs hover:border-black/[.08] focus:border-black/[.15] focus:outline-none dark:hover:border-white/[.145] dark:focus:border-white/[.25] ${colors}`;
}

const needInputClassName =
  "w-9 rounded border border-black/[.08] bg-white px-1 py-0.5 text-[11px] text-foreground dark:border-white/[.145] dark:bg-zinc-800";

export default function HomologationStaffSchedule() {
  const [department, setDepartment] = useState<DepartmentDefinition | null>(
    null,
  );
  const [slots, setSlots] = useState<DepartmentSlot[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [departmentVolunteerIds, setDepartmentVolunteerIds] = useState<
    Set<string>
  >(new Set());
  const [slotAssignments, setSlotAssignments] = useState<
    VolunteerSlotAssignment[]
  >([]);
  const [staffAssignments, setStaffAssignments] = useState<
    HomologationStaffAssignment[]
  >([]);
  const [stationNeeds, setStationNeeds] = useState<HomologationStationNeed[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [canWrite, setCanWrite] = useState(false);

  const fetchAll = async () => {
    setIsLoading(true);
    const departments = await listDepartments(COORDINATION_KEY, YEAR);
    const dept = departments.find((d) => d.name === DEPARTMENT_NAME) ?? null;
    setDepartment(dept);
    if (!dept) {
      setIsLoading(false);
      return;
    }

    const [allSlots, allVolunteers] = await Promise.all([
      listAllDepartmentSlots(COORDINATION_KEY, YEAR),
      listVolunteers(COORDINATION_KEY, YEAR),
    ]);
    const deptSlots = allSlots.filter((s) => s.department_id === dept.id);
    const volunteerIds = allVolunteers.map((v) => v.id);
    const slotIds = deptSlots.map((s) => s.id);

    const [deptLinks, assignments, staff, needs] = await Promise.all([
      listVolunteerDepartments(volunteerIds),
      listAssignmentsForVolunteers(volunteerIds),
      listStaffAssignmentsForSlots(slotIds),
      listStationNeedsForSlots(slotIds),
    ]);

    setSlots(deptSlots);
    setVolunteers(allVolunteers);
    setDepartmentVolunteerIds(
      new Set(
        deptLinks
          .filter((l) => l.department_id === dept.id)
          .map((l) => l.volunteer_id),
      ),
    );
    setSlotAssignments(assignments);
    setStaffAssignments(staff);
    setStationNeeds(needs);
    setIsLoading(false);
  };

  useEffect(() => {
    getOwnProfile().then((profile) => {
      if (!profile) return;
      getModuleAccessLevels(profile).then((levels) => {
        setCanWrite(levels["homologation"] === "ecriture");
      });
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchAll sets a loading flag ahead of an async fetch
    fetchAll();
  }, []);

  const handleNeedChange = async (
    slotId: string,
    station: HomologationStation,
    value: string,
  ) => {
    if (!canWrite) return;
    const neededCount = Math.max(0, Number(value) || 0);
    const previous = stationNeeds;
    const updatedNeeds = [
      ...previous.filter((n) => !(n.slot_id === slotId && n.station === station)),
      { id: `${slotId}:${station}`, slot_id: slotId, station, needed_count: neededCount },
    ];
    setStationNeeds(updatedNeeds);
    try {
      await setStationNeed(slotId, station, neededCount);
      const slot = slots.find((s) => s.id === slotId);
      if (slot) {
        const total = HOMOLOGATION_STATIONS.reduce(
          (sum, st) =>
            sum +
            (updatedNeeds.find((n) => n.slot_id === slotId && n.station === st.key)
              ?.needed_count ?? 0),
          0,
        );
        await updateDepartmentSlot(slotId, {
          label: slot.label,
          hours: slot.hours,
          date: slot.date,
          start_time: slot.start_time,
          end_time: slot.end_time,
          needed_volunteers: total,
        });
        setSlots((prev) =>
          prev.map((s) =>
            s.id === slotId ? { ...s, needed_volunteers: total } : s,
          ),
        );
      }
    } catch {
      alert("Échec de la mise à jour.");
      setStationNeeds(previous);
    }
  };

  const handleStationChange = async (
    slotId: string,
    volunteerId: string,
    value: string,
  ) => {
    if (!canWrite) return;
    const previous = staffAssignments;
    if (value === "") {
      setStaffAssignments((prev) =>
        prev.filter(
          (a) => !(a.slot_id === slotId && a.volunteer_id === volunteerId),
        ),
      );
      try {
        await clearStaffStation(slotId, volunteerId);
      } catch {
        alert("Échec de la mise à jour.");
        setStaffAssignments(previous);
      }
      return;
    }
    const station = value as HomologationStation;
    setStaffAssignments((prev) => [
      ...prev.filter(
        (a) => !(a.slot_id === slotId && a.volunteer_id === volunteerId),
      ),
      { id: `${slotId}:${volunteerId}`, slot_id: slotId, volunteer_id: volunteerId, station },
    ]);
    try {
      await setStaffStation(slotId, volunteerId, station);
    } catch {
      alert("Échec de la mise à jour.");
      setStaffAssignments(previous);
    }
  };

  if (isLoading) return <p className="text-sm text-foreground/60">Chargement…</p>;

  if (!department) {
    return (
      <p className="text-sm text-foreground/60">
        Aucun département &quot;Homologation&quot; trouvé dans Combat — gère les
        départements depuis la section Volontaires.
      </p>
    );
  }

  const departmentVolunteers = volunteers
    .filter((v) => departmentVolunteerIds.has(v.id))
    .sort((a, b) => marechalDisplayName(a).localeCompare(marechalDisplayName(b), "fr"));

  const slotNeededTotal = (slotId: string) =>
    HOMOLOGATION_STATIONS.reduce(
      (sum, st) =>
        sum +
        (stationNeeds.find((n) => n.slot_id === slotId && n.station === st.key)
          ?.needed_count ?? 0),
      0,
    );

  return (
    <div className="flex flex-col gap-4">
      {slots.length === 0 ? (
        <p className="text-sm text-foreground/60">
          Aucun bloc pour l&apos;instant — gère-les depuis la section
          Volontaires, département Homologation.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="text-left text-sm">
            <thead>
              <tr className="border-b border-black/[.08] text-foreground/60 dark:border-white/[.08]">
                <th className="sticky left-0 top-0 z-20 bg-white py-2 pr-4 align-bottom font-medium dark:bg-zinc-900">
                  Nom
                </th>
                {slots.map((s) => (
                  <th
                    key={s.id}
                    className="sticky top-0 z-10 whitespace-nowrap bg-white px-3 py-2 text-center align-bottom font-medium dark:bg-zinc-900"
                  >
                    <span className="block text-[11px] font-semibold text-foreground/70">
                      {s.label}
                    </span>
                    <span className="block text-[10px] text-foreground/50">
                      Requis : {slotNeededTotal(s.id)}
                    </span>
                    <span className="mt-1 flex flex-col items-center gap-0.5">
                      {HOMOLOGATION_STATIONS.map((st) => {
                        const need = stationNeeds.find(
                          (n) => n.slot_id === s.id && n.station === st.key,
                        );
                        return (
                          <span
                            key={st.key}
                            className="flex items-center gap-1 text-[10px] text-foreground/50"
                          >
                            {STATION_SHORT_LABELS[st.key]}
                            <input
                              type="number"
                              min={0}
                              value={need?.needed_count ?? 0}
                              disabled={!canWrite}
                              onChange={(e) =>
                                handleNeedChange(s.id, st.key, e.target.value)
                              }
                              className={`${needInputClassName} disabled:opacity-60`}
                            />
                          </span>
                        );
                      })}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {departmentVolunteers.map((v) => (
                <tr
                  key={v.id}
                  className="border-b border-black/[.06] odd:bg-black/[.015] dark:border-white/[.06] dark:odd:bg-white/[.03]"
                >
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-white py-2 pr-4 text-foreground dark:bg-zinc-900">
                    {marechalDisplayName(v)}
                  </td>
                  {slots.map((s) => {
                    const isAssignedToSlot = slotAssignments.some(
                      (a) => a.volunteer_id === v.id && a.slot_id === s.id,
                    );
                    if (!isAssignedToSlot) {
                      return (
                        <td key={s.id} className="px-3 py-2 text-center">
                          <span className="text-foreground/30">—</span>
                        </td>
                      );
                    }
                    const current = staffAssignments.find(
                      (a) => a.slot_id === s.id && a.volunteer_id === v.id,
                    );
                    const availableStations = HOMOLOGATION_STATIONS.filter(
                      (st) => {
                        if (st.key === current?.station) return true;
                        const needed =
                          stationNeeds.find(
                            (n) => n.slot_id === s.id && n.station === st.key,
                          )?.needed_count ?? 0;
                        const assigned = staffAssignments.filter(
                          (a) => a.slot_id === s.id && a.station === st.key,
                        ).length;
                        return assigned < needed;
                      },
                    );
                    return (
                      <td key={s.id} className="px-3 py-2">
                        <select
                          value={current?.station ?? ""}
                          disabled={!canWrite}
                          onChange={(e) =>
                            handleStationChange(s.id, v.id, e.target.value)
                          }
                          className={`${stationSelectClassName(current?.station ?? "")} disabled:opacity-60`}
                        >
                          <option value="">—</option>
                          {availableStations.map((st) => (
                            <option key={st.key} value={st.key}>
                              {st.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {departmentVolunteers.length === 0 && (
                <tr>
                  <td
                    colSpan={slots.length + 1}
                    className="py-3 text-center text-sm text-foreground/60"
                  >
                    Aucun volontaire pour l&apos;instant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
