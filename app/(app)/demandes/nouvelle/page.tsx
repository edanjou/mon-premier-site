"use client";

import { useState } from "react";
import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import {
  createFeatureRequest,
  FEATURE_REQUEST_TYPES,
  type FeatureRequestType,
} from "@/lib/feature-requests";
import { getOwnProfile } from "@/lib/profile";

export default function NouvelleDemandePage() {
  const [type, setType] = useState<FeatureRequestType>(
    FEATURE_REQUEST_TYPES[0],
  );
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const profile = await getOwnProfile();
      if (!profile) throw new Error("Session expirée.");
      await createFeatureRequest(profile.id, type, description.trim());
      setDescription("");
      setType(FEATURE_REQUEST_TYPES[0]);
      setSubmitted(true);
    } catch {
      setError("Échec de l'envoi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className={`${glofters.className} text-3xl text-foreground`}>
        Faire une demande
      </h1>
      <Breadcrumb />

      <div className="mt-8 max-w-xl rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
        <p className="mb-4 text-sm text-foreground/60">
          Ajout d&apos;un module, d&apos;une fonctionnalité ou un ajustement à
          apporter au site — décris ta demande ci-dessous.
        </p>

        {submitted && (
          <p className="mb-4 rounded-lg bg-green-100 px-3 py-2 text-sm text-green-800 dark:bg-green-900/40 dark:text-green-300">
            Ta demande a été envoyée. Merci !
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-sm font-semibold text-foreground">
              Type
            </label>
            <div className="flex flex-wrap gap-2">
              {FEATURE_REQUEST_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                    type === t
                      ? "border-primary bg-primary text-white"
                      : "border-black/[.08] text-foreground/70 hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-foreground">
              Description
            </label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décris ce que tu aimerais voir ajouté ou ajusté…"
              rows={6}
              className="w-full rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !description.trim()}
            className="mt-1 self-start rounded-full bg-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Envoi…" : "Envoyer la demande"}
          </button>
        </form>
      </div>
    </div>
  );
}
