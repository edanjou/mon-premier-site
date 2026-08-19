"use client";

import { CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

type Quartier = { id: string; name: string };
type Schedule = { id: string; name: string; date: string };
type Slot = {
  id: string;
  schedule_id: string;
  quartier_id: string;
  start_time: string | null;
  end_time: string | null;
  capacity: number;
  registered_count: number;
};

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatTime(t: string | null): string {
  return t ? t.slice(0, 5) : "";
}

export default function InscriptionHomologationPage() {
  const [quartiers, setQuartiers] = useState<Quartier[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [selectedQuartier, setSelectedQuartier] = useState<string | null>(
    null,
  );
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [characterName, setCharacterName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/homologation/public")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        setQuartiers(data.quartiers ?? []);
        setSchedules(data.schedules ?? []);
        setSlots(data.slots ?? []);
      })
      .catch(() => setLoadError(true))
      .finally(() => setIsLoading(false));
  }, []);

  const scheduleById = new Map(schedules.map((s) => [s.id, s]));
  const quartierSlots = slots
    .filter((s) => s.quartier_id === selectedQuartier)
    .sort((a, b) => {
      const da = scheduleById.get(a.schedule_id)?.date ?? "";
      const db = scheduleById.get(b.schedule_id)?.date ?? "";
      if (da !== db) return da < db ? -1 : 1;
      return (a.start_time ?? "") < (b.start_time ?? "") ? -1 : 1;
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !characterName.trim()) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/homologation/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot_id: selectedSlot.id,
          character_name: characterName.trim(),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setSubmitError(body.error ?? "Échec de l'inscription.");
        return;
      }
      setSuccess(true);
    } catch {
      setSubmitError("Échec de l'inscription. Vérifie ta connexion.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-4 py-8 font-sans">
      <div className="flex w-full max-w-md flex-col gap-5">
        <Image
          src="/bicolline.svg"
          alt="Logo"
          width={100}
          height={100}
          priority
          className="h-[100px] w-[100px] self-center"
        />
        <h1 className="text-center text-2xl font-semibold text-foreground">
          Réservation homologation mobile
        </h1>

        {isLoading && (
          <p className="text-center text-sm text-foreground/60">
            Chargement…
          </p>
        )}
        {loadError && (
          <p className="text-center text-sm text-red-600 dark:text-red-400">
            Impossible de charger les créneaux. Réessaie plus tard.
          </p>
        )}

        {!isLoading && !loadError && success && selectedSlot && (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-black/[.08] bg-white p-6 text-center dark:border-white/[.145] dark:bg-zinc-900">
            <CheckCircle2 size={40} className="text-green-600 dark:text-green-400" />
            <p className="font-medium text-foreground">Inscription confirmée !</p>
            <p className="text-sm text-foreground/60">
              {characterName} —{" "}
              {formatTime(selectedSlot.start_time)}–
              {formatTime(selectedSlot.end_time)}
            </p>
          </div>
        )}

        {!isLoading && !loadError && !success && !selectedSlot && (
          <>
            <p className="text-center text-sm text-foreground/60">
              Choisis ton quartier pour voir les créneaux disponibles.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {quartiers.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setSelectedQuartier(q.id)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    selectedQuartier === q.id
                      ? "border-primary bg-primary text-white"
                      : "border-black/[.08] bg-white text-foreground hover:bg-black/[.04] dark:border-white/[.145] dark:bg-zinc-900 dark:hover:bg-white/[.08]"
                  }`}
                >
                  {q.name}
                </button>
              ))}
            </div>

            {selectedQuartier && (
              <div className="flex flex-col gap-2">
                {quartierSlots.length === 0 && (
                  <p className="text-center text-sm text-foreground/60">
                    Aucun créneau pour ce quartier.
                  </p>
                )}
                {quartierSlots.map((slot) => {
                  const schedule = scheduleById.get(slot.schedule_id);
                  const full = slot.registered_count >= slot.capacity;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={full}
                      onClick={() => setSelectedSlot(slot)}
                      className="flex items-center justify-between rounded-xl border border-black/[.08] bg-white px-4 py-3 text-left transition-colors hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[.145] dark:bg-zinc-900 dark:hover:bg-white/[.08]"
                    >
                      <span>
                        <span className="block text-sm font-medium capitalize text-foreground">
                          {schedule ? formatDate(schedule.date) : ""}
                        </span>
                        <span className="block text-xs text-foreground/60">
                          {formatTime(slot.start_time)}–
                          {formatTime(slot.end_time)}
                        </span>
                      </span>
                      <span
                        className={`text-xs font-medium ${full ? "text-red-600 dark:text-red-400" : "text-foreground/60"}`}
                      >
                        {full
                          ? "Complet"
                          : `${slot.registered_count}/${slot.capacity}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {!isLoading && !loadError && !success && selectedSlot && (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-3 rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-zinc-900"
          >
            <p className="text-sm text-foreground/60">
              {selectedSlot && scheduleById.get(selectedSlot.schedule_id)
                ? formatDate(scheduleById.get(selectedSlot.schedule_id)!.date)
                : ""}{" "}
              — {formatTime(selectedSlot.start_time)}–
              {formatTime(selectedSlot.end_time)}
            </p>
            <input
              type="text"
              required
              autoFocus
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              placeholder="Nom de ton personnage"
              className="rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
            />
            {submitError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {submitError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedSlot(null)}
                className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
              >
                Retour
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !characterName.trim()}
                className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "…" : "S'inscrire"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
