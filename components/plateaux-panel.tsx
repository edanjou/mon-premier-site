"use client";

import { AlertTriangle, Feather, Megaphone, Plus, RotateCcw, Settings, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  listEventCoordinations,
  type EventCoordination,
} from "@/lib/event-coordinations";
import { getModuleAccessLevels } from "@/lib/features";
import {
  createPlateau,
  deletePlateau,
  listPlateaux,
  renamePlateau,
  type Plateau,
} from "@/lib/plateaux";
import {
  createReservation,
  deleteReservation,
  listReservations,
  reservationsConflict,
  setReservationCancelled,
  updateReservation,
  type PlateauReservation,
  type ReservationInput,
} from "@/lib/plateau-reservations";
import { getOwnProfile } from "@/lib/profile";

const inputClassName =
  "rounded border border-black/[.08] bg-white px-2 py-1 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800";
const labelClassName = "text-xs font-medium text-foreground/50";

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDate(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  const day = d.getDate();
  const month = d.toLocaleDateString("fr-FR", { month: "long" });
  const year = d.getFullYear();
  const weekday = capitalize(d.toLocaleDateString("fr-FR", { weekday: "long" }));
  return `${day} ${month} ${year} - ${weekday}`;
}

function formatTime(time: string | null): string {
  return time ? time.slice(0, 5) : "";
}

const EMPTY_FORM: ReservationInput = {
  plateau_id: "",
  title: "",
  event_coordination_id: null,
  date: "",
  setup_start: null,
  setup_end: null,
  start_time: "",
  end_time: "",
  teardown_start: null,
  teardown_end: null,
  notes: null,
};

function toFormState(r: PlateauReservation): ReservationInput {
  return {
    plateau_id: r.plateau_id,
    title: r.title,
    event_coordination_id: r.event_coordination_id,
    date: r.date,
    setup_start: r.setup_start ? formatTime(r.setup_start) : null,
    setup_end: r.setup_end ? formatTime(r.setup_end) : null,
    start_time: formatTime(r.start_time),
    end_time: formatTime(r.end_time),
    teardown_start: r.teardown_start ? formatTime(r.teardown_start) : null,
    teardown_end: r.teardown_end ? formatTime(r.teardown_end) : null,
    notes: r.notes,
  };
}

function PlateauManager({
  plateaux,
  onClose,
  onCreate,
  onRename,
  onDelete,
}: {
  plateaux: Plateau[];
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
  onRename: (plateau: Plateau, name: string) => Promise<void>;
  onDelete: (plateau: Plateau) => Promise<void>;
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
          <h2 className="font-semibold text-foreground">
            Gérer les plateaux
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
          {plateaux.length === 0 && (
            <p className="text-sm text-foreground/60">Aucun plateau.</p>
          )}
          {plateaux.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2 rounded-lg border border-black/[.06] px-3 py-1.5 dark:border-white/[.06]"
            >
              {editingId === p.id ? (
                <input
                  type="text"
                  autoFocus
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => {
                    onRename(p, editingName.trim());
                    setEditingId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onRename(p, editingName.trim());
                      setEditingId(null);
                    } else if (e.key === "Escape") {
                      setEditingId(null);
                    }
                  }}
                  className={`${inputClassName} flex-1`}
                />
              ) : (
                <span className="flex-1 text-sm text-foreground">
                  {p.name}
                </span>
              )}
              {editingId !== p.id && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(p.id);
                      setEditingName(p.name);
                    }}
                    aria-label="Modifier"
                    className="rounded-full p-1.5 text-foreground/50 hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                  >
                    <Feather size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(p)}
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
            placeholder="Nom du plateau…"
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

function ReservationModal({
  plateaux,
  eventCoordinations,
  initial,
  onClose,
  onSubmit,
}: {
  plateaux: Plateau[];
  eventCoordinations: EventCoordination[];
  initial: ReservationInput;
  onClose: () => void;
  onSubmit: (input: ReservationInput) => Promise<void>;
}) {
  const [form, setForm] = useState<ReservationInput>(initial);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const set = <K extends keyof ReservationInput>(
    key: K,
    value: ReservationInput[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !form.plateau_id ||
      !form.event_coordination_id ||
      !form.title.trim() ||
      !form.date ||
      !form.start_time ||
      !form.end_time
    )
      return;
    if (form.start_time >= form.end_time) {
      alert("L'heure de fin de l'activité doit être après l'heure de début.");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit({ ...form, title: form.title.trim() });
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
        className="flex max-h-[90vh] w-full max-w-2xl flex-col gap-3 overflow-y-auto rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Réservation</h2>
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
            <span className={labelClassName}>Plateau</span>
            <select
              value={form.plateau_id}
              onChange={(e) => set("plateau_id", e.target.value)}
              className={inputClassName}
            >
              <option value="">Choisir…</option>
              {plateaux.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
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

        <div className="flex flex-col gap-1">
          <span className={labelClassName}>Activité — Titre</span>
          <input
            type="text"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            className={inputClassName}
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className={labelClassName}>Journée</span>
          <input
            type="date"
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
            className={`${inputClassName} w-fit`}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <span className={labelClassName}>Montage — début</span>
            <input
              type="time"
              value={form.setup_start ?? ""}
              onChange={(e) => set("setup_start", e.target.value || null)}
              className={inputClassName}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className={labelClassName}>Activité — début</span>
            <input
              type="time"
              value={form.start_time}
              onChange={(e) => set("start_time", e.target.value)}
              className={inputClassName}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className={labelClassName}>Démontage — début</span>
            <input
              type="time"
              value={form.teardown_start ?? ""}
              onChange={(e) => set("teardown_start", e.target.value || null)}
              className={inputClassName}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className={labelClassName}>Montage — fin</span>
            <input
              type="time"
              value={form.setup_end ?? ""}
              onChange={(e) => set("setup_end", e.target.value || null)}
              className={inputClassName}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className={labelClassName}>Activité — fin</span>
            <input
              type="time"
              value={form.end_time}
              onChange={(e) => set("end_time", e.target.value)}
              className={inputClassName}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className={labelClassName}>Démontage — fin</span>
            <input
              type="time"
              value={form.teardown_end ?? ""}
              onChange={(e) => set("teardown_end", e.target.value || null)}
              className={inputClassName}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className={labelClassName}>Commentaires / Notes</span>
          <textarea
            value={form.notes ?? ""}
            onChange={(e) => set("notes", e.target.value || null)}
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

function PublicationModal({
  reservation,
  onClose,
}: {
  reservation: PlateauReservation;
  onClose: () => void;
}) {
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
          <h2 className="font-semibold text-foreground">
            Publication — {reservation.title}
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
        <p className="text-sm text-foreground/60">À venir.</p>
      </div>
    </div>
  );
}

export default function PlateauxPanel({
  coordinationKey,
  moduleKey,
}: {
  coordinationKey: string;
  moduleKey: string;
}) {
  const [plateaux, setPlateaux] = useState<Plateau[]>([]);
  const [reservations, setReservations] = useState<PlateauReservation[]>([]);
  const [eventCoordinations, setEventCoordinations] = useState<
    EventCoordination[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [canWrite, setCanWrite] = useState(false);
  const [showPlateauManager, setShowPlateauManager] = useState(false);
  const [publicationReservation, setPublicationReservation] =
    useState<PlateauReservation | null>(null);
  const [filterPlateauId, setFilterPlateauId] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterCoordination, setFilterCoordination] = useState("");
  const [modalState, setModalState] = useState<
    { mode: "create" } | { mode: "edit"; reservation: PlateauReservation } | null
  >(null);

  const fetchAll = async () => {
    setIsLoading(true);
    const [p, r, c] = await Promise.all([
      listPlateaux(coordinationKey),
      listReservations(coordinationKey),
      listEventCoordinations(),
    ]);
    setPlateaux(p);
    setReservations(r);
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

  const plateauName = (id: string) =>
    plateaux.find((p) => p.id === id)?.name ?? "?";

  const eventCoordinationName = (id: string | null) =>
    eventCoordinations.find((c) => c.id === id)?.name ?? "—";

  const conflictsFor = (reservation: PlateauReservation) =>
    reservations.filter((r) => reservationsConflict(reservation, r));

  const handleCreatePlateau = async (name: string) => {
    const created = await createPlateau(coordinationKey, name);
    setPlateaux((prev) =>
      [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
    );
  };

  const handleRenamePlateau = async (plateau: Plateau, name: string) => {
    if (!name || name === plateau.name) return;
    setPlateaux((prev) =>
      prev
        .map((p) => (p.id === plateau.id ? { ...p, name } : p))
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
    try {
      await renamePlateau(plateau.id, name);
    } catch {
      alert("Échec du renommage.");
      fetchAll();
    }
  };

  const handleDeletePlateau = async (plateau: Plateau) => {
    if (
      !window.confirm(
        `Supprimer le plateau « ${plateau.name} » et toutes ses réservations ?`,
      )
    )
      return;
    setPlateaux((prev) => prev.filter((p) => p.id !== plateau.id));
    setReservations((prev) => prev.filter((r) => r.plateau_id !== plateau.id));
    try {
      await deletePlateau(plateau.id);
    } catch {
      alert("Échec de la suppression.");
      fetchAll();
    }
  };

  const checkConflicts = (
    input: ReservationInput,
    excludeId: string | null,
  ): PlateauReservation[] => {
    const candidate: PlateauReservation = {
      id: excludeId ?? "candidate",
      coordination_key: coordinationKey,
      cancelled: false,
      ...input,
    };
    return reservations.filter(
      (r) => r.id !== excludeId && reservationsConflict(candidate, r),
    );
  };

  const handleSubmitReservation = async (input: ReservationInput) => {
    const excludeId = modalState?.mode === "edit" ? modalState.reservation.id : null;
    const conflicts = checkConflicts(input, excludeId);
    if (conflicts.length > 0) {
      const names = conflicts.map((c) => `« ${c.title} »`).join(", ");
      if (
        !window.confirm(
          `Conflit d'horaire sur ${plateauName(input.plateau_id)} avec ${names}. Enregistrer quand même ?`,
        )
      )
        return;
    }
    try {
      if (modalState?.mode === "edit") {
        await updateReservation(modalState.reservation.id, input);
        setReservations((prev) =>
          prev.map((r) =>
            r.id === modalState.reservation.id ? { ...r, ...input } : r,
          ),
        );
      } else {
        const created = await createReservation(coordinationKey, input);
        setReservations((prev) => [...prev, created]);
      }
      setModalState(null);
    } catch {
      alert("Échec de l'enregistrement.");
    }
  };

  const handleToggleCancelled = async (r: PlateauReservation) => {
    if (!canWrite) return;
    const cancelled = !r.cancelled;
    setReservations((prev) =>
      prev.map((x) => (x.id === r.id ? { ...x, cancelled } : x)),
    );
    try {
      await setReservationCancelled(r.id, cancelled);
    } catch {
      alert("Échec de la mise à jour.");
      fetchAll();
    }
  };

  const handleDelete = async (r: PlateauReservation) => {
    if (!canWrite) return;
    if (!window.confirm(`Supprimer définitivement « ${r.title} » ?`)) return;
    setReservations((prev) => prev.filter((x) => x.id !== r.id));
    try {
      await deleteReservation(r.id);
    } catch {
      alert("Échec de la suppression.");
      fetchAll();
    }
  };

  const sorted = [...reservations].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.start_time < b.start_time ? -1 : 1;
  });

  const filtered = sorted.filter((r) => {
    if (filterPlateauId && r.plateau_id !== filterPlateauId) return false;
    if (filterDate && r.date !== filterDate) return false;
    if (
      filterCoordination &&
      r.event_coordination_id !== filterCoordination
    )
      return false;
    return true;
  });

  const availableDates = Array.from(
    new Set(reservations.map((r) => r.date)),
  ).sort();

  if (isLoading) return <p className="text-sm text-foreground/60">Chargement…</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-foreground/60">
          {plateaux.length} plateau{plateaux.length > 1 ? "x" : ""} —{" "}
          {reservations.filter((r) => !r.cancelled).length} réservation
          {reservations.filter((r) => !r.cancelled).length > 1 ? "s" : ""}
        </p>
        {canWrite && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPlateauManager(true)}
              className="flex items-center gap-1.5 rounded-full border border-black/[.08] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
            >
              <Settings size={14} />
              Gérer les plateaux
            </button>
            <button
              type="button"
              disabled={plateaux.length === 0}
              onClick={() => setModalState({ mode: "create" })}
              className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={16} />
              Nouvelle réservation
            </button>
          </div>
        )}
      </div>

      {plateaux.length === 0 && (
        <p className="text-sm text-foreground/60">
          Ajoute d&apos;abord au moins un plateau.
        </p>
      )}

      {reservations.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterPlateauId}
            onChange={(e) => setFilterPlateauId(e.target.value)}
            className={inputClassName}
          >
            <option value="">Tous les plateaux</option>
            {plateaux.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className={inputClassName}
          >
            <option value="">Toutes les dates</option>
            {availableDates.map((d) => (
              <option key={d} value={d}>
                {formatDate(d)}
              </option>
            ))}
          </select>
          <select
            value={filterCoordination}
            onChange={(e) => setFilterCoordination(e.target.value)}
            className={inputClassName}
          >
            <option value="">Toutes les coordinations</option>
            {eventCoordinations.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {(filterPlateauId || filterDate || filterCoordination) && (
            <button
              type="button"
              onClick={() => {
                setFilterPlateauId("");
                setFilterDate("");
                setFilterCoordination("");
              }}
              className="text-xs text-foreground/50 hover:underline"
            >
              Réinitialiser
            </button>
          )}
        </div>
      )}

      {filtered.length === 0 && reservations.length > 0 && (
        <p className="text-sm text-foreground/60">
          Aucune réservation ne correspond aux filtres.
        </p>
      )}

      {reservations.length === 0 && plateaux.length > 0 && (
        <p className="text-sm text-foreground/60">Aucune réservation.</p>
      )}

      {filtered.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-black/[.08] dark:border-white/[.145]">
                <th className="px-2 py-2 font-medium">Journée</th>
                <th className="px-2 py-2 font-medium">Plateau</th>
                <th className="px-2 py-2 font-medium">Activité — Titre</th>
                <th className="px-2 py-2 font-medium">Montage</th>
                <th className="px-2 py-2 font-medium">Activité</th>
                <th className="px-2 py-2 font-medium">Démontage</th>
                <th className="px-2 py-2 font-medium">Coordination</th>
                <th className="px-2 py-2 font-medium">Notes</th>
                {canWrite && <th className="px-2 py-2 font-medium" />}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const conflicts = r.cancelled ? [] : conflictsFor(r);
                return (
                  <tr
                    key={r.id}
                    className={`border-b border-black/[.04] align-top dark:border-white/[.06] ${
                      r.cancelled
                        ? "opacity-50"
                        : conflicts.length > 0
                          ? "bg-red-50 dark:bg-red-950/30"
                          : ""
                    }`}
                  >
                    <td
                      className={`px-2 py-2 whitespace-nowrap ${r.cancelled ? "line-through" : ""}`}
                    >
                      {formatDate(r.date)}
                    </td>
                    <td
                      className={`px-2 py-2 ${r.cancelled ? "line-through" : ""}`}
                    >
                      {plateauName(r.plateau_id)}
                    </td>
                    <td
                      className={`px-2 py-2 font-medium text-foreground ${r.cancelled ? "line-through" : ""}`}
                    >
                      {r.title}
                      {conflicts.length > 0 && (
                        <p className="mt-0.5 flex items-center gap-1 font-normal text-red-600 dark:text-red-400">
                          <AlertTriangle size={11} />
                          Conflit : {conflicts.map((c) => c.title).join(", ")}
                        </p>
                      )}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-foreground/60">
                      {r.setup_start
                        ? `${formatTime(r.setup_start)}–${formatTime(r.setup_end)}`
                        : "—"}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap font-medium">
                      {formatTime(r.start_time)}–{formatTime(r.end_time)}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-foreground/60">
                      {r.teardown_start
                        ? `${formatTime(r.teardown_start)}–${formatTime(r.teardown_end)}`
                        : "—"}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      {eventCoordinationName(r.event_coordination_id)}
                    </td>
                    <td className="px-2 py-2 max-w-[16rem] text-foreground/60">
                      {r.notes ?? ""}
                    </td>
                    {canWrite && (
                      <td className="px-2 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setPublicationReservation(r)}
                            className="flex items-center gap-1 rounded-full border border-black/[.08] px-2 py-1 text-xs font-medium text-foreground/70 transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
                          >
                            <Megaphone size={12} />
                            Publication
                          </button>
                          {!r.cancelled && (
                            <button
                              type="button"
                              onClick={() =>
                                setModalState({ mode: "edit", reservation: r })
                              }
                              aria-label="Modifier"
                              className="rounded-full p-1.5 text-foreground/50 hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                            >
                              <Feather size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleToggleCancelled(r)}
                            aria-label={r.cancelled ? "Réactiver" : "Annuler"}
                            title={r.cancelled ? "Réactiver" : "Annuler"}
                            className="rounded-full p-1.5 text-foreground/50 hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                          >
                            {r.cancelled ? (
                              <RotateCcw size={14} />
                            ) : (
                              <X size={14} />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(r)}
                            aria-label="Supprimer"
                            className="rounded-full p-1.5 text-foreground/50 hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showPlateauManager && (
        <PlateauManager
          plateaux={plateaux}
          onClose={() => setShowPlateauManager(false)}
          onCreate={handleCreatePlateau}
          onRename={handleRenamePlateau}
          onDelete={handleDeletePlateau}
        />
      )}

      {modalState && (
        <ReservationModal
          plateaux={plateaux}
          eventCoordinations={eventCoordinations}
          initial={
            modalState.mode === "edit"
              ? toFormState(modalState.reservation)
              : EMPTY_FORM
          }
          onClose={() => setModalState(null)}
          onSubmit={handleSubmitReservation}
        />
      )}

      {publicationReservation && (
        <PublicationModal
          reservation={publicationReservation}
          onClose={() => setPublicationReservation(null)}
        />
      )}
    </div>
  );
}
