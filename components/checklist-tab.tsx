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
  Check,
  Copy,
  Feather,
  GripVertical,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  CHECKLIST_ASSIGNEE_STYLES,
  CHECKLIST_ASSIGNEE_UNSET_STYLE,
  CHECKLIST_ASSIGNEES,
  CHECKLIST_TYPE_STYLES,
  CHECKLIST_TYPE_UNSET_STYLE,
  CHECKLIST_TYPES,
  createChecklistItem,
  deleteChecklistItem,
  deleteCompletedChecklistItems,
  listChecklistItems,
  reorderChecklistItems,
  updateChecklistItem,
  type ChecklistAssignee,
  type ChecklistItem,
  type ChecklistType,
} from "@/lib/grandes-batailles-checklist";

function assigneeSelectClassName(assignedTo: string | null): string {
  const style =
    assignedTo && assignedTo in CHECKLIST_ASSIGNEE_STYLES
      ? CHECKLIST_ASSIGNEE_STYLES[assignedTo as ChecklistAssignee]
      : CHECKLIST_ASSIGNEE_UNSET_STYLE;
  return `flex-shrink-0 rounded border border-black/[.08] px-2 py-1 text-xs font-medium dark:border-white/[.145] ${style}`;
}

function typeSelectClassName(taskType: string | null): string {
  const style =
    taskType && taskType in CHECKLIST_TYPE_STYLES
      ? CHECKLIST_TYPE_STYLES[taskType as ChecklistType]
      : CHECKLIST_TYPE_UNSET_STYLE;
  return `flex-shrink-0 rounded border border-black/[.08] px-2 py-1 text-xs font-medium dark:border-white/[.145] ${style}`;
}

function SortableChecklistItem({
  item,
  canWrite,
  showMeta,
  showPrompt,
  isEditing,
  editingLabel,
  onEditingLabelChange,
  onToggle,
  onAssigneeChange,
  onTypeChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onOpenPrompt,
}: {
  item: ChecklistItem;
  canWrite: boolean;
  showMeta: boolean;
  showPrompt: boolean;
  isEditing: boolean;
  editingLabel: string;
  onEditingLabelChange: (value: string) => void;
  onToggle: (item: ChecklistItem) => void;
  onAssigneeChange: (item: ChecklistItem, value: string | null) => void;
  onTypeChange: (item: ChecklistItem, value: string | null) => void;
  onStartEdit: (item: ChecklistItem) => void;
  onCancelEdit: () => void;
  onSaveEdit: (item: ChecklistItem) => void;
  onDelete: (item: ChecklistItem) => void;
  onOpenPrompt: (item: ChecklistItem) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, disabled: !canWrite });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 rounded-lg border border-black/[.06] px-3 py-2 dark:border-white/[.06] ${
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
        type="checkbox"
        checked={item.done}
        onChange={() => onToggle(item)}
        disabled={isEditing || !canWrite}
        className="h-4 w-4 flex-shrink-0 accent-primary disabled:cursor-not-allowed"
      />
      {isEditing ? (
        <>
          <input
            type="text"
            autoFocus
            value={editingLabel}
            onChange={(e) => onEditingLabelChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSaveEdit(item);
              } else if (e.key === "Escape") {
                onCancelEdit();
              }
            }}
            className="flex-1 rounded border border-black/[.08] bg-white px-2 py-1 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
          />
          {showMeta && (
            <>
              <select
                value={item.task_type ?? ""}
                onChange={(e) => onTypeChange(item, e.target.value || null)}
                className={typeSelectClassName(item.task_type)}
              >
                <option value="">Type…</option>
                {CHECKLIST_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <select
                value={item.assigned_to ?? ""}
                onChange={(e) => onAssigneeChange(item, e.target.value || null)}
                className={assigneeSelectClassName(item.assigned_to)}
              >
                <option value="">—</option>
                {CHECKLIST_ASSIGNEES.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </>
          )}
          <button
            type="button"
            onClick={() => onSaveEdit(item)}
            aria-label="Enregistrer"
            className="rounded-full p-1.5 text-foreground/50 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
          >
            <Check size={14} />
          </button>
          <button
            type="button"
            onClick={onCancelEdit}
            aria-label="Annuler"
            className="rounded-full p-1.5 text-foreground/50 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
          >
            <X size={14} />
          </button>
        </>
      ) : (
        <>
          <span
            className={`flex-1 text-sm ${
              item.done ? "text-foreground/40 line-through" : "text-foreground"
            }`}
          >
            {item.label}
          </span>
          {showMeta && (
            <>
              <select
                value={item.task_type ?? ""}
                onChange={(e) => onTypeChange(item, e.target.value || null)}
                disabled={!canWrite}
                className={`${typeSelectClassName(item.task_type)} disabled:opacity-60`}
              >
                <option value="">Type…</option>
                {CHECKLIST_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <select
                value={item.assigned_to ?? ""}
                onChange={(e) => onAssigneeChange(item, e.target.value || null)}
                disabled={!canWrite}
                className={`${assigneeSelectClassName(item.assigned_to)} disabled:opacity-60`}
              >
                <option value="">—</option>
                {CHECKLIST_ASSIGNEES.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </>
          )}
          {showPrompt && (
            <button
              type="button"
              onClick={() => onOpenPrompt(item)}
              aria-label={item.prompt ? "Voir le prompt" : "Ajouter un prompt"}
              title={item.prompt ? "Voir le prompt" : "Ajouter un prompt"}
              className={`flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-1.5 text-xs font-medium transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08] ${
                item.prompt ? "text-primary" : "text-foreground/40"
              }`}
            >
              <Sparkles size={14} />
              Prompt
            </button>
          )}
          {canWrite && (
            <>
              <button
                type="button"
                onClick={() => onStartEdit(item)}
                aria-label="Modifier"
                className="rounded-full p-1.5 text-foreground/50 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
              >
                <Feather size={14} />
              </button>
              <button
                type="button"
                onClick={() => onDelete(item)}
                aria-label="Supprimer"
                className="rounded-full p-1.5 text-foreground/50 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}

function PromptModal({
  item,
  canWrite,
  onClose,
  onSave,
}: {
  item: ChecklistItem;
  canWrite: boolean;
  onClose: () => void;
  onSave: (item: ChecklistItem, prompt: string) => Promise<void>;
}) {
  const [value, setValue] = useState(item.prompt ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      alert("Échec de la copie.");
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(item, value);
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
        className="flex max-h-[85vh] w-full max-w-lg flex-col gap-3 overflow-y-auto rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">{item.label}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full p-1 hover:bg-black/[.04] dark:hover:bg-white/[.08]"
          >
            <X size={20} />
          </button>
        </div>
        <textarea
          autoFocus
          readOnly={!canWrite}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Écris ici ce que tu veux demander à l'IA…"
          rows={10}
          className="rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
        />
        <div className="mt-1 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!value}
            className="flex items-center gap-1.5 rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
          >
            <Copy size={14} />
            {copied ? "Copié !" : "Copier"}
          </button>
          {canWrite && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
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

export default function ChecklistTab({
  listKey,
  canWrite,
  showMeta = true,
  showPrompt = false,
}: {
  listKey: string;
  canWrite: boolean;
  showMeta?: boolean;
  showPrompt?: boolean;
}) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [promptItem, setPromptItem] = useState<ChecklistItem | null>(null);

  const fetchAll = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setItems(await listChecklistItems(listKey));
    } catch {
      setError("Impossible de charger la liste.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchAll sets a loading flag ahead of an async fetch
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchAll is stable for a given listKey
  }, [listKey]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite || !newLabel.trim()) return;
    setIsSubmitting(true);
    try {
      const created = await createChecklistItem(listKey, newLabel.trim());
      setItems((prev) => [...prev, created]);
      setNewLabel("");
    } catch {
      alert("Échec de l'ajout.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (item: ChecklistItem) => {
    if (!canWrite) return;
    const nextDone = !item.done;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, done: nextDone } : i)),
    );
    try {
      await updateChecklistItem(item.id, { done: nextDone });
    } catch {
      alert("Échec de la mise à jour.");
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, done: !nextDone } : i)),
      );
    }
  };

  const handleAssigneeChange = async (
    item: ChecklistItem,
    assignedTo: string | null,
  ) => {
    if (!canWrite) return;
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, assigned_to: assignedTo } : i,
      ),
    );
    try {
      await updateChecklistItem(item.id, { assigned_to: assignedTo });
    } catch {
      alert("Échec de la mise à jour.");
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, assigned_to: item.assigned_to } : i,
        ),
      );
    }
  };

  const handleTypeChange = async (
    item: ChecklistItem,
    taskType: string | null,
  ) => {
    if (!canWrite) return;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, task_type: taskType } : i)),
    );
    try {
      await updateChecklistItem(item.id, { task_type: taskType });
    } catch {
      alert("Échec de la mise à jour.");
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, task_type: item.task_type } : i,
        ),
      );
    }
  };

  const handleStartEdit = (item: ChecklistItem) => {
    if (!canWrite) return;
    setEditingId(item.id);
    setEditingLabel(item.label);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingLabel("");
  };

  const handleSaveEdit = async (item: ChecklistItem) => {
    const label = editingLabel.trim();
    if (!label) return;
    setEditingId(null);
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, label } : i)),
    );
    try {
      await updateChecklistItem(item.id, { label });
    } catch {
      alert("Échec de la mise à jour.");
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, label: item.label } : i)),
      );
    }
  };

  const handleDelete = async (item: ChecklistItem) => {
    if (!canWrite) return;
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    try {
      await deleteChecklistItem(item.id);
    } catch {
      alert("Échec de la suppression.");
      fetchAll();
    }
  };

  const handleSavePrompt = async (item: ChecklistItem, prompt: string) => {
    const nextPrompt = prompt.trim() || null;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, prompt: nextPrompt } : i)),
    );
    setPromptItem(null);
    try {
      await updateChecklistItem(item.id, { prompt: nextPrompt });
    } catch {
      alert("Échec de l'enregistrement.");
      fetchAll();
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const visibleItems = [...items].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return a.position - b.position;
  });

  const handleDragEnd = (event: DragEndEvent) => {
    if (!canWrite) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = visibleItems.findIndex((i) => i.id === active.id);
    const toIndex = visibleItems.findIndex((i) => i.id === over.id);
    if (fromIndex === -1 || toIndex === -1) return;
    const reordered = arrayMove(visibleItems, fromIndex, toIndex);
    const positionByKey = new Map(
      reordered.map((item, index) => [item.id, index]),
    );
    setItems((prev) =>
      prev.map((i) => ({
        ...i,
        position: positionByKey.get(i.id) ?? i.position,
      })),
    );
    reorderChecklistItems(
      reordered.map((item, index) => ({ id: item.id, position: index })),
    ).catch(() => {
      alert("Échec de la réorganisation.");
      fetchAll();
    });
  };

  const handleClearCompleted = async () => {
    if (!canWrite) return;
    if (!window.confirm("Supprimer toutes les tâches complétées ?")) return;
    const remaining = items.filter((i) => !i.done);
    setItems(remaining);
    try {
      await deleteCompletedChecklistItems(listKey);
    } catch {
      alert("Échec de la suppression.");
      fetchAll();
    }
  };

  const doneCount = items.filter((i) => i.done).length;

  return (
    <div className="flex flex-col gap-4">
      {canWrite && (
        <form onSubmit={handleAdd} className="flex items-center gap-2">
          <input
            type="text"
            name="checklist-item-label"
            autoComplete="off"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Ajouter un élément…"
            className="flex-1 rounded-full border border-black/[.08] bg-white px-4 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
          />
          <button
            type="submit"
            disabled={isSubmitting || !newLabel.trim()}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus size={16} />
            Ajouter
          </button>
        </form>
      )}

      {isLoading && <p className="text-sm text-foreground/60">Chargement…</p>}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {!isLoading && !error && items.length === 0 && (
        <p className="text-sm text-foreground/60">
          Aucun élément pour l&apos;instant.
        </p>
      )}

      {!isLoading && !error && items.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={visibleItems.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-1">
              {visibleItems.map((item) => (
                <SortableChecklistItem
                  key={item.id}
                  item={item}
                  canWrite={canWrite}
                  showMeta={showMeta}
                  showPrompt={showPrompt}
                  isEditing={editingId === item.id}
                  editingLabel={editingLabel}
                  onEditingLabelChange={setEditingLabel}
                  onToggle={handleToggle}
                  onAssigneeChange={handleAssigneeChange}
                  onTypeChange={handleTypeChange}
                  onStartEdit={handleStartEdit}
                  onCancelEdit={handleCancelEdit}
                  onSaveEdit={handleSaveEdit}
                  onDelete={handleDelete}
                  onOpenPrompt={setPromptItem}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {canWrite && doneCount > 0 && (
        <div>
          <button
            type="button"
            onClick={handleClearCompleted}
            className="text-xs text-foreground/50 hover:underline"
          >
            Supprimer les {doneCount} tâche{doneCount > 1 ? "s" : ""}{" "}
            complétée{doneCount > 1 ? "s" : ""}
          </button>
        </div>
      )}

      {promptItem && (
        <PromptModal
          item={promptItem}
          canWrite={canWrite}
          onClose={() => setPromptItem(null)}
          onSave={handleSavePrompt}
        />
      )}
    </div>
  );
}
