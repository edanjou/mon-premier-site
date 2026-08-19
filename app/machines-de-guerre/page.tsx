"use client";

import { CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

type MachineType = "Canon" | "Baliste";
const MACHINE_TYPES: MachineType[] = ["Canon", "Baliste"];

export default function MachinesDeGuerrePage() {
  const [name, setName] = useState("");
  const [machineType, setMachineType] = useState<MachineType>("Canon");
  const [owner, setOwner] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !owner.trim()) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/machines-de-guerre/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          machine_type: machineType,
          owner: owner.trim(),
          description: description.trim() || null,
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
          Machines de guerre
        </h1>
        <p className="text-center text-sm text-foreground/60">
          Inscris ta machine de guerre pour la tenir à jour dans le registre
          d&apos;homologation.
        </p>

        {success ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-black/[.08] bg-white p-6 text-center dark:border-white/[.145] dark:bg-zinc-900">
            <CheckCircle2 size={40} className="text-green-600 dark:text-green-400" />
            <p className="font-medium text-foreground">Machine enregistrée !</p>
            <p className="text-sm text-foreground/60">
              Elle sera vérifiée par l&apos;équipe d&apos;homologation.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-3 rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-zinc-900"
          >
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom de la machine"
              className="rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
            />
            <div className="flex gap-2">
              {MACHINE_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setMachineType(t)}
                  className={`flex-1 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    machineType === t
                      ? "border-primary bg-primary text-white"
                      : "border-black/[.08] bg-white text-foreground hover:bg-black/[.04] dark:border-white/[.145] dark:bg-zinc-900 dark:hover:bg-white/[.08]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <input
              type="text"
              required
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="Propriétaire / guilde"
              className="rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (matériaux, dimensions, particularités…)"
              rows={4}
              className="rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
            />
            {submitError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {submitError}
              </p>
            )}
            <button
              type="submit"
              disabled={isSubmitting || !name.trim() || !owner.trim()}
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "…" : "Enregistrer la machine"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
