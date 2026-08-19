"use client";

import { Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  listEventCoordinations,
  type EventCoordination,
} from "@/lib/event-coordinations";
import { getModuleAccessLevels } from "@/lib/features";
import {
  createRadio,
  deleteRadio,
  listRadios,
  updateRadio,
  type RadioEntry,
  type RadioInput,
} from "@/lib/radios";
import { getOwnProfile } from "@/lib/profile";

const inputClassName =
  "rounded border border-black/[.08] bg-white px-2 py-1 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800";
const cellInputClassName =
  "w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-foreground hover:border-black/[.08] focus:border-black/[.15] focus:bg-white focus:outline-none dark:hover:border-white/[.145] dark:focus:border-white/[.25] dark:focus:bg-zinc-800";
const labelClassName = "text-xs font-medium text-foreground/50";

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
      className="dot-button p-1"
    >
      <span className={className} />
    </button>
  );
}

const EMPTY_FORM: RadioInput = {
  number: 0,
  headset_dure: false,
  headset_p2t: false,
  headset_agent: false,
  channel_prive: false,
  channel_batt_spare: false,
  event_coordination_id: null,
  last_name: "",
  first_name: "",
  notes: null,
};

function toFormState(r: RadioEntry): RadioInput {
  return {
    number: r.number,
    headset_dure: r.headset_dure,
    headset_p2t: r.headset_p2t,
    headset_agent: r.headset_agent,
    channel_prive: r.channel_prive,
    channel_batt_spare: r.channel_batt_spare,
    event_coordination_id: r.event_coordination_id,
    last_name: r.last_name,
    first_name: r.first_name,
    notes: r.notes,
  };
}

function RadioCreateModal({
  eventCoordinations,
  onClose,
  onSubmit,
}: {
  eventCoordinations: EventCoordination[];
  onClose: () => void;
  onSubmit: (input: RadioInput) => Promise<void>;
}) {
  const [form, setForm] = useState<RadioInput>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const set = <K extends keyof RadioInput>(key: K, value: RadioInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.number) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        ...form,
        last_name: form.last_name.trim(),
        first_name: form.first_name.trim(),
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
        className="flex max-h-[90vh] w-full max-w-lg flex-col gap-3 overflow-y-auto rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Nouvelle radio</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full p-1 hover:bg-black/[.04] dark:hover:bg-white/[.08]"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <span className={labelClassName}>Numéro</span>
            <input
              type="number"
              value={form.number || ""}
              onChange={(e) => set("number", Number(e.target.value))}
              className={inputClassName}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className={labelClassName}>Coordination</span>
            <select
              value={form.event_coordination_id ?? ""}
              onChange={(e) =>
                set("event_coordination_id", e.target.value || null)
              }
              className={inputClassName}
            >
              <option value="">Choisir…</option>
              {eventCoordinations.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <span className={labelClassName}>Nom de famille</span>
            <input
              type="text"
              value={form.last_name}
              onChange={(e) => set("last_name", e.target.value)}
              className={inputClassName}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className={labelClassName}>Prénom</span>
            <input
              type="text"
              value={form.first_name}
              onChange={(e) => set("first_name", e.target.value)}
              className={inputClassName}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className={labelClassName}>Type d&apos;oreillette/micro</span>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={form.headset_dure}
                onChange={(e) => set("headset_dure", e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Dure
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={form.headset_p2t}
                onChange={(e) => set("headset_p2t", e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              P2T
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={form.headset_agent}
                onChange={(e) => set("headset_agent", e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Agent
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className={labelClassName}>Canaux</span>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={form.channel_prive}
                onChange={(e) => set("channel_prive", e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Privé
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={form.channel_batt_spare}
                onChange={(e) => set("channel_batt_spare", e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Batt. Spare
            </label>
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

export default function RadiosPanel({
  coordinationKey,
  moduleKey,
}: {
  coordinationKey: string;
  moduleKey: string;
}) {
  const [radios, setRadios] = useState<RadioEntry[]>([]);
  const [eventCoordinations, setEventCoordinations] = useState<
    EventCoordination[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [canWrite, setCanWrite] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchAll = async () => {
    setIsLoading(true);
    const [r, c] = await Promise.all([
      listRadios(coordinationKey),
      listEventCoordinations(),
    ]);
    setRadios(r);
    setEventCoordinations(c);
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

  const handleCreate = async (input: RadioInput) => {
    try {
      const created = await createRadio(coordinationKey, input);
      setRadios((prev) =>
        [...prev, created].sort((a, b) => a.number - b.number),
      );
      setShowCreateModal(false);
    } catch {
      alert("Échec de la création.");
    }
  };

  const handleFieldChange = <K extends keyof RadioInput>(
    radio: RadioEntry,
    field: K,
    value: RadioInput[K],
  ) => {
    setRadios((prev) =>
      prev.map((r) => (r.id === radio.id ? { ...r, [field]: value } : r)),
    );
  };

  const handleFieldSave = async (radioId: string) => {
    if (!canWrite) return;
    const radio = radios.find((r) => r.id === radioId);
    if (!radio) return;
    try {
      await updateRadio(radio.id, toFormState(radio));
    } catch {
      alert("Échec de la mise à jour.");
      fetchAll();
    }
  };

  const handleCoordinationChange = async (
    radio: RadioEntry,
    eventCoordinationId: string | null,
  ) => {
    const updated = { ...radio, event_coordination_id: eventCoordinationId };
    setRadios((prev) => prev.map((r) => (r.id === radio.id ? updated : r)));
    if (!canWrite) return;
    try {
      await updateRadio(radio.id, toFormState(updated));
    } catch {
      alert("Échec de la mise à jour.");
      fetchAll();
    }
  };

  const handleToggle = async (
    radio: RadioEntry,
    field:
      | "headset_dure"
      | "headset_p2t"
      | "headset_agent"
      | "channel_prive"
      | "channel_batt_spare",
  ) => {
    if (!canWrite) return;
    const value = !radio[field];
    setRadios((prev) =>
      prev.map((r) => (r.id === radio.id ? { ...r, [field]: value } : r)),
    );
    try {
      await updateRadio(radio.id, { ...toFormState(radio), [field]: value });
    } catch {
      alert("Échec de la mise à jour.");
      fetchAll();
    }
  };

  const handleDelete = async (radio: RadioEntry) => {
    if (!canWrite) return;
    if (!window.confirm(`Supprimer la radio n° ${radio.number} ?`)) return;
    setRadios((prev) => prev.filter((r) => r.id !== radio.id));
    try {
      await deleteRadio(radio.id);
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
          {radios.length} radio{radios.length > 1 ? "s" : ""}
        </p>
        {canWrite && (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390]"
          >
            <Plus size={16} />
            Nouvelle radio
          </button>
        )}
      </div>

      {radios.length === 0 && (
        <p className="text-sm text-foreground/60">Aucune radio.</p>
      )}

      {radios.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-black/[.08] dark:border-white/[.145]">
                <th className="px-2 py-2 font-medium">Numéro</th>
                <th className="px-2 py-2 font-medium">Dure</th>
                <th className="px-2 py-2 font-medium">P2T</th>
                <th className="px-2 py-2 font-medium">Agent</th>
                <th className="px-2 py-2 font-medium">Privé</th>
                <th className="px-2 py-2 font-medium">Batt. Spare</th>
                <th className="px-2 py-2 font-medium">Coordination</th>
                <th className="px-2 py-2 font-medium">Nom de famille</th>
                <th className="px-2 py-2 font-medium">Prénom</th>
                <th className="px-2 py-2 font-medium">Attribution</th>
                <th className="px-2 py-2 font-medium">Notes</th>
                {canWrite && <th className="px-2 py-2 font-medium" />}
              </tr>
            </thead>
            <tbody>
              {radios.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-black/[.04] dark:border-white/[.06]"
                >
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      value={r.number}
                      disabled={!canWrite}
                      onChange={(e) =>
                        handleFieldChange(r, "number", Number(e.target.value))
                      }
                      onBlur={() => handleFieldSave(r.id)}
                      className={`${cellInputClassName} w-14 font-medium`}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <BooleanDot
                      value={r.headset_dure}
                      onToggle={
                        canWrite
                          ? () => handleToggle(r, "headset_dure")
                          : undefined
                      }
                    />
                  </td>
                  <td className="px-2 py-2">
                    <BooleanDot
                      value={r.headset_p2t}
                      onToggle={
                        canWrite
                          ? () => handleToggle(r, "headset_p2t")
                          : undefined
                      }
                    />
                  </td>
                  <td className="px-2 py-2">
                    <BooleanDot
                      value={r.headset_agent}
                      onToggle={
                        canWrite
                          ? () => handleToggle(r, "headset_agent")
                          : undefined
                      }
                    />
                  </td>
                  <td className="px-2 py-2">
                    <BooleanDot
                      value={r.channel_prive}
                      onToggle={
                        canWrite
                          ? () => handleToggle(r, "channel_prive")
                          : undefined
                      }
                    />
                  </td>
                  <td className="px-2 py-2">
                    <BooleanDot
                      value={r.channel_batt_spare}
                      onToggle={
                        canWrite
                          ? () => handleToggle(r, "channel_batt_spare")
                          : undefined
                      }
                    />
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={r.event_coordination_id ?? ""}
                      disabled={!canWrite}
                      onChange={(e) =>
                        handleCoordinationChange(r, e.target.value || null)
                      }
                      className={cellInputClassName}
                    >
                      <option value="">—</option>
                      {eventCoordinations.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={r.last_name}
                      disabled={!canWrite}
                      onChange={(e) =>
                        handleFieldChange(r, "last_name", e.target.value)
                      }
                      onBlur={() => handleFieldSave(r.id)}
                      className={`${cellInputClassName} w-28`}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={r.first_name}
                      disabled={!canWrite}
                      onChange={(e) =>
                        handleFieldChange(r, "first_name", e.target.value)
                      }
                      onBlur={() => handleFieldSave(r.id)}
                      className={`${cellInputClassName} w-28`}
                    />
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-foreground/60">
                    {[r.last_name, r.first_name].filter(Boolean).join(", ")}
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={r.notes ?? ""}
                      disabled={!canWrite}
                      onChange={(e) =>
                        handleFieldChange(r, "notes", e.target.value || null)
                      }
                      onBlur={() => handleFieldSave(r.id)}
                      className={`${cellInputClassName} w-40`}
                    />
                  </td>
                  {canWrite && (
                    <td className="px-2 py-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleDelete(r)}
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
        <RadioCreateModal
          eventCoordinations={eventCoordinations}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
        />
      )}
    </div>
  );
}
