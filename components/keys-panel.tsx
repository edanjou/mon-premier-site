"use client";

import { Feather, Plus, Settings, Trash2, X } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import {
  listEventCoordinations,
  type EventCoordination,
} from "@/lib/event-coordinations";
import { getModuleAccessLevels } from "@/lib/features";
import {
  createKeyAssignment,
  deleteKeyAssignment,
  listKeyAssignments,
  updateKeyAssignment,
  type KeyAssignment,
  type KeyAssignmentInput,
} from "@/lib/key-assignments";
import {
  createKeyType,
  deleteKeyType,
  listKeyTypes,
  renameKeyType,
  type KeyType,
} from "@/lib/key-types";
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

function KeyTypeManager({
  keyTypes,
  onClose,
  onCreate,
  onRename,
  onDelete,
}: {
  keyTypes: KeyType[];
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
  onRename: (keyType: KeyType, name: string) => Promise<void>;
  onDelete: (keyType: KeyType) => Promise<void>;
}) {
  const [newName, setNewName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsSubmitting(true);
    try {
      await onCreate(newName.trim());
      setNewName("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Gérer les clés</h2>
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
          {keyTypes.length === 0 && (
            <p className="text-sm text-foreground/60">Aucune clé.</p>
          )}
          {keyTypes.map((k) => (
            <div
              key={k.id}
              className="flex items-center gap-2 rounded-lg border border-black/[.06] px-3 py-1.5 dark:border-white/[.06]"
            >
              {editingId === k.id ? (
                <input
                  type="text"
                  autoFocus
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => {
                    onRename(k, editingName.trim());
                    setEditingId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onRename(k, editingName.trim());
                      setEditingId(null);
                    } else if (e.key === "Escape") {
                      setEditingId(null);
                    }
                  }}
                  className={`${inputClassName} flex-1`}
                />
              ) : (
                <span className="flex-1 text-sm text-foreground">
                  {k.name}
                </span>
              )}
              {editingId !== k.id && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(k.id);
                      setEditingName(k.name);
                    }}
                    aria-label="Modifier"
                    className="rounded-full p-1.5 text-foreground/50 hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                  >
                    <Feather size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(k)}
                    aria-label="Supprimer"
                    className="rounded-full p-1.5 text-foreground/50 hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleAdd} className="flex items-center gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nom de la clé…"
            className={`${inputClassName} flex-1`}
          />
          <button
            type="submit"
            disabled={isSubmitting || !newName.trim()}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus size={16} />
            Ajouter
          </button>
        </form>
      </div>
    </div>
  );
}

function toFormState(a: KeyAssignment): KeyAssignmentInput {
  return {
    key_type_id: a.key_type_id,
    event_coordination_id: a.event_coordination_id,
    last_name: a.last_name,
    first_name: a.first_name,
    given: a.given,
    notes: a.notes,
  };
}

type PersonInfo = {
  last_name: string;
  first_name: string;
  event_coordination_id: string | null;
};

type PersonGroup = PersonInfo & {
  key: string;
  assignments: KeyAssignment[];
};

function PersonKeysModal({
  keyTypes,
  eventCoordinations,
  onClose,
  onSubmit,
}: {
  keyTypes: KeyType[];
  eventCoordinations: EventCoordination[];
  onClose: () => void;
  onSubmit: (
    person: PersonInfo,
    keys: { key_type_id: string; notes: string | null }[],
  ) => Promise<void>;
}) {
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [eventCoordinationId, setEventCoordinationId] = useState<
    string | null
  >(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [justifications, setJustifications] = useState<
    Record<string, string>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleKey = (id: string) =>
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const chosen = keyTypes.filter((k) => selected[k.id]);
    if ((!lastName.trim() && !firstName.trim()) || chosen.length === 0)
      return;
    setIsSubmitting(true);
    try {
      await onSubmit(
        {
          last_name: lastName.trim(),
          first_name: firstName.trim(),
          event_coordination_id: eventCoordinationId,
        },
        chosen.map((k) => ({
          key_type_id: k.id,
          notes: justifications[k.id]?.trim() || null,
        })),
      );
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
          <h2 className="font-semibold text-foreground">
            Nouveau membre de l&apos;équipe
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

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <span className={labelClassName}>Nom de famille</span>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={inputClassName}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className={labelClassName}>Prénom</span>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={inputClassName}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className={labelClassName}>Coordination</span>
          <select
            value={eventCoordinationId ?? ""}
            onChange={(e) => setEventCoordinationId(e.target.value || null)}
            className={`${inputClassName} w-fit`}
          >
            <option value="">Choisir…</option>
            {eventCoordinations.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <span className={labelClassName}>Clés nécessaires</span>
          <div className="flex flex-col gap-2">
            {keyTypes.map((k) => (
              <div key={k.id} className="flex flex-col gap-1">
                <label className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={!!selected[k.id]}
                    onChange={() => toggleKey(k.id)}
                    className="h-4 w-4 accent-primary"
                  />
                  {k.name}
                </label>
                {selected[k.id] && (
                  <input
                    type="text"
                    value={justifications[k.id] ?? ""}
                    onChange={(e) =>
                      setJustifications((prev) => ({
                        ...prev,
                        [k.id]: e.target.value,
                      }))
                    }
                    placeholder="Justification (au besoin)…"
                    className={`${inputClassName} ml-6`}
                  />
                )}
              </div>
            ))}
          </div>
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

function AddKeysToPersonModal({
  person,
  keyTypes,
  onClose,
  onSubmit,
}: {
  person: PersonInfo;
  keyTypes: KeyType[];
  onClose: () => void;
  onSubmit: (
    keys: { key_type_id: string; notes: string | null }[],
  ) => Promise<void>;
}) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [justifications, setJustifications] = useState<
    Record<string, string>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleKey = (id: string) =>
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const chosen = keyTypes.filter((k) => selected[k.id]);
    if (chosen.length === 0) return;
    setIsSubmitting(true);
    try {
      await onSubmit(
        chosen.map((k) => ({
          key_type_id: k.id,
          notes: justifications[k.id]?.trim() || null,
        })),
      );
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
          <h2 className="font-semibold text-foreground">
            Ajouter des clés — {person.last_name} {person.first_name}
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

        {keyTypes.length === 0 ? (
          <p className="text-sm text-foreground/60">
            Cette personne a déjà toutes les clés existantes.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {keyTypes.map((k) => (
              <div key={k.id} className="flex flex-col gap-1">
                <label className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={!!selected[k.id]}
                    onChange={() => toggleKey(k.id)}
                    className="h-4 w-4 accent-primary"
                  />
                  {k.name}
                </label>
                {selected[k.id] && (
                  <input
                    type="text"
                    value={justifications[k.id] ?? ""}
                    onChange={(e) =>
                      setJustifications((prev) => ({
                        ...prev,
                        [k.id]: e.target.value,
                      }))
                    }
                    placeholder="Justification (au besoin)…"
                    className={`${inputClassName} ml-6`}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-1 flex justify-end gap-2">
          <button
            type="submit"
            disabled={isSubmitting || keyTypes.length === 0}
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "…" : "Ajouter"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function KeysPanel({
  coordinationKey,
  moduleKey,
}: {
  coordinationKey: string;
  moduleKey: string;
}) {
  const [keyTypes, setKeyTypes] = useState<KeyType[]>([]);
  const [assignments, setAssignments] = useState<KeyAssignment[]>([]);
  const [eventCoordinations, setEventCoordinations] = useState<
    EventCoordination[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [canWrite, setCanWrite] = useState(false);
  const [showKeyTypeManager, setShowKeyTypeManager] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [addingKeysForGroup, setAddingKeysForGroup] =
    useState<PersonGroup | null>(null);

  const fetchAll = async () => {
    setIsLoading(true);
    const [k, a, c] = await Promise.all([
      listKeyTypes(coordinationKey),
      listKeyAssignments(coordinationKey),
      listEventCoordinations(),
    ]);
    setKeyTypes(k);
    setAssignments(a);
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

  const handleCreateKeyType = async (name: string) => {
    const created = await createKeyType(coordinationKey, name);
    setKeyTypes((prev) =>
      [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
    );
  };

  const handleRenameKeyType = async (keyType: KeyType, name: string) => {
    if (!name || name === keyType.name) return;
    setKeyTypes((prev) =>
      prev
        .map((k) => (k.id === keyType.id ? { ...k, name } : k))
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
    try {
      await renameKeyType(keyType.id, name);
    } catch {
      alert("Échec du renommage.");
      fetchAll();
    }
  };

  const handleDeleteKeyType = async (keyType: KeyType) => {
    if (
      !window.confirm(
        `Supprimer la clé « ${keyType.name} » et toutes ses attributions ?`,
      )
    )
      return;
    setKeyTypes((prev) => prev.filter((k) => k.id !== keyType.id));
    setAssignments((prev) => prev.filter((a) => a.key_type_id !== keyType.id));
    try {
      await deleteKeyType(keyType.id);
    } catch {
      alert("Échec de la suppression.");
      fetchAll();
    }
  };

  const handleCreatePerson = async (
    person: PersonInfo,
    keys: { key_type_id: string; notes: string | null }[],
  ) => {
    try {
      const created = await Promise.all(
        keys.map((k) =>
          createKeyAssignment(coordinationKey, {
            key_type_id: k.key_type_id,
            event_coordination_id: person.event_coordination_id,
            last_name: person.last_name,
            first_name: person.first_name,
            given: false,
            notes: k.notes,
          }),
        ),
      );
      setAssignments((prev) => [...prev, ...created]);
      setShowCreateModal(false);
    } catch {
      alert("Échec de la création.");
    }
  };

  const handleAddKeysToGroup = async (
    group: PersonInfo,
    keys: { key_type_id: string; notes: string | null }[],
  ) => {
    try {
      const created = await Promise.all(
        keys.map((k) =>
          createKeyAssignment(coordinationKey, {
            key_type_id: k.key_type_id,
            event_coordination_id: group.event_coordination_id,
            last_name: group.last_name,
            first_name: group.first_name,
            given: false,
            notes: k.notes,
          }),
        ),
      );
      setAssignments((prev) => [...prev, ...created]);
      setAddingKeysForGroup(null);
    } catch {
      alert("Échec de l'ajout.");
    }
  };

  const handleFieldChange = <K extends keyof KeyAssignmentInput>(
    assignment: KeyAssignment,
    field: K,
    value: KeyAssignmentInput[K],
  ) => {
    setAssignments((prev) =>
      prev.map((a) => (a.id === assignment.id ? { ...a, [field]: value } : a)),
    );
  };

  const handleFieldSave = async (assignmentId: string) => {
    if (!canWrite) return;
    const assignment = assignments.find((a) => a.id === assignmentId);
    if (!assignment) return;
    try {
      await updateKeyAssignment(assignment.id, toFormState(assignment));
    } catch {
      alert("Échec de la mise à jour.");
      fetchAll();
    }
  };

  const handleSelectChange = async <K extends keyof KeyAssignmentInput>(
    assignment: KeyAssignment,
    field: K,
    value: KeyAssignmentInput[K],
  ) => {
    const updated = { ...assignment, [field]: value };
    setAssignments((prev) =>
      prev.map((a) => (a.id === assignment.id ? updated : a)),
    );
    if (!canWrite) return;
    try {
      await updateKeyAssignment(assignment.id, toFormState(updated));
    } catch {
      alert("Échec de la mise à jour.");
      fetchAll();
    }
  };

  const handleToggleGiven = async (assignment: KeyAssignment) => {
    await handleSelectChange(assignment, "given", !assignment.given);
  };

  const handleDelete = async (assignment: KeyAssignment) => {
    if (!canWrite) return;
    if (!window.confirm("Retirer cette clé pour cette personne ?")) return;
    setAssignments((prev) => prev.filter((a) => a.id !== assignment.id));
    try {
      await deleteKeyAssignment(assignment.id);
    } catch {
      alert("Échec de la suppression.");
      fetchAll();
    }
  };

  // Same person edited via any of their rows (name/coordination) applies to
  // every key they have — those fields aren't per-key, they're per-person.
  const handlePersonFieldChange = (
    groupAssignments: KeyAssignment[],
    field: "last_name" | "first_name",
    value: string,
  ) => {
    const ids = new Set(groupAssignments.map((a) => a.id));
    setAssignments((prev) =>
      prev.map((a) => (ids.has(a.id) ? { ...a, [field]: value } : a)),
    );
  };

  const handlePersonFieldSave = async (groupAssignments: KeyAssignment[]) => {
    if (!canWrite) return;
    const ids = new Set(groupAssignments.map((a) => a.id));
    const current = assignments.filter((a) => ids.has(a.id));
    try {
      await Promise.all(
        current.map((a) => updateKeyAssignment(a.id, toFormState(a))),
      );
    } catch {
      alert("Échec de la mise à jour.");
      fetchAll();
    }
  };

  const handlePersonCoordinationChange = async (
    groupAssignments: KeyAssignment[],
    eventCoordinationId: string | null,
  ) => {
    const ids = new Set(groupAssignments.map((a) => a.id));
    setAssignments((prev) =>
      prev.map((a) =>
        ids.has(a.id) ? { ...a, event_coordination_id: eventCoordinationId } : a,
      ),
    );
    if (!canWrite) return;
    try {
      await Promise.all(
        groupAssignments.map((a) =>
          updateKeyAssignment(a.id, {
            ...toFormState(a),
            event_coordination_id: eventCoordinationId,
          }),
        ),
      );
    } catch {
      alert("Échec de la mise à jour.");
      fetchAll();
    }
  };

  const groups: PersonGroup[] = (() => {
    const map = new Map<string, PersonGroup>();
    for (const a of assignments) {
      const key = `${a.last_name} ${a.first_name} ${a.event_coordination_id ?? ""}`;
      const existing = map.get(key);
      if (existing) {
        existing.assignments.push(a);
      } else {
        map.set(key, {
          key,
          last_name: a.last_name,
          first_name: a.first_name,
          event_coordination_id: a.event_coordination_id,
          assignments: [a],
        });
      }
    }
    return Array.from(map.values()).sort(
      (a, b) =>
        a.last_name.localeCompare(b.last_name) ||
        a.first_name.localeCompare(b.first_name),
    );
  })();

  if (isLoading) return <p className="text-sm text-foreground/60">Chargement…</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-foreground/60">
          {groups.length} membre{groups.length > 1 ? "s" : ""} —{" "}
          {assignments.length} clé{assignments.length > 1 ? "s" : ""}{" "}
          attribuée{assignments.length > 1 ? "s" : ""}
        </p>
        {canWrite && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowKeyTypeManager(true)}
              className="flex items-center gap-1.5 rounded-full border border-black/[.08] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
            >
              <Settings size={14} />
              Gérer les clés
            </button>
            <button
              type="button"
              disabled={keyTypes.length === 0}
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={16} />
              Nouveau membre
            </button>
          </div>
        )}
      </div>

      {keyTypes.length === 0 && (
        <p className="text-sm text-foreground/60">
          Ajoute d&apos;abord au moins une clé.
        </p>
      )}

      {groups.length === 0 && keyTypes.length > 0 && (
        <p className="text-sm text-foreground/60">Aucun membre.</p>
      )}

      {groups.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-black/[.08] dark:border-white/[.145]">
                <th className="px-2 py-2 font-medium">Nom de famille</th>
                <th className="px-2 py-2 font-medium">Prénom</th>
                <th className="px-2 py-2 font-medium">Coordination</th>
                <th className="px-2 py-2 font-medium">Clé</th>
                <th className="px-2 py-2 font-medium">Remise</th>
                <th className="px-2 py-2 font-medium">Justification</th>
                {canWrite && <th className="px-2 py-2 font-medium" />}
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => {
                const availableKeyTypes = keyTypes.filter(
                  (k) => !group.assignments.some((a) => a.key_type_id === k.id),
                );
                return (
                  <Fragment key={group.key}>
                    {group.assignments.map((a, index) => (
                      <tr
                        key={a.id}
                        className="border-b border-black/[.04] dark:border-white/[.06]"
                      >
                        {index === 0 && (
                          <>
                            <td
                              className="px-2 py-2 align-top"
                              rowSpan={group.assignments.length}
                            >
                              <input
                                type="text"
                                value={group.last_name}
                                disabled={!canWrite}
                                onChange={(e) =>
                                  handlePersonFieldChange(
                                    group.assignments,
                                    "last_name",
                                    e.target.value,
                                  )
                                }
                                onBlur={() =>
                                  handlePersonFieldSave(group.assignments)
                                }
                                className={`${cellInputClassName} w-28 font-medium`}
                              />
                            </td>
                            <td
                              className="px-2 py-2 align-top"
                              rowSpan={group.assignments.length}
                            >
                              <input
                                type="text"
                                value={group.first_name}
                                disabled={!canWrite}
                                onChange={(e) =>
                                  handlePersonFieldChange(
                                    group.assignments,
                                    "first_name",
                                    e.target.value,
                                  )
                                }
                                onBlur={() =>
                                  handlePersonFieldSave(group.assignments)
                                }
                                className={`${cellInputClassName} w-28`}
                              />
                            </td>
                            <td
                              className="px-2 py-2 align-top"
                              rowSpan={group.assignments.length}
                            >
                              <select
                                value={group.event_coordination_id ?? ""}
                                disabled={!canWrite}
                                onChange={(e) =>
                                  handlePersonCoordinationChange(
                                    group.assignments,
                                    e.target.value || null,
                                  )
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
                          </>
                        )}
                        <td className="px-2 py-2">
                          <select
                            value={a.key_type_id}
                            disabled={!canWrite}
                            onChange={(e) =>
                              handleSelectChange(a, "key_type_id", e.target.value)
                            }
                            className={cellInputClassName}
                          >
                            {keyTypes.map((k) => (
                              <option key={k.id} value={k.id}>
                                {k.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <BooleanDot
                            value={a.given}
                            onToggle={
                              canWrite ? () => handleToggleGiven(a) : undefined
                            }
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={a.notes ?? ""}
                            disabled={!canWrite}
                            onChange={(e) =>
                              handleFieldChange(a, "notes", e.target.value || null)
                            }
                            onBlur={() => handleFieldSave(a.id)}
                            placeholder="Justification (au besoin)…"
                            className={`${cellInputClassName} w-40`}
                          />
                        </td>
                        {canWrite && (
                          <td className="px-2 py-2 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDelete(a)}
                                aria-label="Retirer cette clé"
                                className="rounded-full p-1.5 text-foreground/50 hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                              >
                                <Trash2 size={14} />
                              </button>
                              {index === group.assignments.length - 1 &&
                                availableKeyTypes.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setAddingKeysForGroup(group)}
                                    aria-label="Ajouter des clés"
                                    title="Ajouter des clés"
                                    className="rounded-full p-1.5 text-foreground/50 hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                                  >
                                    <Plus size={14} />
                                  </button>
                                )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showKeyTypeManager && (
        <KeyTypeManager
          keyTypes={keyTypes}
          onClose={() => setShowKeyTypeManager(false)}
          onCreate={handleCreateKeyType}
          onRename={handleRenameKeyType}
          onDelete={handleDeleteKeyType}
        />
      )}

      {showCreateModal && (
        <PersonKeysModal
          keyTypes={keyTypes}
          eventCoordinations={eventCoordinations}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreatePerson}
        />
      )}

      {addingKeysForGroup && (
        <AddKeysToPersonModal
          person={addingKeysForGroup}
          keyTypes={keyTypes.filter(
            (k) =>
              !addingKeysForGroup.assignments.some(
                (a) => a.key_type_id === k.id,
              ),
          )}
          onClose={() => setAddingKeysForGroup(null)}
          onSubmit={(keys) => handleAddKeysToGroup(addingKeysForGroup, keys)}
        />
      )}
    </div>
  );
}
