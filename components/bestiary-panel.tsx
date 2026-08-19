"use client";

import { Feather, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  BESTIARY_STATUSES,
  createCreature,
  DANGER_LEVELS,
  deleteCreature,
  listCreatures,
  setCreatureStatus,
  updateCreature,
  type BestiaryCreature,
  type BestiaryCreatureInput,
  type BestiaryStatus,
  type DangerLevel,
} from "@/lib/bestiary";
import { getModuleAccessLevels } from "@/lib/features";
import { getOwnProfile } from "@/lib/profile";

const inputClassName =
  "rounded border border-black/[.08] bg-white px-2 py-1 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800";
const labelClassName = "text-xs font-medium text-foreground/50";

const DANGER_STYLES: Record<DangerLevel, string> = {
  Faible: "bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-400",
  "Modéré":
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-400",
  "Élevé":
    "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-400",
  Mortel: "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400",
};

const STATUS_STYLES: Record<BestiaryStatus, string> = {
  en_attente:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-400",
  approuve:
    "bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-400",
};

function statusSelectClassName(status: BestiaryStatus): string {
  return `rounded border border-transparent px-1 py-0.5 text-xs hover:border-black/[.08] focus:border-black/[.15] focus:outline-none dark:hover:border-white/[.145] dark:focus:border-white/[.25] ${STATUS_STYLES[status]}`;
}

const EMPTY_FORM: BestiaryCreatureInput = {
  name: "",
  description: null,
  danger_level: "Faible",
  special_rules: null,
  notes: null,
};

function toFormState(c: BestiaryCreature): BestiaryCreatureInput {
  return {
    name: c.name,
    description: c.description,
    danger_level: c.danger_level,
    special_rules: c.special_rules,
    notes: c.notes,
  };
}

function CreatureModal({
  initial,
  onClose,
  onSubmit,
}: {
  initial?: BestiaryCreature;
  onClose: () => void;
  onSubmit: (input: BestiaryCreatureInput) => Promise<void>;
}) {
  const [form, setForm] = useState<BestiaryCreatureInput>(
    initial ? toFormState(initial) : EMPTY_FORM,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const set = <K extends keyof BestiaryCreatureInput>(
    key: K,
    value: BestiaryCreatureInput[K],
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
          <h2 className="font-semibold text-foreground">
            {initial ? "Modifier la créature" : "Nouvelle créature"}
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
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className={inputClassName}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className={labelClassName}>Niveau de danger</span>
          <select
            value={form.danger_level}
            onChange={(e) =>
              set("danger_level", e.target.value as DangerLevel)
            }
            className={inputClassName}
          >
            {DANGER_LEVELS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <span className={labelClassName}>Description / apparence</span>
          <textarea
            value={form.description ?? ""}
            onChange={(e) => set("description", e.target.value || null)}
            rows={3}
            className={inputClassName}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className={labelClassName}>
            Comportement / règles spéciales
          </span>
          <textarea
            value={form.special_rules ?? ""}
            onChange={(e) => set("special_rules", e.target.value || null)}
            rows={3}
            className={inputClassName}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className={labelClassName}>Notes internes</span>
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

export default function BestiaryPanel({ moduleKey }: { moduleKey: string }) {
  const [creatures, setCreatures] = useState<BestiaryCreature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [canWrite, setCanWrite] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCreature, setEditingCreature] =
    useState<BestiaryCreature | null>(null);

  const fetchAll = async () => {
    setIsLoading(true);
    setCreatures(await listCreatures());
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
  }, [moduleKey]);

  const handleCreate = async (input: BestiaryCreatureInput) => {
    try {
      const created = await createCreature(input);
      setCreatures((prev) => [created, ...prev]);
      setShowCreateModal(false);
    } catch {
      alert("Échec de la création.");
    }
  };

  const handleUpdate = async (input: BestiaryCreatureInput) => {
    if (!editingCreature) return;
    try {
      await updateCreature(editingCreature.id, input);
      setCreatures((prev) =>
        prev.map((c) =>
          c.id === editingCreature.id ? { ...c, ...input } : c,
        ),
      );
      setEditingCreature(null);
    } catch {
      alert("Échec de la mise à jour.");
    }
  };

  const handleStatusChange = async (
    creature: BestiaryCreature,
    status: BestiaryStatus,
  ) => {
    setCreatures((prev) =>
      prev.map((c) => (c.id === creature.id ? { ...c, status } : c)),
    );
    if (!canWrite) return;
    try {
      await setCreatureStatus(creature.id, status);
    } catch {
      alert("Échec de la mise à jour.");
      fetchAll();
    }
  };

  const handleDelete = async (creature: BestiaryCreature) => {
    if (!canWrite) return;
    if (!window.confirm(`Supprimer « ${creature.name} » du bestiaire ?`))
      return;
    setCreatures((prev) => prev.filter((c) => c.id !== creature.id));
    try {
      await deleteCreature(creature.id);
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
          {creatures.length} créature{creatures.length > 1 ? "s" : ""}
        </p>
        {canWrite && (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390]"
          >
            <Plus size={16} />
            Nouvelle créature
          </button>
        )}
      </div>

      {creatures.length === 0 && (
        <p className="text-sm text-foreground/60">
          Aucune créature pour l&apos;instant.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {creatures.map((c) => (
          <div
            key={c.id}
            className="rounded-xl border border-black/[.06] p-4 dark:border-white/[.06]"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="flex items-center gap-2 font-medium text-foreground">
                  {c.name}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${DANGER_STYLES[c.danger_level]}`}
                  >
                    {c.danger_level}
                  </span>
                </p>
                {c.description && (
                  <p className="mt-1 text-sm text-foreground/70">
                    {c.description}
                  </p>
                )}
                {c.special_rules && (
                  <p className="mt-1 text-xs text-foreground/50">
                    Règles spéciales : {c.special_rules}
                  </p>
                )}
                {c.notes && (
                  <p className="mt-1 text-xs text-foreground/50">
                    Notes : {c.notes}
                  </p>
                )}
              </div>
              <div className="flex flex-shrink-0 items-center gap-1">
                <select
                  value={c.status}
                  disabled={!canWrite}
                  onChange={(e) =>
                    handleStatusChange(c, e.target.value as BestiaryStatus)
                  }
                  className={statusSelectClassName(c.status)}
                >
                  {BESTIARY_STATUSES.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
                {canWrite && (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditingCreature(c)}
                      aria-label="Modifier"
                      className="rounded-full p-1.5 text-foreground/50 hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                    >
                      <Feather size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(c)}
                      aria-label="Supprimer"
                      className="rounded-full p-1.5 text-foreground/50 hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showCreateModal && (
        <CreatureModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
        />
      )}
      {editingCreature && (
        <CreatureModal
          initial={editingCreature}
          onClose={() => setEditingCreature(null)}
          onSubmit={handleUpdate}
        />
      )}
    </div>
  );
}
