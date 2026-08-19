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
  CalendarClock,
  Copy,
  Feather,
  GripVertical,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import RequireFeature from "@/components/require-feature";
import { getModuleAccessLevels } from "@/lib/features";
import {
  createHomologationSchedule,
  deleteHomologationSchedule,
  deleteRegistration,
  listHomologationSchedules,
  listHomologationSlots,
  listRegistrationsForSlots,
  saveHomologationSlots,
  updateHomologationSchedule,
  type HomologationRegistration,
  type HomologationSchedule,
  type HomologationSlot,
} from "@/lib/homologation";
import { getOwnProfile } from "@/lib/profile";
import { listQuartiers, type Quartier } from "@/lib/quartiers";

function formatScheduleDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(t: string | null): string {
  return t ? t.slice(0, 5) : "";
}

function ScheduleModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: HomologationSchedule;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [date, setDate] = useState(initial?.date ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      if (initial) {
        await updateHomologationSchedule(initial.id, { name, date });
      } else {
        await createHomologationSchedule({ name, date });
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
          {initial ? "Modifier l'horaire" : "Créer un horaire"}
        </h2>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom (ex. Homologation 2026)"
          className="rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
        />
        <input
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
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

const slotFieldClassName =
  "rounded border border-black/[.08] bg-white px-2 py-1.5 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800";

type SlotFormRow = HomologationSlot & { key: string };

function SortableSlotRow({
  row,
  quartiers,
  canWrite,
  onUpdate,
  onRemove,
}: {
  row: SlotFormRow;
  quartiers: Quartier[];
  canWrite: boolean;
  onUpdate: (
    key: string,
    field: "quartier_id" | "start_time" | "end_time" | "capacity",
    value: string,
  ) => void;
  onRemove: (key: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.key, disabled: !canWrite });

  return (
    <tr
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`border-t border-black/[.06] dark:border-white/[.08] ${
        isDragging ? "relative z-10 opacity-50" : ""
      }`}
    >
      <td className="px-3 py-2">
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
      </td>
      <td className="px-3 py-2">
        <select
          value={row.quartier_id}
          onChange={(e) => onUpdate(row.key, "quartier_id", e.target.value)}
          disabled={!canWrite}
          className={`w-full ${slotFieldClassName} disabled:opacity-60`}
        >
          <option value="">Choisir un quartier…</option>
          {quartiers.map((q) => (
            <option key={q.id} value={q.id}>
              {q.name}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2">
        <input
          type="time"
          value={row.start_time ?? ""}
          onChange={(e) => onUpdate(row.key, "start_time", e.target.value)}
          disabled={!canWrite}
          className={`${slotFieldClassName} disabled:opacity-60`}
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="time"
          value={row.end_time ?? ""}
          onChange={(e) => onUpdate(row.key, "end_time", e.target.value)}
          disabled={!canWrite}
          className={`${slotFieldClassName} disabled:opacity-60`}
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          min={0}
          value={row.capacity}
          onChange={(e) => onUpdate(row.key, "capacity", e.target.value)}
          disabled={!canWrite}
          title="Nombre de places pour l'inscription mobile"
          className={`w-16 ${slotFieldClassName} disabled:opacity-60`}
        />
      </td>
      <td className="px-3 py-2 text-right">
        {canWrite && (
          <button
            type="button"
            onClick={() => onRemove(row.key)}
            aria-label="Retirer"
            className="text-foreground/50 hover:text-foreground"
          >
            <X size={14} />
          </button>
        )}
      </td>
    </tr>
  );
}

function SlotsModal({
  schedule,
  canWrite,
  onClose,
}: {
  schedule: HomologationSchedule;
  canWrite: boolean;
  onClose: () => void;
}) {
  const [quartiers, setQuartiers] = useState<Quartier[]>([]);
  const [rows, setRows] = useState<SlotFormRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listQuartiers(), listHomologationSlots(schedule.id)])
      .then(([quartierList, slots]) => {
        setQuartiers(quartierList);
        setRows(slots.map((s) => ({ ...s, key: s.id })));
      })
      .finally(() => setIsLoading(false));
  }, [schedule.id]);

  const addRow = () => {
    if (!canWrite) return;
    setRows((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        id: crypto.randomUUID(),
        quartier_id: "",
        start_time: "",
        end_time: "",
        capacity: 10,
        position: prev.length,
      },
    ]);
  };

  const updateRow = (
    key: string,
    field: "quartier_id" | "start_time" | "end_time" | "capacity",
    value: string,
  ) => {
    if (!canWrite) return;
    setRows((prev) =>
      prev.map((r) =>
        r.key === key
          ? {
              ...r,
              [field]: field === "capacity" ? Number(value) : value,
            }
          : r,
      ),
    );
  };

  const removeRow = (key: string) => {
    if (!canWrite) return;
    setRows((prev) => prev.filter((r) => r.key !== key));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    if (!canWrite) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setRows((prev) => {
      const fromIndex = prev.findIndex((r) => r.key === active.id);
      const toIndex = prev.findIndex((r) => r.key === over.id);
      if (fromIndex === -1 || toIndex === -1) return prev;
      return arrayMove(prev, fromIndex, toIndex);
    });
  };

  const handleSave = async () => {
    if (!canWrite) return;
    setError(null);
    if (rows.some((r) => !r.quartier_id)) {
      setError("Choisis un quartier pour chaque créneau.");
      return;
    }
    setIsSaving(true);
    try {
      await saveHomologationSlots(
        schedule.id,
        rows.map((r, index) => ({
          quartier_id: r.quartier_id,
          start_time: r.start_time || null,
          end_time: r.end_time || null,
          capacity: r.capacity,
          position: index,
        })),
      );
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
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col gap-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">
            Créneaux — {schedule.name}
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

        {isLoading ? (
          <p className="text-sm text-foreground/60">Chargement…</p>
        ) : quartiers.length === 0 ? (
          <p className="text-sm text-foreground/60">
            Aucun quartier défini — gère-les depuis la section
            &quot;Quartiers&quot; de la page Paramètres.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <table className="w-full min-w-[500px] text-left text-sm">
                  <thead>
                    <tr className="text-foreground/60">
                      <th className="px-3 py-2 font-medium" />
                      <th className="px-3 py-2 font-medium">Quartier</th>
                      <th className="px-3 py-2 font-medium">Début</th>
                      <th className="px-3 py-2 font-medium">Fin</th>
                      <th className="px-3 py-2 font-medium">Places</th>
                      <th className="px-3 py-2 font-medium" />
                    </tr>
                  </thead>
                  <SortableContext
                    items={rows.map((r) => r.key)}
                    strategy={verticalListSortingStrategy}
                  >
                    <tbody>
                      {rows.map((row) => (
                        <SortableSlotRow
                          key={row.key}
                          row={row}
                          quartiers={quartiers}
                          canWrite={canWrite}
                          onUpdate={updateRow}
                          onRemove={removeRow}
                        />
                      ))}
                    </tbody>
                  </SortableContext>
                </table>
              </DndContext>
              {rows.length === 0 && (
                <p className="py-3 text-sm text-foreground/60">
                  Aucun créneau pour l&apos;instant.
                </p>
              )}
            </div>

            {canWrite && (
              <button
                type="button"
                onClick={addRow}
                className="flex items-center justify-center gap-2 self-start rounded-full border border-black/[.08] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
              >
                <Plus size={14} />
                Ajouter un créneau
              </button>
            )}
          </>
        )}

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="flex justify-end gap-2 border-t border-black/[.08] pt-3 dark:border-white/[.08]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
          >
            Fermer
          </button>
          {canWrite && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "…" : "Enregistrer"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function HomologationInscriptionsContent() {
  const [schedules, setSchedules] = useState<HomologationSchedule[]>([]);
  const [slotsBySchedule, setSlotsBySchedule] = useState<
    Record<string, HomologationSlot[]>
  >({});
  const [registrations, setRegistrations] = useState<
    HomologationRegistration[]
  >([]);
  const [quartiers, setQuartiers] = useState<Quartier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [canWrite, setCanWrite] = useState(false);
  const [copied, setCopied] = useState(false);
  const [publicUrl, setPublicUrl] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] =
    useState<HomologationSchedule | null>(null);
  const [slotsSchedule, setSlotsSchedule] =
    useState<HomologationSchedule | null>(null);

  const fetchAll = async () => {
    setIsLoading(true);
    const [scheduleList, quartierList] = await Promise.all([
      listHomologationSchedules(),
      listQuartiers(),
    ]);
    const slotLists = await Promise.all(
      scheduleList.map((s) => listHomologationSlots(s.id)),
    );
    const bySchedule: Record<string, HomologationSlot[]> = {};
    scheduleList.forEach((s, index) => {
      bySchedule[s.id] = slotLists[index];
    });
    const allSlotIds = slotLists.flat().map((s) => s.id);
    const regs = await listRegistrationsForSlots(allSlotIds);
    setSchedules(scheduleList);
    setSlotsBySchedule(bySchedule);
    setRegistrations(regs);
    setQuartiers(quartierList);
    setIsLoading(false);
  };

  useEffect(() => {
    getOwnProfile().then((profile) => {
      if (!profile) return;
      getModuleAccessLevels(profile).then((levels) => {
        setCanWrite(levels["homologation"] === "ecriture");
      });
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- static value derived from window, only known client-side
    setPublicUrl(`${window.location.origin}/inscription-homologation`);
    fetchAll();
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      alert("Échec de la copie.");
    }
  };

  const handleDeleteRegistration = async (
    registration: HomologationRegistration,
  ) => {
    if (!canWrite) return;
    if (
      !window.confirm(
        `Retirer l'inscription de « ${registration.character_name} » ?`,
      )
    )
      return;
    setRegistrations((prev) => prev.filter((r) => r.id !== registration.id));
    try {
      await deleteRegistration(registration.id);
    } catch {
      alert("Échec de la suppression.");
      fetchAll();
    }
  };

  const handleDeleteSchedule = async (schedule: HomologationSchedule) => {
    if (!canWrite) return;
    if (!window.confirm(`Supprimer l'horaire "${schedule.name}" ?`)) return;
    try {
      await deleteHomologationSchedule(schedule.id);
      setSchedules((prev) => prev.filter((s) => s.id !== schedule.id));
    } catch {
      alert("Échec de la suppression.");
    }
  };

  const quartierName = (id: string) =>
    quartiers.find((q) => q.id === id)?.name ?? "?";

  return (
    <div>
      <h1 className={`${glofters.className} text-3xl text-foreground`}>
        Inscription mobile — Homologation
      </h1>
      <Breadcrumb />

      <div className="mt-8 flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-foreground/60">
            Lien à partager avec les joueurs pour s&apos;inscrire depuis leur
            téléphone.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-full border border-black/[.08] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
            >
              <Copy size={14} />
              {copied ? "Copié !" : "Copier le lien"}
            </button>
            {canWrite && (
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#0c4390]"
              >
                <Plus size={14} />
                Créer un horaire
              </button>
            )}
          </div>
        </div>

        {isLoading && (
          <p className="text-sm text-foreground/60">Chargement…</p>
        )}

        {!isLoading && schedules.length === 0 && (
          <p className="text-sm text-foreground/60">
            Aucun horaire d&apos;homologation pour l&apos;instant.
          </p>
        )}

        {!isLoading &&
          schedules.map((schedule) => {
            const scheduleSlots = slotsBySchedule[schedule.id] ?? [];
            return (
              <div key={schedule.id} className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-semibold text-foreground">
                    {schedule.name} — {formatScheduleDate(schedule.date)}
                  </h2>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSlotsSchedule(schedule)}
                      className="flex items-center gap-1.5 rounded-full border border-black/[.08] px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
                    >
                      <CalendarClock size={14} />
                      Créneaux
                    </button>
                    {canWrite && (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditingSchedule(schedule)}
                          aria-label="Modifier"
                          className="rounded-full p-2 text-foreground/60 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                        >
                          <Feather size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSchedule(schedule)}
                          aria-label="Supprimer"
                          className="rounded-full p-2 text-foreground/60 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {scheduleSlots.length === 0 ? (
                  <p className="text-sm text-foreground/60">
                    Aucun créneau — clique sur &quot;Créneaux&quot; pour en
                    ajouter.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {scheduleSlots.map((slot) => {
                      const slotRegs = registrations.filter(
                        (r) => r.slot_id === slot.id,
                      );
                      return (
                        <div
                          key={slot.id}
                          className="rounded-xl border border-black/[.06] p-3 dark:border-white/[.06]"
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-foreground">
                              {quartierName(slot.quartier_id)} —{" "}
                              {formatTime(slot.start_time)}–
                              {formatTime(slot.end_time)}
                            </p>
                            <p className="text-xs text-foreground/50">
                              {slotRegs.length}/{slot.capacity}
                            </p>
                          </div>
                          {slotRegs.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {slotRegs.map((r) => (
                                <span
                                  key={r.id}
                                  className="flex items-center gap-1 rounded-full border border-black/[.08] py-1 pl-3 pr-1 text-xs text-foreground dark:border-white/[.145]"
                                >
                                  {r.character_name}
                                  {canWrite && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDeleteRegistration(r)
                                      }
                                      aria-label="Retirer"
                                      className="rounded-full p-1 text-foreground/50 hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  )}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {isCreateOpen && (
        <ScheduleModal
          onClose={() => setIsCreateOpen(false)}
          onSaved={fetchAll}
        />
      )}
      {editingSchedule && (
        <ScheduleModal
          initial={editingSchedule}
          onClose={() => setEditingSchedule(null)}
          onSaved={fetchAll}
        />
      )}
      {slotsSchedule && (
        <SlotsModal
          schedule={slotsSchedule}
          canWrite={canWrite}
          onClose={() => {
            setSlotsSchedule(null);
            fetchAll();
          }}
        />
      )}
    </div>
  );
}

export default function HomologationInscriptionsPage() {
  return (
    <RequireFeature feature="homologation">
      <HomologationInscriptionsContent />
    </RequireFeature>
  );
}
