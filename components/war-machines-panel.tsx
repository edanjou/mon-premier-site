"use client";

import { Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { getModuleAccessLevels } from "@/lib/features";
import { getOwnProfile } from "@/lib/profile";
import {
  createWarMachine,
  deleteWarMachine,
  listWarMachines,
  MACHINE_TYPES,
  setWarMachineStatus,
  WAR_MACHINE_STATUSES,
  type WarMachine,
  type WarMachineInput,
  type WarMachineStatus,
} from "@/lib/war-machines";

const inputClassName =
  "rounded border border-black/[.08] bg-white px-2 py-1 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800";
const cellInputClassName =
  "w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-foreground hover:border-black/[.08] focus:border-black/[.15] focus:bg-white focus:outline-none dark:hover:border-white/[.145] dark:focus:border-white/[.25] dark:focus:bg-zinc-800";
const labelClassName = "text-xs font-medium text-foreground/50";

const STATUS_STYLES: Record<WarMachineStatus, string> = {
  en_attente:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-400",
  approuve:
    "bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-400",
};

function statusSelectClassName(status: WarMachineStatus): string {
  return `rounded border border-transparent px-1 py-0.5 text-xs hover:border-black/[.08] focus:border-black/[.15] focus:outline-none dark:hover:border-white/[.145] dark:focus:border-white/[.25] ${STATUS_STYLES[status]}`;
}

const EMPTY_FORM: WarMachineInput = {
  name: "",
  machine_type: "Canon",
  owner: "",
  description: null,
};

function WarMachineCreateModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (input: WarMachineInput) => Promise<void>;
}) {
  const [form, setForm] = useState<WarMachineInput>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const set = <K extends keyof WarMachineInput>(
    key: K,
    value: WarMachineInput[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.owner.trim()) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        ...form,
        name: form.name.trim(),
        owner: form.owner.trim(),
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
        className="flex max-h-[90vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">
            Nouvelle machine de guerre
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
          <span className={labelClassName}>Type</span>
          <div className="flex gap-2">
            {MACHINE_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set("machine_type", t)}
                className={`flex-1 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  form.machine_type === t
                    ? "border-primary bg-primary text-white"
                    : "border-black/[.08] bg-white text-foreground hover:bg-black/[.04] dark:border-white/[.145] dark:bg-zinc-800 dark:hover:bg-white/[.08]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className={labelClassName}>Propriétaire / Guilde</span>
          <input
            type="text"
            value={form.owner}
            onChange={(e) => set("owner", e.target.value)}
            className={inputClassName}
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className={labelClassName}>Description</span>
          <textarea
            value={form.description ?? ""}
            onChange={(e) => set("description", e.target.value || null)}
            rows={3}
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

export default function WarMachinesPanel({
  moduleKey,
}: {
  moduleKey: string;
}) {
  const [machines, setMachines] = useState<WarMachine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [canWrite, setCanWrite] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchAll = async () => {
    setIsLoading(true);
    setMachines(await listWarMachines());
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

  const handleCreate = async (input: WarMachineInput) => {
    try {
      const created = await createWarMachine(input);
      setMachines((prev) => [created, ...prev]);
      setShowCreateModal(false);
    } catch {
      alert("Échec de la création.");
    }
  };

  const handleStatusChange = async (
    machine: WarMachine,
    status: WarMachineStatus,
  ) => {
    setMachines((prev) =>
      prev.map((m) => (m.id === machine.id ? { ...m, status } : m)),
    );
    if (!canWrite) return;
    try {
      await setWarMachineStatus(machine.id, status);
    } catch {
      alert("Échec de la mise à jour.");
      fetchAll();
    }
  };

  const handleDelete = async (machine: WarMachine) => {
    if (!canWrite) return;
    if (!window.confirm(`Supprimer « ${machine.name} » du registre ?`))
      return;
    setMachines((prev) => prev.filter((m) => m.id !== machine.id));
    try {
      await deleteWarMachine(machine.id);
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
          {machines.length} machine{machines.length > 1 ? "s" : ""}
        </p>
        {canWrite && (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390]"
          >
            <Plus size={16} />
            Nouvelle machine
          </button>
        )}
      </div>

      {machines.length === 0 && (
        <p className="text-sm text-foreground/60">
          Aucune machine de guerre pour l&apos;instant.
        </p>
      )}

      {machines.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-black/[.08] dark:border-white/[.145]">
                <th className="px-2 py-2 font-medium">Nom</th>
                <th className="px-2 py-2 font-medium">Type</th>
                <th className="px-2 py-2 font-medium">Propriétaire</th>
                <th className="px-2 py-2 font-medium">Description</th>
                <th className="px-2 py-2 font-medium">Statut</th>
                {canWrite && <th className="px-2 py-2 font-medium" />}
              </tr>
            </thead>
            <tbody>
              {machines.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-black/[.04] dark:border-white/[.06]"
                >
                  <td className="px-2 py-2 font-medium text-foreground">
                    {m.name}
                  </td>
                  <td className="px-2 py-2">{m.machine_type}</td>
                  <td className="px-2 py-2">{m.owner}</td>
                  <td className="px-2 py-2 max-w-xs">
                    <span className={`${cellInputClassName} block truncate`}>
                      {m.description ?? ""}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={m.status}
                      disabled={!canWrite}
                      onChange={(e) =>
                        handleStatusChange(
                          m,
                          e.target.value as WarMachineStatus,
                        )
                      }
                      className={statusSelectClassName(m.status)}
                    >
                      {WAR_MACHINE_STATUSES.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  {canWrite && (
                    <td className="px-2 py-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleDelete(m)}
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
        <WarMachineCreateModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
        />
      )}
    </div>
  );
}
