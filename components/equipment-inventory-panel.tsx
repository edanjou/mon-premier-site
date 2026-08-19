"use client";

import { Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  createEquipmentItem,
  deleteEquipmentItem,
  EQUIPMENT_CONDITIONS,
  listEquipmentItems,
  updateEquipmentItem,
  type EquipmentCondition,
  type EquipmentItem,
  type EquipmentItemInput,
} from "@/lib/equipment-inventory";
import { getModuleAccessLevels } from "@/lib/features";
import { getOwnProfile } from "@/lib/profile";

const inputClassName =
  "rounded border border-black/[.08] bg-white px-2 py-1 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800";
const cellInputClassName =
  "w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-foreground hover:border-black/[.08] focus:border-black/[.15] focus:bg-white focus:outline-none dark:hover:border-white/[.145] dark:focus:border-white/[.25] dark:focus:bg-zinc-800";
const labelClassName = "text-xs font-medium text-foreground/50";

const CONDITION_STYLES: Record<EquipmentCondition, string> = {
  Bon: "bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-400",
  "Endommagé":
    "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-400",
  "À réparer":
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-400",
  Perdu: "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400",
};

function conditionSelectClassName(condition: EquipmentCondition): string {
  return `rounded border border-transparent px-1 py-0.5 text-xs hover:border-black/[.08] focus:border-black/[.15] focus:outline-none dark:hover:border-white/[.145] dark:focus:border-white/[.25] ${CONDITION_STYLES[condition]}`;
}

const EMPTY_FORM: EquipmentItemInput = {
  name: "",
  quantity: 1,
  condition: "Bon",
  notes: null,
};

function toFormState(item: EquipmentItem): EquipmentItemInput {
  return {
    name: item.name,
    quantity: item.quantity,
    condition: item.condition,
    notes: item.notes,
  };
}

function EquipmentCreateModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (input: EquipmentItemInput) => Promise<void>;
}) {
  const [form, setForm] = useState<EquipmentItemInput>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const set = <K extends keyof EquipmentItemInput>(
    key: K,
    value: EquipmentItemInput[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setIsSubmitting(true);
    try {
      await onSubmit({ ...form, name: form.name.trim() });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="flex max-h-[90vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Nouvel item</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full p-1 hover:bg-black/[.04] dark:hover:bg-white/[.08]"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <span className={labelClassName}>Nom</span>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className={inputClassName}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <span className={labelClassName}>Quantité</span>
            <input
              type="number"
              min={0}
              value={form.quantity}
              onChange={(e) => set("quantity", Number(e.target.value))}
              className={inputClassName}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className={labelClassName}>État</span>
            <select
              value={form.condition}
              onChange={(e) =>
                set("condition", e.target.value as EquipmentCondition)
              }
              className={inputClassName}
            >
              {EQUIPMENT_CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className={labelClassName}>Notes</span>
          <textarea
            value={form.notes ?? ""}
            onChange={(e) => set("notes", e.target.value || null)}
            rows={2}
            className={inputClassName}
          />
        </div>

        <div className="mt-1 flex justify-end gap-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function EquipmentInventoryPanel({
  coordinationKey,
  moduleKey,
}: {
  coordinationKey: string;
  moduleKey: string;
}) {
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [canWrite, setCanWrite] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchAll = async () => {
    setIsLoading(true);
    setItems(await listEquipmentItems(coordinationKey));
    setIsLoading(false);
  };

  useEffect(() => {
    getOwnProfile().then((profile) => {
      if (!profile) return;
      getModuleAccessLevels(profile).then((levels) => {
        setCanWrite(levels[moduleKey] === "ecriture");
      });
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchAll sets a loading flag ahead of an async fetch
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchAll/moduleKey stable for a given coordinationKey
  }, [coordinationKey]);

  const handleCreate = async (input: EquipmentItemInput) => {
    try {
      const created = await createEquipmentItem(coordinationKey, input);
      setItems((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setShowCreateModal(false);
    } catch {
      alert("Échec de la création.");
    }
  };

  const handleFieldChange = <K extends keyof EquipmentItemInput>(
    item: EquipmentItem,
    field: K,
    value: EquipmentItemInput[K],
  ) => {
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, [field]: value } : i)),
    );
  };

  const handleFieldSave = async (itemId: string) => {
    if (!canWrite) return;
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    try {
      await updateEquipmentItem(item.id, toFormState(item));
    } catch {
      alert("Échec de la mise à jour.");
      fetchAll();
    }
  };

  const handleConditionChange = async (
    item: EquipmentItem,
    condition: EquipmentCondition,
  ) => {
    const updated = { ...item, condition };
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    if (!canWrite) return;
    try {
      await updateEquipmentItem(item.id, toFormState(updated));
    } catch {
      alert("Échec de la mise à jour.");
      fetchAll();
    }
  };

  const handleDelete = async (item: EquipmentItem) => {
    if (!canWrite) return;
    if (!window.confirm(`Supprimer « ${item.name} » de l'inventaire ?`))
      return;
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    try {
      await deleteEquipmentItem(item.id);
    } catch {
      alert("Échec de la suppression.");
      fetchAll();
    }
  };

  if (isLoading) return <p className="text-sm text-foreground/60">Chargement…</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-foreground/60">
          {items.length} item{items.length > 1 ? "s" : ""}
        </p>
        {canWrite && (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390]"
          >
            <Plus size={16} />
            Nouvel item
          </button>
        )}
      </div>

      {items.length === 0 && (
        <p className="text-sm text-foreground/60">
          Aucun item dans l&apos;inventaire.
        </p>
      )}

      {items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-black/[.08] dark:border-white/[.145]">
                <th className="px-2 py-2 font-medium">Nom</th>
                <th className="px-2 py-2 font-medium">Quantité</th>
                <th className="px-2 py-2 font-medium">État</th>
                <th className="px-2 py-2 font-medium">Notes</th>
                {canWrite && <th className="px-2 py-2 font-medium" />}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-black/[.04] dark:border-white/[.06]"
                >
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={item.name}
                      disabled={!canWrite}
                      onChange={(e) =>
                        handleFieldChange(item, "name", e.target.value)
                      }
                      onBlur={() => handleFieldSave(item.id)}
                      className={`${cellInputClassName} w-40 font-medium`}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min={0}
                      value={item.quantity}
                      disabled={!canWrite}
                      onChange={(e) =>
                        handleFieldChange(
                          item,
                          "quantity",
                          Number(e.target.value),
                        )
                      }
                      onBlur={() => handleFieldSave(item.id)}
                      className={`${cellInputClassName} w-14`}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={item.condition}
                      disabled={!canWrite}
                      onChange={(e) =>
                        handleConditionChange(
                          item,
                          e.target.value as EquipmentCondition,
                        )
                      }
                      className={conditionSelectClassName(item.condition)}
                    >
                      {EQUIPMENT_CONDITIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={item.notes ?? ""}
                      disabled={!canWrite}
                      onChange={(e) =>
                        handleFieldChange(
                          item,
                          "notes",
                          e.target.value || null,
                        )
                      }
                      onBlur={() => handleFieldSave(item.id)}
                      className={`${cellInputClassName} w-48`}
                    />
                  </td>
                  {canWrite && (
                    <td className="px-2 py-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        aria-label="Supprimer"
                        className="rounded-full p-1.5 text-foreground/50 hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <EquipmentCreateModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
        />
      )}
    </div>
  );
}
