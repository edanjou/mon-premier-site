"use client";

import { ArrowDown, ArrowUp, Feather, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  addConsumableCount,
  createConsumable,
  deleteConsumable,
  deleteConsumableCount,
  listConsumables,
  listCountsForConsumables,
  updateConsumable,
  type EquipmentConsumable,
  type EquipmentConsumableCount,
  type EquipmentConsumableInput,
} from "@/lib/equipment-consumables";
import { getModuleAccessLevels } from "@/lib/features";
import { getOwnProfile } from "@/lib/profile";

const inputClassName =
  "rounded border border-black/[.08] bg-white px-2 py-1 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800";
const labelClassName = "text-xs font-medium text-foreground/50";

function formatDate(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

function ConsumableModal({
  initial,
  onClose,
  onSubmit,
}: {
  initial?: EquipmentConsumable;
  onClose: () => void;
  onSubmit: (input: EquipmentConsumableInput) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !color.trim()) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        color: color.trim(),
        notes: notes.trim() || null,
      });
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
        className="flex w-full max-w-sm flex-col gap-3 rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">
            {initial ? "Modifier" : "Nouveau consommable"}
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

        <div className="flex flex-col gap-1">
          <span className={labelClassName}>Nom</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex. Étiquette d'arme"
            className={inputClassName}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className={labelClassName}>Couleur</span>
          <input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="Ex. Rouge"
            className={inputClassName}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className={labelClassName}>Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
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

function AddCountForm({
  onAdd,
}: {
  onAdd: (date: string, quantity: number) => Promise<void>;
}) {
  const [date, setDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [quantity, setQuantity] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || quantity === "") return;
    setIsSubmitting(true);
    try {
      await onAdd(date, Number(quantity));
      setQuantity("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className={`${inputClassName} text-xs`}
      />
      <input
        type="number"
        min={0}
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        placeholder="Quantité"
        className={`${inputClassName} w-24 text-xs`}
      />
      <button
        type="submit"
        disabled={isSubmitting || !date || quantity === ""}
        className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-[#0c4390] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Plus size={12} />
        Compter
      </button>
    </form>
  );
}

export default function EquipmentConsumablesPanel({
  coordinationKey,
  moduleKey,
}: {
  coordinationKey: string;
  moduleKey: string;
}) {
  const [consumables, setConsumables] = useState<EquipmentConsumable[]>([]);
  const [counts, setCounts] = useState<EquipmentConsumableCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [canWrite, setCanWrite] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingConsumable, setEditingConsumable] =
    useState<EquipmentConsumable | null>(null);

  const fetchAll = async () => {
    setIsLoading(true);
    const list = await listConsumables(coordinationKey);
    const countList = await listCountsForConsumables(list.map((c) => c.id));
    setConsumables(list);
    setCounts(countList);
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

  const handleCreate = async (input: EquipmentConsumableInput) => {
    try {
      const created = await createConsumable(coordinationKey, input);
      setConsumables((prev) =>
        [...prev, created].sort(
          (a, b) => a.name.localeCompare(b.name) || a.color.localeCompare(b.color),
        ),
      );
      setShowCreateModal(false);
    } catch {
      alert("Échec de la création.");
    }
  };

  const handleUpdate = async (input: EquipmentConsumableInput) => {
    if (!editingConsumable) return;
    try {
      await updateConsumable(editingConsumable.id, input);
      setConsumables((prev) =>
        prev
          .map((c) => (c.id === editingConsumable.id ? { ...c, ...input } : c))
          .sort(
            (a, b) =>
              a.name.localeCompare(b.name) || a.color.localeCompare(b.color),
          ),
      );
      setEditingConsumable(null);
    } catch {
      alert("Échec de la mise à jour.");
    }
  };

  const handleDeleteConsumable = async (consumable: EquipmentConsumable) => {
    if (!canWrite) return;
    if (
      !window.confirm(
        `Supprimer « ${consumable.name} (${consumable.color}) » et tout son historique ?`,
      )
    )
      return;
    setConsumables((prev) => prev.filter((c) => c.id !== consumable.id));
    setCounts((prev) => prev.filter((c) => c.consumable_id !== consumable.id));
    try {
      await deleteConsumable(consumable.id);
    } catch {
      alert("Échec de la suppression.");
      fetchAll();
    }
  };

  const handleAddCount = async (
    consumableId: string,
    date: string,
    quantity: number,
  ) => {
    if (!canWrite) return;
    try {
      const created = await addConsumableCount(consumableId, {
        date,
        quantity,
      });
      setCounts((prev) =>
        [...prev, created].sort((a, b) => (a.date < b.date ? 1 : -1)),
      );
    } catch {
      alert("Échec de l'ajout du compte.");
    }
  };

  const handleDeleteCount = async (count: EquipmentConsumableCount) => {
    if (!canWrite) return;
    setCounts((prev) => prev.filter((c) => c.id !== count.id));
    try {
      await deleteConsumableCount(count.id);
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
          {consumables.length} consommable{consumables.length > 1 ? "s" : ""}
        </p>
        {canWrite && (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390]"
          >
            <Plus size={16} />
            Nouveau consommable
          </button>
        )}
      </div>

      {consumables.length === 0 && (
        <p className="text-sm text-foreground/60">
          Aucun consommable pour l&apos;instant.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {consumables.map((c) => {
          const history = counts
            .filter((x) => x.consumable_id === c.id)
            .sort((a, b) => (a.date < b.date ? 1 : -1));
          const latest = history[0];
          return (
            <div
              key={c.id}
              className="rounded-xl border border-black/[.06] p-4 dark:border-white/[.06]"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">
                    {c.name}{" "}
                    <span className="text-sm font-normal text-foreground/60">
                      — {c.color}
                    </span>
                  </p>
                  {c.notes && (
                    <p className="text-xs text-foreground/50">{c.notes}</p>
                  )}
                  {latest && (
                    <p className="mt-1 text-xs text-foreground/50">
                      Dernier compte : {latest.quantity} le{" "}
                      {formatDate(latest.date)}
                    </p>
                  )}
                </div>
                {canWrite && (
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingConsumable(c)}
                      aria-label="Modifier"
                      className="rounded-full p-1.5 text-foreground/50 hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                    >
                      <Feather size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteConsumable(c)}
                      aria-label="Supprimer"
                      className="rounded-full p-1.5 text-foreground/50 hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              {history.length > 0 && (
                <div className="mt-3 flex flex-col gap-1">
                  {history.map((entry, index) => {
                    const older = history[index + 1];
                    const delta = older ? entry.quantity - older.quantity : null;
                    return (
                      <div
                        key={entry.id}
                        className="flex items-center gap-2 text-xs"
                      >
                        <span className="w-20 text-foreground/60">
                          {formatDate(entry.date)}
                        </span>
                        <span className="w-14 font-medium text-foreground">
                          {entry.quantity}
                        </span>
                        {delta !== null && delta !== 0 && (
                          <span
                            className={`flex items-center gap-0.5 ${
                              delta < 0
                                ? "text-red-600 dark:text-red-400"
                                : "text-green-600 dark:text-green-400"
                            }`}
                          >
                            {delta < 0 ? (
                              <ArrowDown size={11} />
                            ) : (
                              <ArrowUp size={11} />
                            )}
                            {Math.abs(delta)}
                          </span>
                        )}
                        {canWrite && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCount(entry)}
                            aria-label="Supprimer ce compte"
                            className="rounded-full p-1 text-foreground/40 hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                          >
                            <X size={11} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {canWrite && (
                <div className="mt-3">
                  <AddCountForm
                    onAdd={(date, quantity) =>
                      handleAddCount(c.id, date, quantity)
                    }
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showCreateModal && (
        <ConsumableModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
        />
      )}
      {editingConsumable && (
        <ConsumableModal
          initial={editingConsumable}
          onClose={() => setEditingConsumable(null)}
          onSubmit={handleUpdate}
        />
      )}
    </div>
  );
}
