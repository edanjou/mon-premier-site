"use client";

import { CheckCircle2, Plus, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

type DangerLevel = "Faible" | "Modéré" | "Élevé" | "Mortel";
const DANGER_LEVELS: DangerLevel[] = ["Faible", "Modéré", "Élevé", "Mortel"];

const DANGER_STYLES: Record<DangerLevel, string> = {
  Faible: "bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-400",
  "Modéré":
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-400",
  "Élevé":
    "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-400",
  Mortel: "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400",
};

type Creature = {
  id: string;
  name: string;
  description: string | null;
  danger_level: DangerLevel;
  special_rules: string | null;
};

function SubmitCreatureForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [dangerLevel, setDangerLevel] = useState<DangerLevel>("Faible");
  const [description, setDescription] = useState("");
  const [specialRules, setSpecialRules] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/bestiaire/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          danger_level: dangerLevel,
          description: description.trim() || null,
          special_rules: specialRules.trim() || null,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setSubmitError(body.error ?? "Échec de l'enregistrement.");
        return;
      }
      setSuccess(true);
    } catch {
      setSubmitError("Échec de l'enregistrement. Vérifie ta connexion.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-black/[.08] bg-white p-6 text-center dark:border-white/[.145] dark:bg-zinc-900">
        <CheckCircle2 size={40} className="text-green-600 dark:text-green-400" />
        <p className="font-medium text-foreground">Créature proposée !</p>
        <p className="text-sm text-foreground/60">
          Elle sera vérifiée par l&apos;équipe avant d&apos;apparaître dans le
          bestiaire.
        </p>
        <button
          type="button"
          onClick={onDone}
          className="mt-2 rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
        >
          Retour au bestiaire
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-zinc-900"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Proposer une créature</h2>
        <button
          type="button"
          onClick={onDone}
          aria-label="Fermer"
          className="rounded-full p-1 hover:bg-black/[.04] dark:hover:bg-white/[.08]"
        >
          <X size={20} />
        </button>
      </div>
      <input
        type="text"
        required
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nom de la créature"
        className="rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
      />
      <select
        value={dangerLevel}
        onChange={(e) => setDangerLevel(e.target.value as DangerLevel)}
        className="rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
      >
        {DANGER_LEVELS.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description / apparence"
        rows={3}
        className="rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
      />
      <textarea
        value={specialRules}
        onChange={(e) => setSpecialRules(e.target.value)}
        placeholder="Comportement / règles spéciales"
        rows={3}
        className="rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
      />
      {submitError && (
        <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
      )}
      <button
        type="submit"
        disabled={isSubmitting || !name.trim()}
        className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "…" : "Proposer"}
      </button>
    </form>
  );
}

export default function BestiairePage() {
  const [creatures, setCreatures] = useState<Creature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchCreatures = () => {
    setIsLoading(true);
    fetch("/api/bestiaire/public")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => setCreatures(data.creatures ?? []))
      .catch(() => setLoadError(true))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchCreatures sets a loading flag ahead of an async fetch
    fetchCreatures();
  }, []);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
          Bestiaire
        </h1>

        {showForm ? (
          <SubmitCreatureForm
            onDone={() => {
              setShowForm(false);
              fetchCreatures();
            }}
          />
        ) : (
          <>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="flex items-center justify-center gap-2 self-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390]"
            >
              <Plus size={16} />
              Proposer une créature
            </button>

            {isLoading && (
              <p className="text-center text-sm text-foreground/60">
                Chargement…
              </p>
            )}
            {loadError && (
              <p className="text-center text-sm text-red-600 dark:text-red-400">
                Impossible de charger le bestiaire. Réessaie plus tard.
              </p>
            )}
            {!isLoading && !loadError && creatures.length === 0 && (
              <p className="text-center text-sm text-foreground/60">
                Aucune créature pour l&apos;instant.
              </p>
            )}

            <div className="flex flex-col gap-2">
              {creatures.map((c) => {
                const isExpanded = expanded.has(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleExpanded(c.id)}
                    className="rounded-xl border border-black/[.08] bg-white p-4 text-left transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:bg-zinc-900 dark:hover:bg-white/[.08]"
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {c.name}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${DANGER_STYLES[c.danger_level]}`}
                      >
                        {c.danger_level}
                      </span>
                    </span>
                    {isExpanded && (
                      <span className="mt-2 block text-sm text-foreground/70">
                        {c.description && <span className="block">{c.description}</span>}
                        {c.special_rules && (
                          <span className="mt-1 block text-xs text-foreground/50">
                            {c.special_rules}
                          </span>
                        )}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
