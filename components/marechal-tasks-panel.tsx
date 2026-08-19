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
import { GripVertical } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import { downloadBlob } from "@/lib/activity-docx-export";
import { listActivityChapters, type ActivityChapter } from "@/lib/activity-chapters";
import {
  createMarechalTask,
  deleteMarechalTask,
  listAllMarechalTasks,
  updateMarechalTask,
  type MarechalTask,
} from "@/lib/marechal-tasks";
import { exportTasksGridToDocx } from "@/lib/marechal-tasks-grid-docx-export";
import {
  listAssignedMarechalIdsByActivity,
  listMarechalActivityStatuses,
  marechalDisplayName,
  reorderMarechalActivityStatuses,
  setMarechalScheduleSlot,
  type Marechal,
  type MarechalActivityStatus,
  type MarechalScheduleSlot,
} from "@/lib/marechaux";

type ActivityLike = { id: string; name: string };

const gridCellInputClassName =
  "w-full border-0 bg-transparent px-3 py-2.5 text-sm text-foreground focus:bg-black/[.04] focus:outline-none disabled:opacity-60 dark:focus:bg-white/[.08]";

export default function MarechalTasksPanel({
  activity,
  marechaux,
  canWrite,
}: {
  activity: ActivityLike;
  marechaux: Marechal[];
  canWrite: boolean;
}) {
  const [tasks, setTasks] = useState<MarechalTask[]>([]);
  const [chapters, setChapters] = useState<ActivityChapter[]>([]);
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<MarechalActivityStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [allTasks, chapterList, assignedMap, statusList] =
          await Promise.all([
            listAllMarechalTasks(),
            listActivityChapters(activity.id),
            listAssignedMarechalIdsByActivity(),
            listMarechalActivityStatuses(activity.id),
          ]);
        setTasks(allTasks.filter((t) => t.activity_id === activity.id));
        setChapters(chapterList);
        setAssignedIds(assignedMap[activity.id] ?? []);
        setStatuses(statusList);
      } catch {
        setError("Impossible de charger la grille.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, [activity.id]);

  const positionFor = (marechalId: string): number =>
    statuses.find((s) => s.marechal_id === marechalId)?.position ?? 0;

  const rows = marechaux
    .filter((m) => assignedIds.includes(m.id))
    .sort((a, b) => {
      if (a.is_campaign_team !== b.is_campaign_team) {
        return a.is_campaign_team ? 1 : -1;
      }
      const posDiff = positionFor(a.id) - positionFor(b.id);
      if (posDiff !== 0) return posDiff;
      return marechalDisplayName(a).localeCompare(marechalDisplayName(b), "fr");
    });

  const firstCampaignTeamIndex = rows.findIndex((m) => m.is_campaign_team);

  const handleExportDocx = async () => {
    try {
      const blob = await exportTasksGridToDocx({
        activityName: activity.name,
        chapters,
        rows,
        statuses,
        tasks,
        firstCampaignTeamIndex,
        marechalDisplayName,
      });
      downloadBlob(blob, `Tâches — ${activity.name}.docx`);
    } catch {
      alert("Échec de l'export Word.");
    }
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
    const fromIndex = rows.findIndex((m) => m.id === active.id);
    const toIndex = rows.findIndex((m) => m.id === over.id);
    if (fromIndex === -1 || toIndex === -1) return;
    const reordered = arrayMove(rows, fromIndex, toIndex);
    const positionByMarechalId = new Map(
      reordered.map((m, index) => [m.id, index]),
    );
    setStatuses((prev) =>
      prev.map((s) =>
        positionByMarechalId.has(s.marechal_id)
          ? { ...s, position: positionByMarechalId.get(s.marechal_id)! }
          : s,
      ),
    );
    reorderMarechalActivityStatuses(
      reordered.map((m, index) => ({
        marechal_id: m.id,
        activity_id: activity.id,
        position: index,
      })),
    ).catch(() => {
      alert("Échec de la réorganisation.");
    });
  };

  const cellKey = (marechalId: string, chapterId: string) =>
    `${marechalId}:${chapterId}`;

  const cellTask = (
    marechalId: string,
    chapterId: string,
  ): MarechalTask | undefined =>
    tasks.find(
      (t) => t.assigned_marechal_id === marechalId && t.chapter_id === chapterId,
    );

  const cellValue = (marechalId: string, chapterId: string): string => {
    const key = cellKey(marechalId, chapterId);
    if (key in drafts) return drafts[key];
    return cellTask(marechalId, chapterId)?.label ?? "";
  };

  const handleCellChange = (
    marechalId: string,
    chapterId: string,
    value: string,
  ) => {
    setDrafts((prev) => ({ ...prev, [cellKey(marechalId, chapterId)]: value }));
  };

  const handleCellBlur = async (marechalId: string, chapterId: string) => {
    if (!canWrite) return;
    const key = cellKey(marechalId, chapterId);
    if (!(key in drafts)) return;
    const value = drafts[key].trim();
    const existing = cellTask(marechalId, chapterId);

    setDrafts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    if (existing && value === existing.label) return;

    try {
      if (existing && value) {
        await updateMarechalTask(existing.id, { label: value });
        setTasks((prev) =>
          prev.map((t) => (t.id === existing.id ? { ...t, label: value } : t)),
        );
      } else if (existing && !value) {
        await deleteMarechalTask(existing.id);
        setTasks((prev) => prev.filter((t) => t.id !== existing.id));
      } else if (!existing && value) {
        const created = await createMarechalTask({
          chapter_id: chapterId,
          label: value,
          task_type_id: null,
          is_ramassage: false,
          assigned_marechal_id: marechalId,
        });
        setTasks((prev) => [...prev, created]);
      }
    } catch {
      alert("Échec de l'enregistrement.");
    }
  };

  const slotKey = (marechalId: string, slot: MarechalScheduleSlot) =>
    `hom:${slot}:${marechalId}`;

  const slotDefault = (slot: MarechalScheduleSlot): string =>
    slot === "briefing_7h45" || slot === "briefing_17h" ? "2e garage" : "";

  const slotValue = (
    marechalId: string,
    slot: MarechalScheduleSlot,
  ): string => {
    const key = slotKey(marechalId, slot);
    if (key in drafts) return drafts[key];
    return (
      statuses.find((s) => s.marechal_id === marechalId)?.[slot] ??
      slotDefault(slot)
    );
  };

  const handleSlotChange = (
    marechalId: string,
    slot: MarechalScheduleSlot,
    value: string,
  ) => {
    setDrafts((prev) => ({ ...prev, [slotKey(marechalId, slot)]: value }));
  };

  const handleSlotBlur = async (
    marechalId: string,
    slot: MarechalScheduleSlot,
  ) => {
    if (!canWrite) return;
    const key = slotKey(marechalId, slot);
    if (!(key in drafts)) return;
    const value = drafts[key].trim();

    setDrafts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    try {
      await setMarechalScheduleSlot(marechalId, activity.id, slot, value || null);
      setStatuses((prev) => {
        const existing = prev.find((s) => s.marechal_id === marechalId);
        if (existing) {
          return prev.map((s) =>
            s.marechal_id === marechalId ? { ...s, [slot]: value || null } : s,
          );
        }
        return [
          ...prev,
          {
            marechal_id: marechalId,
            activity_id: activity.id,
            is_available: false,
            is_assigned: false,
            is_confirmed: false,
            is_registered: false,
            briefing_7h45: null,
            homologation_8h9h: null,
            homologation_9h10h: null,
            briefing_17h: null,
            position: 0,
            [slot]: value || null,
          },
        ];
      });
    } catch {
      alert("Échec de l'enregistrement.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={handleExportDocx}
          className="flex items-center gap-1.5 rounded-full border border-black/[.08] px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
        >
          Exporter en Word
        </button>
      </div>

      {isLoading && <p className="text-sm text-foreground/60">Chargement…</p>}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {!isLoading && !error && rows.length === 0 && (
        <p className="text-sm text-foreground/60">
          Aucun maréchal assigné pour l&apos;instant.
        </p>
      )}

      {!isLoading && !error && rows.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={rows.map((m) => m.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] table-fixed border-collapse border border-black/[.15] text-left text-sm dark:border-white/[.15]">
                <colgroup>
                  <col className="w-8" />
                  <col className="w-40" />
                  <col className="w-32" />
                  <col className="w-32" />
                  <col className="w-32" />
                  {chapters.map((c) => (
                    <col key={c.id} className="w-32" />
                  ))}
                  <col className="w-32" />
                </colgroup>
                <thead>
                  <tr className="bg-black/[.04] dark:bg-white/[.06]">
                    <th className="border border-black/[.15] px-2 py-3 dark:border-white/[.15]" />
                    <th className="border border-black/[.15] px-3 py-3 font-semibold text-foreground dark:border-white/[.15]">
                      Maréchal
                    </th>
                    <th className="border border-black/[.15] px-3 py-3 font-semibold text-foreground dark:border-white/[.15]">
                      Briefing
                      <span className="block text-xs font-normal text-foreground/50">
                        2e du garage
                      </span>
                    </th>
                    <th className="border border-black/[.15] px-3 py-3 font-semibold text-foreground dark:border-white/[.15]">
                      Homologation
                      <span className="block text-xs font-normal text-foreground/50">
                        8h-9h
                      </span>
                    </th>
                    <th className="border border-black/[.15] px-3 py-3 font-semibold text-foreground dark:border-white/[.15]">
                      Homologation
                      <span className="block text-xs font-normal text-foreground/50">
                        9h-10h
                      </span>
                    </th>
                    {chapters.map((c) => (
                      <th
                        key={c.id}
                        className="border border-black/[.15] px-3 py-3 font-semibold text-foreground dark:border-white/[.15]"
                      >
                        {c.title}
                        {c.battlefields.map((b) => (
                          <span
                            key={b.id}
                            className="block text-xs font-normal text-foreground/50"
                          >
                            {b.name}
                          </span>
                        ))}
                      </th>
                    ))}
                    <th className="border border-black/[.15] px-3 py-3 font-semibold text-foreground dark:border-white/[.15]">
                      Debriefing
                      <span className="block text-xs font-normal text-foreground/50">
                        2e du garage
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((m, index) => (
                    <Fragment key={m.id}>
                      {index === firstCampaignTeamIndex &&
                        firstCampaignTeamIndex > 0 && (
                          <tr>
                            <td
                              colSpan={6 + chapters.length}
                              className="border-t-2 border-black/[.15] bg-black/[.03] px-3 py-2 text-xs font-medium uppercase tracking-wide text-foreground/50 dark:border-white/[.2] dark:bg-white/[.05]"
                            >
                              Équipe campagne
                            </td>
                          </tr>
                        )}
                      <SortableMarechalRow marechal={m} canWrite={canWrite}>
                        <td className="border border-black/[.1] px-3 py-2.5 font-medium text-foreground dark:border-white/[.1]">
                          {marechalDisplayName(m)}
                        </td>
                        <td className="border border-black/[.1] p-0 dark:border-white/[.1]">
                          <input
                            type="text"
                            value={slotValue(m.id, "briefing_7h45")}
                            disabled={!canWrite}
                            onChange={(e) =>
                              handleSlotChange(m.id, "briefing_7h45", e.target.value)
                            }
                            onBlur={() => handleSlotBlur(m.id, "briefing_7h45")}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") e.currentTarget.blur();
                            }}
                            className={gridCellInputClassName}
                          />
                        </td>
                        <td className="border border-black/[.1] p-0 dark:border-white/[.1]">
                          <input
                            type="text"
                            value={slotValue(m.id, "homologation_8h9h")}
                            disabled={!canWrite}
                            onChange={(e) =>
                              handleSlotChange(
                                m.id,
                                "homologation_8h9h",
                                e.target.value,
                              )
                            }
                            onBlur={() => handleSlotBlur(m.id, "homologation_8h9h")}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") e.currentTarget.blur();
                            }}
                            className={gridCellInputClassName}
                          />
                        </td>
                        <td className="border border-black/[.1] p-0 dark:border-white/[.1]">
                          <input
                            type="text"
                            value={slotValue(m.id, "homologation_9h10h")}
                            disabled={!canWrite}
                            onChange={(e) =>
                              handleSlotChange(
                                m.id,
                                "homologation_9h10h",
                                e.target.value,
                              )
                            }
                            onBlur={() => handleSlotBlur(m.id, "homologation_9h10h")}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") e.currentTarget.blur();
                            }}
                            className={gridCellInputClassName}
                          />
                        </td>
                        {chapters.map((c) => (
                          <td
                            key={c.id}
                            className="border border-black/[.1] p-0 dark:border-white/[.1]"
                          >
                            <input
                              type="text"
                              value={cellValue(m.id, c.id)}
                              disabled={!canWrite}
                              onChange={(e) =>
                                handleCellChange(m.id, c.id, e.target.value)
                              }
                              onBlur={() => handleCellBlur(m.id, c.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") e.currentTarget.blur();
                              }}
                              className={gridCellInputClassName}
                            />
                          </td>
                        ))}
                        <td className="border border-black/[.1] p-0 dark:border-white/[.1]">
                          <input
                            type="text"
                            value={slotValue(m.id, "briefing_17h")}
                            disabled={!canWrite}
                            onChange={(e) =>
                              handleSlotChange(m.id, "briefing_17h", e.target.value)
                            }
                            onBlur={() => handleSlotBlur(m.id, "briefing_17h")}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") e.currentTarget.blur();
                            }}
                            className={gridCellInputClassName}
                          />
                        </td>
                      </SortableMarechalRow>
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function SortableMarechalRow({
  marechal,
  canWrite,
  children,
}: {
  marechal: Marechal;
  canWrite: boolean;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: marechal.id, disabled: !canWrite });

  return (
    <tr
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`bg-white dark:bg-zinc-900 ${
        isDragging ? "relative z-10 opacity-50" : ""
      }`}
    >
      <td className="border border-black/[.1] px-2 py-1 dark:border-white/[.1]">
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
      {children}
    </tr>
  );
}
