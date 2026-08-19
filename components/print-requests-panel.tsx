"use client";

import { ExternalLink, Feather, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  listEventCoordinations,
  type EventCoordination,
} from "@/lib/event-coordinations";
import { getModuleAccessLevels } from "@/lib/features";
import {
  createPrintRequest,
  deletePrintRequest,
  listPrintRequests,
  PAPER_COLORS,
  updatePrintRequest,
  type PaperColor,
  type PrintRequest,
  type PrintRequestInput,
} from "@/lib/print-requests";
import { getOwnProfile } from "@/lib/profile";

const inputClassName =
  "rounded border border-black/[.08] bg-white px-2 py-1 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800";
const labelClassName = "text-xs font-medium text-foreground/50";

const FORMAT_OPTIONS: { key: keyof PrintRequestInput; label: string }[] = [
  { key: "format_85x11", label: "8,5x11" },
  { key: "format_85x14", label: "8,5x14" },
  { key: "format_11x17", label: "11x17" },
];

const FINISH_OPTIONS: { key: keyof PrintRequestInput; label: string }[] = [
  { key: "finish_stapled", label: "Broché" },
  { key: "finish_laminated", label: "Plastifié" },
];

const PRINT_OPTIONS: { key: keyof PrintRequestInput; label: string }[] = [
  { key: "print_bw", label: "Noir/Blanc" },
  { key: "print_color", label: "Couleur" },
  { key: "print_single_sided", label: "Recto" },
  { key: "print_double_sided", label: "Recto/Verso" },
];

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

function checkedLabels(
  request: { [K in keyof PrintRequestInput]?: PrintRequestInput[K] },
  options: { key: keyof PrintRequestInput; label: string }[],
): string {
  return options
    .filter((o) => request[o.key])
    .map((o) => o.label)
    .join(", ");
}

const EMPTY_FORM: PrintRequestInput = {
  title: "",
  link: "",
  copies: null,
  format_85x11: false,
  format_85x14: false,
  format_11x17: false,
  finish_stapled: false,
  finish_laminated: false,
  paper_color: "Blanc",
  print_bw: false,
  print_color: false,
  print_single_sided: false,
  print_double_sided: false,
  event_coordination_id: null,
  added_by: "",
  done: false,
  notes: null,
};

function toFormState(r: PrintRequest): PrintRequestInput {
  return {
    title: r.title,
    link: r.link,
    copies: r.copies,
    format_85x11: r.format_85x11,
    format_85x14: r.format_85x14,
    format_11x17: r.format_11x17,
    finish_stapled: r.finish_stapled,
    finish_laminated: r.finish_laminated,
    paper_color: r.paper_color,
    print_bw: r.print_bw,
    print_color: r.print_color,
    print_single_sided: r.print_single_sided,
    print_double_sided: r.print_double_sided,
    event_coordination_id: r.event_coordination_id,
    added_by: r.added_by,
    done: r.done,
    notes: r.notes,
  };
}

function PrintRequestModal({
  eventCoordinations,
  initial,
  onClose,
  onSubmit,
}: {
  eventCoordinations: EventCoordination[];
  initial: PrintRequestInput;
  onClose: () => void;
  onSubmit: (input: PrintRequestInput) => Promise<void>;
}) {
  const [form, setForm] = useState<PrintRequestInput>(initial);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const set = <K extends keyof PrintRequestInput>(
    key: K,
    value: PrintRequestInput[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title?.trim()) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        ...form,
        title: form.title?.trim() || null,
        link: form.link?.trim() || null,
        added_by: form.added_by?.trim() || null,
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
          <h2 className="font-semibold text-foreground">Impression</h2>
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
          <span className={labelClassName}>Titre du fichier/document</span>
          <input
            type="text"
            value={form.title ?? ""}
            onChange={(e) => set("title", e.target.value)}
            className={inputClassName}
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className={labelClassName}>Lien</span>
          <input
            type="text"
            value={form.link ?? ""}
            onChange={(e) => set("link", e.target.value)}
            placeholder="URL ou nom du fichier…"
            className={inputClassName}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <span className={labelClassName}>Copies</span>
            <input
              type="number"
              min={0}
              value={form.copies ?? ""}
              onChange={(e) =>
                set("copies", e.target.value ? Number(e.target.value) : null)
              }
              className={`${inputClassName} w-24`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className={labelClassName}>Couleur du papier</span>
            <select
              value={form.paper_color}
              onChange={(e) => set("paper_color", e.target.value as PaperColor)}
              className={inputClassName}
            >
              {PAPER_COLORS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <span className={labelClassName}>Format</span>
            {FORMAT_OPTIONS.map((o) => (
              <label key={o.key} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={!!form[o.key]}
                  onChange={(e) =>
                    set(o.key, e.target.checked as PrintRequestInput[typeof o.key])
                  }
                  className="h-4 w-4 accent-primary"
                />
                {o.label}
              </label>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <span className={labelClassName}>Finition</span>
            {FINISH_OPTIONS.map((o) => (
              <label key={o.key} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={!!form[o.key]}
                  onChange={(e) =>
                    set(o.key, e.target.checked as PrintRequestInput[typeof o.key])
                  }
                  className="h-4 w-4 accent-primary"
                />
                {o.label}
              </label>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <span className={labelClassName}>Impression</span>
            {PRINT_OPTIONS.map((o) => (
              <label key={o.key} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={!!form[o.key]}
                  onChange={(e) =>
                    set(o.key, e.target.checked as PrintRequestInput[typeof o.key])
                  }
                  className="h-4 w-4 accent-primary"
                />
                {o.label}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
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
          <div className="flex flex-col gap-1">
            <span className={labelClassName}>Ajouté par</span>
            <input
              type="text"
              value={form.added_by ?? ""}
              onChange={(e) => set("added_by", e.target.value)}
              className={inputClassName}
            />
          </div>
        </div>

        <label className="flex items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            checked={form.done}
            onChange={(e) => set("done", e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Fait
        </label>

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

export default function PrintRequestsPanel({
  coordinationKey,
  moduleKey,
}: {
  coordinationKey: string;
  moduleKey: string;
}) {
  const [requests, setRequests] = useState<PrintRequest[]>([]);
  const [eventCoordinations, setEventCoordinations] = useState<
    EventCoordination[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [canWrite, setCanWrite] = useState(false);
  const [modalState, setModalState] = useState<
    { mode: "create" } | { mode: "edit"; request: PrintRequest } | null
  >(null);

  const fetchAll = async () => {
    setIsLoading(true);
    const [r, c] = await Promise.all([
      listPrintRequests(coordinationKey),
      listEventCoordinations(),
    ]);
    setRequests(r);
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

  const eventCoordinationName = (id: string | null) =>
    eventCoordinations.find((c) => c.id === id)?.name ?? "—";

  const handleSubmit = async (input: PrintRequestInput) => {
    try {
      if (modalState?.mode === "edit") {
        await updatePrintRequest(modalState.request.id, input);
        setRequests((prev) =>
          prev.map((r) =>
            r.id === modalState.request.id ? { ...r, ...input } : r,
          ),
        );
      } else {
        const created = await createPrintRequest(coordinationKey, input);
        setRequests((prev) => [...prev, created]);
      }
      setModalState(null);
    } catch {
      alert("Échec de l'enregistrement.");
    }
  };

  const handleToggleDone = async (request: PrintRequest) => {
    if (!canWrite) return;
    const done = !request.done;
    setRequests((prev) =>
      prev.map((r) => (r.id === request.id ? { ...r, done } : r)),
    );
    try {
      await updatePrintRequest(request.id, { ...toFormState(request), done });
    } catch {
      alert("Échec de la mise à jour.");
      fetchAll();
    }
  };

  const handleDelete = async (request: PrintRequest) => {
    if (!canWrite) return;
    if (!window.confirm("Supprimer cette demande d'impression ?")) return;
    setRequests((prev) => prev.filter((r) => r.id !== request.id));
    try {
      await deletePrintRequest(request.id);
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
          {requests.length} demande{requests.length > 1 ? "s" : ""}{" "}
          d&apos;impression
        </p>
        {canWrite && (
          <button
            type="button"
            onClick={() => setModalState({ mode: "create" })}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390]"
          >
            <Plus size={16} />
            Nouvelle impression
          </button>
        )}
      </div>

      {requests.length === 0 && (
        <p className="text-sm text-foreground/60">
          Aucune demande d&apos;impression.
        </p>
      )}

      {requests.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-black/[.08] dark:border-white/[.145]">
                <th className="px-2 py-2 font-medium">Titre du fichier/document</th>
                <th className="px-2 py-2 font-medium">Lien</th>
                <th className="px-2 py-2 font-medium">Copies</th>
                <th className="px-2 py-2 font-medium">Format</th>
                <th className="px-2 py-2 font-medium">Finition</th>
                <th className="px-2 py-2 font-medium">Couleur papier</th>
                <th className="px-2 py-2 font-medium">Impression</th>
                <th className="px-2 py-2 font-medium">Coordination</th>
                <th className="px-2 py-2 font-medium">Ajouté par</th>
                <th className="px-2 py-2 font-medium">Fait</th>
                <th className="px-2 py-2 font-medium">Notes</th>
                {canWrite && <th className="px-2 py-2 font-medium" />}
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-black/[.04] align-top dark:border-white/[.06]"
                >
                  <td className="px-2 py-2 font-medium text-foreground">
                    {r.title}
                  </td>
                  <td className="px-2 py-2">
                    {r.link ? (
                      r.link.startsWith("http") ? (
                        <a
                          href={r.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <ExternalLink size={11} />
                          Lien
                        </a>
                      ) : (
                        <span className="text-foreground/70">{r.link}</span>
                      )
                    ) : (
                      ""
                    )}
                  </td>
                  <td className="px-2 py-2">{r.copies ?? ""}</td>
                  <td className="px-2 py-2 text-foreground/70">
                    {checkedLabels(r, FORMAT_OPTIONS)}
                  </td>
                  <td className="px-2 py-2 text-foreground/70">
                    {checkedLabels(r, FINISH_OPTIONS)}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-foreground/70">
                    {r.paper_color}
                  </td>
                  <td className="px-2 py-2 text-foreground/70">
                    {checkedLabels(r, PRINT_OPTIONS)}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    {eventCoordinationName(r.event_coordination_id)}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    {r.added_by ?? ""}
                  </td>
                  <td className="px-2 py-2">
                    <BooleanDot
                      value={r.done}
                      onToggle={
                        canWrite ? () => handleToggleDone(r) : undefined
                      }
                    />
                  </td>
                  <td className="px-2 py-2 max-w-[16rem] text-foreground/60">
                    {r.notes ?? ""}
                  </td>
                  {canWrite && (
                    <td className="px-2 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setModalState({ mode: "edit", request: r })
                          }
                          aria-label="Modifier"
                          className="rounded-full p-1.5 text-foreground/50 hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                        >
                          <Feather size={14} />
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
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalState && (
        <PrintRequestModal
          eventCoordinations={eventCoordinations}
          initial={
            modalState.mode === "edit"
              ? toFormState(modalState.request)
              : EMPTY_FORM
          }
          onClose={() => setModalState(null)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
