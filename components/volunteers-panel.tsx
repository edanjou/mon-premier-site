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
  Ban,
  ChartColumnStacked,
  ChevronLeft,
  Clock,
  Folder,
  GripVertical,
  Plus,
  Search,
  Settings,
  Star,
  Trash2,
  UserX,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { glofters } from "@/app/fonts/glofters";
import { titleSizeClass } from "@/components/module-hub";
import { searchCharacters, type Character } from "@/lib/characters";
import {
  createDepartment,
  deleteDepartment,
  listDepartments,
  renameDepartment,
  type DepartmentDefinition,
} from "@/lib/department-definitions";
import {
  createDepartmentSlot,
  deleteDepartmentSlot,
  listAllDepartmentSlots,
  reorderDepartmentSlots,
  updateDepartmentSlot,
  type DepartmentSlot,
} from "@/lib/department-slots";
import { getModuleAccessLevels } from "@/lib/features";
import { marechalDisplayName, toTitleCase } from "@/lib/marechaux";
import {
  addToBlacklist,
  listBlacklist,
  removeFromBlacklist,
  type BlacklistEntry,
} from "@/lib/volunteer-blacklist";
import {
  addVolunteerToDepartment,
  listVolunteerDepartments,
  removeVolunteerFromDepartment,
  setVolunteerTeamLead,
  type VolunteerDepartmentLink,
} from "@/lib/volunteer-departments";
import {
  listVolunteerReviewStatuses,
  upsertVolunteerReviewStatus,
  type VolunteerReviewStatus,
  type VolunteerStatus,
} from "@/lib/volunteer-review-status";
import {
  assignVolunteerToSlot,
  listAssignmentsForVolunteers,
  setSlotAbsence,
  unassignVolunteerFromSlot,
  type VolunteerSlotAssignment,
} from "@/lib/volunteer-slot-assignments";
import {
  getOrCreateVolunteer,
  listVolunteers,
  setDiscountScheduledForCharacter,
  setVolunteerHoursAdjustment,
  setVolunteerStatus,
  type Volunteer,
} from "@/lib/volunteers";
import { getOwnProfile } from "@/lib/profile";

const cellFieldClassName =
  "min-w-0 rounded border border-black/[.08] bg-white px-2 py-1 text-sm text-foreground disabled:opacity-60 dark:border-white/[.145] dark:bg-zinc-800";

// Departments with an explicit "chef d'équipe" star toggle — a fixed subset
// by name rather than every department, since the star was requested only
// for these two.
const TEAM_LEAD_DEPARTMENTS = new Set(["Homologation", "Escarmouches"]);

function SlotCountBadge({
  slot,
  assignments,
}: {
  slot: DepartmentSlot;
  assignments: VolunteerSlotAssignment[];
}) {
  const count = assignments.filter((a) => a.slot_id === slot.id).length;
  const needed = slot.needed_volunteers;
  const short = needed !== null && count < needed;
  return (
    <span
      className={`block text-[11px] font-semibold ${
        short
          ? "text-red-600 dark:text-red-400"
          : "text-foreground/50"
      }`}
    >
      {count}
      {needed !== null && `/${needed}`}
    </span>
  );
}

function slotGroupClassName(
  slots: DepartmentSlot[],
  index: number,
): string {
  if (index === 0) return "";
  const day = (label: string) => label.split(" ")[0];
  return day(slots[index].label) !== day(slots[index - 1].label)
    ? "border-l-2 border-l-black/[.15] dark:border-l-white/[.15]"
    : "";
}

function SlotLabel({ label }: { label: string }) {
  const [first, ...rest] = label.split(" ");
  return (
    <>
      {first}
      {rest.length > 0 && (
        <>
          <br />
          {rest.join(" ")}
        </>
      )}
    </>
  );
}

function slotHours(slots: DepartmentSlot[], slotId: string): number {
  return slots.find((s) => s.id === slotId)?.hours ?? 0;
}

function departmentTotal(
  slots: DepartmentSlot[],
  assignments: VolunteerSlotAssignment[],
  departmentId: string,
): number {
  const slotIds = new Set(
    slots.filter((s) => s.department_id === departmentId).map((s) => s.id),
  );
  return assignments
    .filter((a) => slotIds.has(a.slot_id))
    .reduce((sum, a) => sum + slotHours(slots, a.slot_id), 0);
}

function volunteerTotal(
  slots: DepartmentSlot[],
  assignments: VolunteerSlotAssignment[],
  departmentId: string,
  volunteerId: string,
): number {
  const slotIds = new Set(
    slots.filter((s) => s.department_id === departmentId).map((s) => s.id),
  );
  return assignments
    .filter((a) => a.volunteer_id === volunteerId && slotIds.has(a.slot_id))
    .reduce((sum, a) => sum + slotHours(slots, a.slot_id), 0);
}

function volunteerAbsentHours(
  slots: DepartmentSlot[],
  assignments: VolunteerSlotAssignment[],
  volunteerId: string,
): number {
  return assignments
    .filter((a) => a.volunteer_id === volunteerId && a.absent)
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

function DepartmentManager({
  coordinationKey,
  year,
  departments,
  onChange,
}: {
  coordinationKey: string;
  year: number;
  departments: DepartmentDefinition[];
  onChange: () => Promise<void>;
}) {
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setError(null);
    try {
      await createDepartment(
        coordinationKey,
        year,
        newName.trim(),
        departments.length,
      );
      setNewName("");
      await onChange();
    } catch {
      setError("Échec de la création.");
    }
  };

  const handleRename = async (dept: DepartmentDefinition, name: string) => {
    if (!name.trim() || name.trim() === dept.name) return;
    setError(null);
    try {
      await renameDepartment(dept.id, name.trim());
      await onChange();
    } catch {
      setError("Échec de la modification.");
    }
  };

  const handleDelete = async (dept: DepartmentDefinition) => {
    if (
      !window.confirm(
        `Supprimer le département "${dept.name}" ? Ses blocs et l'affectation des volontaires seront aussi supprimés.`,
      )
    )
      return;
    try {
      await deleteDepartment(dept.id);
      await onChange();
    } catch {
      setError("Échec de la suppression.");
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-2">
        {departments.map((d) => (
          <div key={d.id} className="flex items-center gap-2">
            <input
              type="text"
              defaultValue={d.name}
              onBlur={(e) => handleRename(d, e.target.value)}
              className={`${cellFieldClassName} flex-1`}
            />
            <button
              type="button"
              onClick={() => handleDelete(d)}
              aria-label="Supprimer"
              className="rounded-full p-1.5 text-foreground/50 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {departments.length === 0 && (
          <p className="text-xs text-foreground/40">
            Aucun département pour l&apos;instant.
          </p>
        )}
      </div>
      <form onSubmit={handleCreate} className="mt-2 flex items-center gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Ex. Intendance"
          className={`${cellFieldClassName} flex-1`}
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

function formatSlotTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  return m === "00" ? `${hour}h` : `${hour}h${m}`;
}

function computeSlotHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
}

function computeSlotLabel(
  date: string,
  startTime: string,
  endTime: string,
): string {
  const [y, m, d] = date.split("-").map(Number);
  const dayName = new Date(y, m - 1, d).toLocaleDateString("fr-FR", {
    weekday: "long",
  });
  const capitalized = dayName.charAt(0).toUpperCase() + dayName.slice(1);
  return `${capitalized} de ${formatSlotTime(startTime)} à ${formatSlotTime(endTime)}`;
}

function SortableSlotRow({
  slot,
  onUpdate,
  onUpdateManual,
  onNeededChange,
  onDelete,
}: {
  slot: DepartmentSlot;
  onUpdate: (
    slot: DepartmentSlot,
    patch: { date?: string; start_time?: string; end_time?: string },
  ) => void;
  onUpdateManual: (
    slot: DepartmentSlot,
    patch: { label?: string; hours?: number },
  ) => void;
  onNeededChange: (slot: DepartmentSlot, value: number | null) => void;
  onDelete: (slot: DepartmentSlot) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: slot.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 ${isDragging ? "relative z-10 opacity-50" : ""}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Déplacer"
        className="cursor-grab touch-none text-foreground/40 hover:text-foreground/70"
      >
        <GripVertical size={14} />
      </button>
      {slot.date ? (
        <>
          <span className="flex-1 text-sm text-foreground">{slot.label}</span>
          <input
            type="date"
            defaultValue={slot.date ?? ""}
            onBlur={(e) => onUpdate(slot, { date: e.target.value })}
            className={`${cellFieldClassName} w-36`}
          />
          <input
            type="time"
            defaultValue={slot.start_time ?? ""}
            onBlur={(e) => onUpdate(slot, { start_time: e.target.value })}
            className={`${cellFieldClassName} w-24`}
          />
          <input
            type="time"
            defaultValue={slot.end_time ?? ""}
            onBlur={(e) => onUpdate(slot, { end_time: e.target.value })}
            className={`${cellFieldClassName} w-24`}
          />
          <span className="w-12 flex-shrink-0 text-right text-xs text-foreground/50">
            {slot.hours} h
          </span>
        </>
      ) : (
        <>
          <input
            type="text"
            defaultValue={slot.label}
            onBlur={(e) => onUpdateManual(slot, { label: e.target.value })}
            className={`${cellFieldClassName} flex-1`}
          />
          <input
            type="number"
            min={0}
            step={0.25}
            defaultValue={slot.hours}
            onBlur={(e) =>
              onUpdateManual(slot, {
                hours: parseFloat(e.target.value) || 0,
              })
            }
            className={`${cellFieldClassName} w-24`}
          />
        </>
      )}
      <input
        type="number"
        min={0}
        step={1}
        defaultValue={slot.needed_volunteers ?? ""}
        placeholder="Besoin"
        title="Nombre de volontaires nécessaires"
        onBlur={(e) =>
          onNeededChange(
            slot,
            e.target.value === "" ? null : parseInt(e.target.value, 10),
          )
        }
        className={`${cellFieldClassName} w-16`}
      />
      <button
        type="button"
        onClick={() => onDelete(slot)}
        aria-label="Supprimer"
        className="rounded-full p-1.5 text-foreground/50 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function SlotManager({
  coordinationKey,
  year,
  departmentId,
  slots,
  onChange,
}: {
  coordinationKey: string;
  year: number;
  departmentId: string;
  slots: DepartmentSlot[];
  onChange: () => Promise<void>;
}) {
  const [createMode, setCreateMode] = useState<"auto" | "manuel">("auto");
  const [newDate, setNewDate] = useState("");
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newHours, setNewHours] = useState("");
  const [newNeeded, setNewNeeded] = useState("");
  const [error, setError] = useState<string | null>(null);

  const departmentSlots = slots.filter(
    (s) => s.department_id === departmentId,
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate || !newStartTime || !newEndTime) return;
    const hours = computeSlotHours(newStartTime, newEndTime);
    if (hours <= 0) {
      setError("L'heure de fin doit être après l'heure de début.");
      return;
    }
    setError(null);
    try {
      await createDepartmentSlot({
        coordination_key: coordinationKey,
        year,
        department_id: departmentId,
        label: computeSlotLabel(newDate, newStartTime, newEndTime),
        hours,
        date: newDate,
        start_time: newStartTime,
        end_time: newEndTime,
        needed_volunteers: newNeeded === "" ? null : parseInt(newNeeded, 10),
        position: departmentSlots.length,
      });
      setNewDate("");
      setNewStartTime("");
      setNewEndTime("");
      setNewNeeded("");
      await onChange();
    } catch {
      setError("Échec de la création.");
    }
  };

  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const hours = parseFloat(newHours) || 0;
    if (!newLabel.trim() || hours <= 0) return;
    setError(null);
    try {
      await createDepartmentSlot({
        coordination_key: coordinationKey,
        year,
        department_id: departmentId,
        label: newLabel.trim(),
        hours,
        date: null,
        start_time: null,
        end_time: null,
        needed_volunteers: newNeeded === "" ? null : parseInt(newNeeded, 10),
        position: departmentSlots.length,
      });
      setNewLabel("");
      setNewHours("");
      setNewNeeded("");
      await onChange();
    } catch {
      setError("Échec de la création.");
    }
  };

  const handleUpdate = async (
    slot: DepartmentSlot,
    patch: { date?: string; start_time?: string; end_time?: string },
  ) => {
    const date = patch.date ?? slot.date;
    const startTime = patch.start_time ?? slot.start_time;
    const endTime = patch.end_time ?? slot.end_time;
    if (!date || !startTime || !endTime) return;
    const hours = computeSlotHours(startTime, endTime);
    if (hours <= 0) {
      setError("L'heure de fin doit être après l'heure de début.");
      return;
    }
    setError(null);
    try {
      await updateDepartmentSlot(slot.id, {
        label: computeSlotLabel(date, startTime, endTime),
        hours,
        date,
        start_time: startTime,
        end_time: endTime,
        needed_volunteers: slot.needed_volunteers,
      });
      await onChange();
    } catch {
      setError("Échec de la modification.");
    }
  };

  const handleUpdateManual = async (
    slot: DepartmentSlot,
    patch: { label?: string; hours?: number },
  ) => {
    const label = patch.label ?? slot.label;
    const hours = patch.hours ?? slot.hours;
    if (!label.trim() || hours <= 0) return;
    setError(null);
    try {
      await updateDepartmentSlot(slot.id, {
        label: label.trim(),
        hours,
        date: null,
        start_time: null,
        end_time: null,
        needed_volunteers: slot.needed_volunteers,
      });
      await onChange();
    } catch {
      setError("Échec de la modification.");
    }
  };

  const handleNeededChange = async (
    slot: DepartmentSlot,
    value: number | null,
  ) => {
    setError(null);
    try {
      await updateDepartmentSlot(slot.id, {
        label: slot.label,
        hours: slot.hours,
        date: slot.date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        needed_volunteers: value,
      });
      await onChange();
    } catch {
      setError("Échec de la mise à jour.");
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = departmentSlots.findIndex((s) => s.id === active.id);
    const toIndex = departmentSlots.findIndex((s) => s.id === over.id);
    if (fromIndex === -1 || toIndex === -1) return;
    const reordered = arrayMove(departmentSlots, fromIndex, toIndex);
    reorderDepartmentSlots(
      reordered.map((s, index) => ({ id: s.id, position: index })),
    )
      .then(onChange)
      .catch(() => {
        setError("Échec de la réorganisation.");
      });
  };

  return (
    <div className="rounded-lg border border-black/[.08] p-3 dark:border-white/[.145]">
      <h3 className="mb-2 text-sm font-semibold text-foreground">Blocs</h3>
      {departmentSlots.length === 0 ? (
        <p className="text-xs text-foreground/40">
          Aucun bloc pour l&apos;instant.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={departmentSlots.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-2">
              {departmentSlots.map((slot) => (
                <SortableSlotRow
                  key={slot.id}
                  slot={slot}
                  onUpdate={handleUpdate}
                  onUpdateManual={handleUpdateManual}
                  onNeededChange={handleNeededChange}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <div className="mt-3 flex gap-1">
        <button
          type="button"
          onClick={() => setCreateMode("auto")}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            createMode === "auto"
              ? "border-primary bg-primary text-white"
              : "border-black/[.08] text-foreground/70 hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
          }`}
        >
          Date et heures
        </button>
        <button
          type="button"
          onClick={() => setCreateMode("manuel")}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            createMode === "manuel"
              ? "border-primary bg-primary text-white"
              : "border-black/[.08] text-foreground/70 hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
          }`}
        >
          Manuel
        </button>
      </div>

      {createMode === "auto" ? (
        <form onSubmit={handleCreate} className="mt-2 flex items-center gap-2">
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className={`${cellFieldClassName} w-36`}
          />
          <input
            type="time"
            value={newStartTime}
            onChange={(e) => setNewStartTime(e.target.value)}
            className={`${cellFieldClassName} w-24`}
          />
          <input
            type="time"
            value={newEndTime}
            onChange={(e) => setNewEndTime(e.target.value)}
            className={`${cellFieldClassName} w-24`}
          />
          <input
            type="number"
            min={0}
            step={1}
            value={newNeeded}
            onChange={(e) => setNewNeeded(e.target.value)}
            placeholder="Besoin"
            title="Nombre de volontaires nécessaires"
            className={`${cellFieldClassName} w-16`}
          />
          <button
            type="submit"
            className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#0c4390]"
          >
            <Plus size={14} />
            Ajouter
          </button>
        </form>
      ) : (
        <form
          onSubmit={handleCreateManual}
          className="mt-2 flex items-center gap-2"
        >
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
          <input
            type="number"
            min={0}
            step={1}
            value={newNeeded}
            onChange={(e) => setNewNeeded(e.target.value)}
            placeholder="Besoin"
            title="Nombre de volontaires nécessaires"
            className={`${cellFieldClassName} w-16`}
          />
          <button
            type="submit"
            className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#0c4390]"
          >
            <Plus size={14} />
            Ajouter
          </button>
        </form>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

function AddVolunteerSearch({
  onAdd,
  excludeIds,
  placeholder = "Rechercher un personnage à ajouter comme volontaire…",
}: {
  onAdd: (character: Character) => void;
  excludeIds: number[];
  placeholder?: string;
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
        placeholder={placeholder}
        className="w-full rounded-full border border-black/[.08] bg-white py-2 pl-9 pr-3 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
      />
      {isSearching && (
        <p className="mt-1 text-xs text-foreground/40">Recherche…</p>
      )}
      {suggestions.length > 0 && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-black/[.08] bg-white shadow-lg dark:border-white/[.145] dark:bg-zinc-800">
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

function BlacklistManager({
  coordinationKey,
  entries,
  onChange,
}: {
  coordinationKey: string;
  entries: BlacklistEntry[];
  onChange: () => Promise<void>;
}) {
  const [pending, setPending] = useState<Character | null>(null);
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirmAdd = async () => {
    if (!pending) return;
    setIsSaving(true);
    setError(null);
    try {
      await addToBlacklist(
        coordinationKey,
        pending.external_id,
        reason.trim() || null,
      );
      setPending(null);
      setReason("");
      await onChange();
    } catch {
      setError("Échec de l'ajout.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async (entry: BlacklistEntry) => {
    if (
      !window.confirm(
        `Retirer ${toTitleCase(entry.player_name || entry.name)} de la liste noire ?`,
      )
    )
      return;
    setError(null);
    try {
      await removeFromBlacklist(entry.id);
      await onChange();
    } catch {
      setError("Échec de la suppression.");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-foreground/50">
        Les personnages ajoutés ici ne pourront plus être ajoutés comme
        volontaires dans cette coordination.
      </p>

      {pending ? (
        <div className="rounded-lg border border-black/[.08] p-3 dark:border-white/[.145]">
          <p className="mb-2 text-sm font-medium text-foreground">
            {toTitleCase(pending.player_name || pending.name)}
            {pending.player_name ? ` — ${toTitleCase(pending.name)}` : ""}
          </p>
          <textarea
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Raison (optionnel)…"
            rows={3}
            className="w-full rounded border border-black/[.08] bg-white px-2 py-1.5 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setPending(null);
                setReason("");
              }}
              className="rounded-full border border-black/[.08] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleConfirmAdd}
              disabled={isSaving}
              className="rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#0c4390] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "…" : "Ajouter à la liste noire"}
            </button>
          </div>
        </div>
      ) : (
        <AddVolunteerSearch
          onAdd={(character) => setPending(character)}
          excludeIds={entries.map((e) => e.character_id)}
          placeholder="Rechercher un personnage à mettre sur liste noire…"
        />
      )}

      <div className="flex flex-col gap-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-start gap-2 rounded-lg border border-black/[.08] p-3 dark:border-white/[.145]"
          >
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {toTitleCase(entry.player_name || entry.name)}
                {entry.player_name ? ` — ${toTitleCase(entry.name)}` : ""}
              </p>
              {entry.reason && (
                <p className="mt-1 text-xs text-foreground/60">
                  {entry.reason}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => handleRemove(entry)}
              aria-label="Retirer"
              className="flex-shrink-0 rounded-full p-1.5 text-foreground/50 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="text-xs text-foreground/40">
            Aucun personnage sur la liste noire.
          </p>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

function StatsPanel({
  departments,
  departmentLinks,
  slots,
  assignments,
  categorizedVolunteers,
}: {
  departments: DepartmentDefinition[];
  departmentLinks: VolunteerDepartmentLink[];
  slots: DepartmentSlot[];
  assignments: VolunteerSlotAssignment[];
  categorizedVolunteers: Volunteer[];
}) {
  const coordinationHours = departments.reduce(
    (sum, d) => sum + departmentTotal(slots, assignments, d.id),
    0,
  );

  return (
    <div className="flex flex-col gap-3">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-black/[.08] text-foreground/60 dark:border-white/[.08]">
            <th className="py-2 pr-4 font-medium">Département</th>
            <th className="py-2 pr-4 text-right font-medium">Volontaires</th>
            <th className="py-2 pr-4 text-right font-medium">Heures</th>
          </tr>
        </thead>
        <tbody>
          {departments.map((d) => (
            <tr
              key={d.id}
              className="border-b border-black/[.06] odd:bg-black/[.015] dark:border-white/[.06] dark:odd:bg-white/[.03]"
            >
              <td className="py-2 pr-4 text-foreground">{d.name}</td>
              <td className="py-2 pr-4 text-right text-foreground/80">
                {departmentLinks.filter((l) => l.department_id === d.id).length}
              </td>
              <td className="py-2 pr-4 text-right text-foreground/80">
                {departmentTotal(slots, assignments, d.id)} h
              </td>
            </tr>
          ))}
          {departments.length === 0 && (
            <tr>
              <td
                colSpan={3}
                className="py-3 text-center text-sm text-foreground/60"
              >
                Aucun département pour l&apos;instant.
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr className="border-t border-black/[.08] bg-primary/10 font-semibold text-primary dark:border-white/[.08] dark:bg-primary/20">
            <td className="py-2 pr-4">Total coordination</td>
            <td className="py-2 pr-4 text-right">
              {categorizedVolunteers.length}
            </td>
            <td className="py-2 pr-4 text-right">{coordinationHours} h</td>
          </tr>
        </tfoot>
      </table>
      <p className="text-xs text-foreground/40">
        Le total de la coordination compte chaque volontaire une seule fois,
        même s&apos;il est dans plusieurs départements.
      </p>
    </div>
  );
}

export default function VolunteersPanel({
  coordinationKey,
  moduleKey,
  year,
}: {
  coordinationKey: string;
  moduleKey: string;
  year: number;
}) {
  const [view, setView] = useState<"dashboard" | string>("dashboard");
  const [departments, setDepartments] = useState<DepartmentDefinition[]>([]);
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
  const [departmentTab, setDepartmentTab] = useState<
    "blocs" | "volontaires" | "absences"
  >(
    "volontaires",
  );
  const [showDepartmentSettings, setShowDepartmentSettings] = useState(false);
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const [showBlacklistManager, setShowBlacklistManager] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [reviewStatuses, setReviewStatuses] = useState<
    Map<number, VolunteerReviewStatus>
  >(new Map());

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
      const [departmentList, volunteerList, blacklistEntries, reviewList] =
        await Promise.all([
          listDepartments(coordinationKey, year),
          listVolunteers(coordinationKey, year),
          listBlacklist(coordinationKey),
          listVolunteerReviewStatuses(),
        ]);
      const volunteerIds = volunteerList.map((v) => v.id);
      const [slotList, assignmentList, linkList] = await Promise.all([
        listAllDepartmentSlots(coordinationKey, year),
        listAssignmentsForVolunteers(volunteerIds),
        listVolunteerDepartments(volunteerIds),
      ]);
      setDepartments(departmentList);
      setVolunteers(
        [...volunteerList].sort((a, b) =>
          marechalDisplayName(a).localeCompare(marechalDisplayName(b), "fr"),
        ),
      );
      setSlots(slotList);
      setAssignments(assignmentList);
      setDepartmentLinks(linkList);
      setBlacklist(blacklistEntries);
      setReviewStatuses(
        new Map(reviewList.map((r) => [r.character_id, r])),
      );
    } catch {
      setError("Impossible de charger les volontaires.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchAll sets a loading flag ahead of an async fetch
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchAll is stable for a given coordinationKey/year
  }, [coordinationKey, year]);

  const handleAddVolunteer = async (
    character: Character,
    departmentId: string,
  ) => {
    if (!canWrite) return;
    if (blacklist.some((b) => b.character_id === character.external_id)) {
      alert("Cette personne est sur la liste noire de cette coordination.");
      return;
    }
    try {
      const volunteer = await getOrCreateVolunteer(
        coordinationKey,
        year,
        character.external_id,
      );
      await addVolunteerToDepartment(volunteer.id, departmentId);
      await fetchAll();
    } catch {
      alert("Échec de l'ajout.");
    }
  };

  const handleRemoveFromDepartment = async (
    volunteer: Volunteer,
    department: DepartmentDefinition,
  ) => {
    if (!canWrite) return;
    if (
      !window.confirm(
        `Retirer ${marechalDisplayName(volunteer)} de ${department.name} ?`,
      )
    )
      return;
    try {
      await removeVolunteerFromDepartment(volunteer.id, department.id);
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
      return;
    }
    // Confirming hours flags the centralized record for review.
    if (field === "hours_confirmed" && value) {
      await handleStatusReviewChange(volunteer, "À modifier");
    }
  };

  const handleAdjustTotal = async (
    volunteer: Volunteer,
    computedTotal: number,
    newTotal: number,
  ) => {
    if (!canWrite) return;
    const adjustment = newTotal - computedTotal;
    if (adjustment === volunteer.hours_adjustment) return;
    setVolunteers((prev) =>
      prev.map((v) =>
        v.id === volunteer.id ? { ...v, hours_adjustment: adjustment } : v,
      ),
    );
    try {
      await setVolunteerHoursAdjustment(volunteer.id, adjustment);
    } catch {
      alert("Échec de la mise à jour.");
      await fetchAll();
      return;
    }
    // Adjusting hours after the record was marked Fait flags it for
    // review again.
    await resetStatusIfFait(volunteer.character_id);
  };

  // Any change to a volunteer's hours (department assignment, manual
  // adjustment) invalidates a Fait status — flags it back to À modifier.
  const resetStatusIfFait = async (characterId: number) => {
    if (reviewStatuses.get(characterId)?.status !== "Fait") return;
    const volunteer = volunteers.find((v) => v.character_id === characterId);
    if (!volunteer) return;
    await handleStatusReviewChange(volunteer, "À modifier");
  };

  const handleStatusReviewChange = async (
    volunteer: Volunteer,
    status: VolunteerStatus | null,
  ) => {
    if (!canWrite) return;
    const existing = reviewStatuses.get(volunteer.character_id);
    const updated: VolunteerReviewStatus = {
      character_id: volunteer.character_id,
      status,
      notes: existing?.notes ?? null,
      early_arrival: existing?.early_arrival ?? null,
    };
    setReviewStatuses((prev) => {
      const next = new Map(prev);
      next.set(volunteer.character_id, updated);
      return next;
    });
    try {
      await Promise.all([
        upsertVolunteerReviewStatus(volunteer.character_id, {
          status: updated.status,
          notes: updated.notes,
          early_arrival: updated.early_arrival,
        }),
        setDiscountScheduledForCharacter(
          volunteer.character_id,
          status === "Fait",
        ),
      ]);
    } catch {
      alert("Échec de la mise à jour.");
      await fetchAll();
    }
  };

  const handleToggleTeamLead = async (
    volunteerId: string,
    departmentId: string,
  ) => {
    if (!canWrite) return;
    const current = departmentLinks.find(
      (l) => l.volunteer_id === volunteerId && l.department_id === departmentId,
    );
    const value = !current?.team_lead;
    setDepartmentLinks((prev) =>
      prev.map((l) =>
        l.volunteer_id === volunteerId && l.department_id === departmentId
          ? { ...l, team_lead: value }
          : l,
      ),
    );
    try {
      await setVolunteerTeamLead(volunteerId, departmentId, value);
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
        ? [
            ...prev,
            { volunteer_id: volunteerId, slot_id: slotId, absent: false },
          ]
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
      return;
    }
    const volunteer = volunteers.find((v) => v.id === volunteerId);
    if (volunteer) await resetStatusIfFait(volunteer.character_id);
  };

  const handleToggleAbsence = async (
    volunteerId: string,
    slotId: string,
    absent: boolean,
  ) => {
    if (!canWrite) return;
    setAssignments((prev) =>
      prev.map((a) =>
        a.volunteer_id === volunteerId && a.slot_id === slotId
          ? { ...a, absent }
          : a,
      ),
    );
    try {
      await setSlotAbsence(volunteerId, slotId, absent);
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

  const isInDepartment = (volunteerId: string, departmentId: string) =>
    departmentLinks.some(
      (l) => l.volunteer_id === volunteerId && l.department_id === departmentId,
    );

  const isTeamLead = (volunteerId: string, departmentId: string) =>
    departmentLinks.some(
      (l) =>
        l.volunteer_id === volunteerId &&
        l.department_id === departmentId &&
        l.team_lead,
    );

  if (view === "dashboard") {
    // Only show volunteers assigned to at least one department — a
    // volunteer removed from their last department otherwise lingers as an
    // empty row (no category, no hours) instead of disappearing.
    const categorizedVolunteers = volunteers.filter((v) =>
      departmentLinks.some((l) => l.volunteer_id === v.id),
    );
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-3">
            {departments.map((department) => (
              <div
                key={department.id}
                onClick={() => {
                  setView(department.id);
                  setDepartmentTab("volontaires");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setView(department.id);
                    setDepartmentTab("volontaires");
                  }
                }}
                role="button"
                tabIndex={0}
                className="group flex cursor-pointer items-center gap-3 rounded-2xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border dark:border-white/60 dark:bg-zinc-900"
              >
                <span className="icon-badge-hover flex h-[55px] w-[55px] flex-shrink-0 items-center justify-center rounded-full bg-primary text-white">
                  <Folder size={25} className="group-hover:animate-wiggle" />
                </span>
                <h2
                  className={`${glofters.className} ${titleSizeClass(department.name)} line-clamp-2 min-w-0 break-words leading-[0.9] text-foreground`}
                >
                  {department.name}
                </h2>
              </div>
            ))}
            {departments.length === 0 && (
              <p className="text-sm text-foreground/60">
                Aucun département pour l&apos;instant.
              </p>
            )}
          </div>
          <div className="flex flex-shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setShowStats(true)}
              aria-label="Statistiques"
              title="Statistiques"
              className="rounded-full p-2 text-foreground/50 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
            >
              <ChartColumnStacked size={18} />
            </button>
            {canWrite && (
              <>
                <button
                  type="button"
                  onClick={() => setShowBlacklistManager(true)}
                  aria-label="Liste noire"
                  title="Liste noire"
                  className="rounded-full p-2 text-foreground/50 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                >
                  <Ban size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowDepartmentSettings(true)}
                  aria-label="Gérer les départements"
                  title="Gérer les départements"
                  className="rounded-full p-2 text-foreground/50 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                >
                  <Settings size={18} />
                </button>
              </>
            )}
          </div>
        </div>

        {showStats && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setShowStats(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-y-auto rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900"
            >
              <h2 className="mb-3 font-semibold text-foreground">
                Statistiques
              </h2>
              <StatsPanel
                departments={departments}
                departmentLinks={departmentLinks}
                slots={slots}
                assignments={assignments}
                categorizedVolunteers={categorizedVolunteers}
              />
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowStats(false)}
                  className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {showBlacklistManager && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setShowBlacklistManager(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900"
            >
              <h2 className="mb-3 font-semibold text-foreground">
                Liste noire
              </h2>
              <BlacklistManager
                coordinationKey={coordinationKey}
                entries={blacklist}
                onChange={fetchAll}
              />
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowBlacklistManager(false)}
                  className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {showDepartmentSettings && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setShowDepartmentSettings(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900"
            >
              <h2 className="mb-3 font-semibold text-foreground">
                Gérer les départements
              </h2>
              <DepartmentManager
                coordinationKey={coordinationKey}
                year={year}
                departments={departments}
                onChange={fetchAll}
              />
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowDepartmentSettings(false)}
                  className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table
            className="w-full table-fixed text-left text-sm"
            style={{ minWidth: `${180 + departments.length * 80 + 320}px` }}
          >
            <colgroup>
              <col className="w-44" />
              {departments.map((d) => (
                <col key={d.id} className="w-20" />
              ))}
              <col className="w-16" />
              <col className="w-20" />
              <col className="w-20" />
              <col className="w-20" />
            </colgroup>
            <thead>
              <tr className="border-b border-black/[.08] text-foreground/60 dark:border-white/[.08]">
                <th className="py-2 pr-2 align-bottom font-medium">Nom</th>
                {departments.map((d) => (
                  <th
                    key={d.id}
                    className="whitespace-normal break-words px-1 py-2 text-center align-bottom font-medium"
                  >
                    {d.name}
                  </th>
                ))}
                <th className="px-1 py-2 text-center align-bottom font-medium">Total</th>
                <th className="whitespace-normal break-words px-1 py-2 text-center align-bottom font-medium">
                  Heures d&apos;absence
                </th>
                <th className="whitespace-normal break-words px-1 py-2 text-center align-bottom font-medium">
                  Heures confirmées
                </th>
                <th className="whitespace-normal break-words px-1 py-2 text-center align-bottom font-medium">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody>
              {categorizedVolunteers.map((v) => {
                const computedTotal = departments.reduce(
                  (sum, d) => sum + volunteerTotal(slots, assignments, d.id, v.id),
                  0,
                );
                const total = computedTotal + v.hours_adjustment;
                const absentHours = volunteerAbsentHours(
                  slots,
                  assignments,
                  v.id,
                );
                return (
                  <tr
                    key={v.id}
                    className="border-b border-black/[.06] odd:bg-black/[.015] dark:border-white/[.06] dark:odd:bg-white/[.03]"
                  >
                    <td
                      className={`py-2 pr-2 ${absentHours > 0 ? "text-red-600 dark:text-red-400" : "text-foreground"}`}
                    >
                      {marechalDisplayName(v)}
                      {v.player_email && (
                        <span className="block text-xs text-foreground/50">
                          {v.player_email}
                        </span>
                      )}
                    </td>
                    {departments.map((d) => (
                      <td
                        key={d.id}
                        className="px-1 py-2 text-center text-xs text-foreground/80"
                      >
                        {isInDepartment(v.id, d.id)
                          ? volunteerTotal(slots, assignments, d.id, v.id)
                          : "—"}
                      </td>
                    ))}
                    <td className="px-1 py-2 text-center font-medium text-foreground">
                      <input
                        type="number"
                        value={total}
                        disabled={!canWrite}
                        title={
                          v.hours_adjustment !== 0
                            ? `Ajusté manuellement (calculé : ${computedTotal})`
                            : undefined
                        }
                        onChange={(e) => {
                          const newTotal = Number(e.target.value);
                          setVolunteers((prev) =>
                            prev.map((x) =>
                              x.id === v.id
                                ? {
                                    ...x,
                                    hours_adjustment:
                                      newTotal - computedTotal,
                                  }
                                : x,
                            ),
                          );
                        }}
                        onBlur={(e) =>
                          handleAdjustTotal(
                            v,
                            computedTotal,
                            Number(e.target.value),
                          )
                        }
                        className={`w-14 rounded border bg-transparent px-1 py-0.5 text-center disabled:opacity-60 ${
                          v.hours_adjustment !== 0
                            ? "border-primary/40 text-primary"
                            : "border-transparent hover:border-black/[.08] dark:hover:border-white/[.145]"
                        }`}
                      />
                    </td>
                    <td
                      className={`px-1 py-2 text-center text-xs ${absentHours > 0 ? "font-medium text-red-600 dark:text-red-400" : "text-foreground/80"}`}
                    >
                      {absentHours}
                    </td>
                    <td className="px-1 py-2 text-center">
                      <BooleanDot
                        value={v.hours_confirmed}
                        onToggle={
                          canWrite
                            ? () => handleToggleStatus(v, "hours_confirmed")
                            : undefined
                        }
                      />
                    </td>
                    <td className="px-1 py-2 text-center">
                      {(() => {
                        const currentStatus =
                          reviewStatuses.get(v.character_id)?.status ?? null;
                        // Une coordination ne peut que signaler « À modifier »
                        // — seule la gestion centralisée peut marquer Fait ou
                        // Erratum.
                        const options: (VolunteerStatus | "")[] =
                          currentStatus && currentStatus !== "À modifier"
                            ? [currentStatus, "À modifier"]
                            : ["", "À modifier"];
                        return (
                          <select
                            value={currentStatus ?? ""}
                            disabled={!canWrite}
                            onChange={(e) =>
                              handleStatusReviewChange(
                                v,
                                (e.target.value ||
                                  null) as VolunteerStatus | null,
                              )
                            }
                            className={statusSelectClassName(currentStatus)}
                          >
                            {options.map((s) => (
                              <option key={s || "unset"} value={s}>
                                {s || "—"}
                              </option>
                            ))}
                          </select>
                        );
                      })()}
                    </td>
                  </tr>
                );
              })}
              {categorizedVolunteers.length === 0 && (
                <tr>
                  <td
                    colSpan={departments.length + 5}
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

  const department = departments.find((d) => d.id === view);
  if (!department) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">
        Département introuvable.
      </p>
    );
  }
  const departmentSlots = slots.filter((s) => s.department_id === department.id);
  const departmentVolunteers = volunteers.filter((v) =>
    isInDepartment(v.id, department.id),
  );
  const showTeamLead = TEAM_LEAD_DEPARTMENTS.has(department.name);

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
        <Folder size={20} className="text-primary" />
        <h2 className="text-xl font-semibold text-foreground">
          {department.name}
        </h2>
        <span className="text-sm text-foreground/60">
          — {departmentTotal(slots, assignments, department.id)} h au total
        </span>
      </div>

      <div className="flex gap-1 border-b border-black/[.08] dark:border-white/[.08]">
        {(
          [
            { key: "volontaires", label: "Volontaires", icon: Users },
            { key: "blocs", label: "Gestion des blocs", icon: Clock },
            { key: "absences", label: "Absences", icon: UserX },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setDepartmentTab(tab.key)}
            className={`flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
              departmentTab === tab.key
                ? "border-b-2 border-primary text-primary"
                : "text-foreground/60 hover:text-foreground"
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {departmentTab === "blocs" && canWrite && (
        <SlotManager
          coordinationKey={coordinationKey}
          year={year}
          departmentId={department.id}
          slots={slots}
          onChange={fetchAll}
        />
      )}

      {departmentTab === "volontaires" && (
        <>
          {canWrite && (
            <AddVolunteerSearch
              onAdd={(character) => handleAddVolunteer(character, department.id)}
              excludeIds={[
                ...departmentVolunteers.map((v) => v.character_id),
                ...blacklist.map((b) => b.character_id),
              ]}
            />
          )}

          <div className="overflow-x-auto">
            <table
              className="w-full table-fixed text-left text-sm"
              style={{
                minWidth: `${180 + departmentSlots.length * 96 + 144}px`,
              }}
            >
              <colgroup>
                <col className="w-44" />
                {departmentSlots.map((s) => (
                  <col key={s.id} className="w-24" />
                ))}
                <col className="w-16" />
                <col className="w-16" />
              </colgroup>
              <thead>
                <tr className="border-b border-black/[.08] text-foreground/60 dark:border-white/[.08]">
                  <th className="sticky left-0 top-0 z-20 bg-white py-2 pr-2 align-bottom font-medium dark:bg-zinc-900">
                    Nom
                  </th>
                  {departmentSlots.map((s, index) => (
                    <th
                      key={s.id}
                      className={`sticky top-0 z-10 whitespace-normal break-words bg-white px-1 py-2 text-center align-bottom font-medium dark:bg-zinc-900 ${slotGroupClassName(departmentSlots, index)}`}
                    >
                      <SlotCountBadge slot={s} assignments={assignments} />
                      <SlotLabel label={s.label} />
                    </th>
                  ))}
                  <th className="sticky top-0 z-10 bg-white px-1 py-2 text-center align-bottom font-medium dark:bg-zinc-900">
                    Total
                  </th>
                  <th className="sticky top-0 z-10 bg-white py-2 pr-2 font-medium dark:bg-zinc-900" />
                </tr>
              </thead>
              <tbody>
                {departmentVolunteers.map((v) => (
                  <tr
                    key={v.id}
                    className="border-b border-black/[.06] odd:bg-black/[.015] dark:border-white/[.06] dark:odd:bg-white/[.03]"
                  >
                    <td className="sticky left-0 z-10 bg-white py-2 pr-4 text-foreground dark:bg-zinc-900">
                      <span className="flex items-center gap-1.5">
                        {showTeamLead && (
                          <button
                            type="button"
                            disabled={!canWrite}
                            onClick={() =>
                              handleToggleTeamLead(v.id, department.id)
                            }
                            aria-label={
                              isTeamLead(v.id, department.id)
                                ? "Chef d'équipe"
                                : "Marquer comme chef d'équipe"
                            }
                            title={
                              isTeamLead(v.id, department.id)
                                ? "Chef d'équipe"
                                : "Marquer comme chef d'équipe"
                            }
                            className="picker-button flex-shrink-0 disabled:cursor-not-allowed"
                          >
                            <Star
                              size={14}
                              className={
                                isTeamLead(v.id, department.id)
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
                    {departmentSlots.map((s, index) => (
                      <td
                        key={s.id}
                        className={`px-1 py-2 text-center ${slotGroupClassName(departmentSlots, index)}`}
                      >
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
                    <td className="px-1 py-2 text-center font-medium text-foreground">
                      {volunteerTotal(slots, assignments, department.id, v.id)}
                    </td>
                    <td className="py-2 pr-2">
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

      {departmentTab === "absences" && (
        <div className="overflow-x-auto">
          <table
            className="w-full table-fixed text-left text-sm"
            style={{
              minWidth: `${180 + departmentSlots.length * 96}px`,
            }}
          >
            <colgroup>
              <col className="w-44" />
              {departmentSlots.map((s) => (
                <col key={s.id} className="w-24" />
              ))}
            </colgroup>
            <thead>
              <tr className="border-b border-black/[.08] text-foreground/60 dark:border-white/[.08]">
                <th className="sticky left-0 top-0 z-20 bg-white py-2 pr-2 align-bottom font-medium dark:bg-zinc-900">
                  Nom
                </th>
                {departmentSlots.map((s, index) => (
                  <th
                    key={s.id}
                    className={`sticky top-0 z-10 whitespace-normal break-words bg-white px-1 py-2 text-center align-bottom font-medium dark:bg-zinc-900 ${slotGroupClassName(departmentSlots, index)}`}
                  >
                    <SlotLabel label={s.label} />
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
                  <td className="sticky left-0 z-10 bg-white py-2 pr-2 text-foreground dark:bg-zinc-900">
                    {marechalDisplayName(v)}
                  </td>
                  {departmentSlots.map((s, index) => {
                    const assignment = assignments.find(
                      (a) => a.volunteer_id === v.id && a.slot_id === s.id,
                    );
                    return (
                      <td
                        key={s.id}
                        className={`px-1 py-2 text-center ${slotGroupClassName(departmentSlots, index)}`}
                      >
                        {assignment ? (
                          <input
                            type="checkbox"
                            disabled={!canWrite}
                            checked={assignment.absent}
                            aria-label="Absent"
                            title="Absent"
                            onChange={(e) =>
                              handleToggleAbsence(
                                v.id,
                                s.id,
                                e.target.checked,
                              )
                            }
                            className="h-4 w-4 accent-red-500 disabled:cursor-not-allowed"
                          />
                        ) : (
                          <span className="text-foreground/30">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {departmentVolunteers.length === 0 && (
                <tr>
                  <td
                    colSpan={departmentSlots.length + 1}
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
