"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import {
  deleteFeatureRequest,
  listFeatureRequests,
  setFeatureRequestDone,
  type FeatureRequest,
} from "@/lib/feature-requests";
import { getOwnProfile } from "@/lib/profile";

const TYPE_STYLES: Record<string, string> = {
  Module: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
  Fonctionnalité:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  Ajustement:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  Autre: "bg-black/[.05] text-foreground dark:bg-white/[.08]",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function DemandesContent() {
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setRequests(await listFeatureRequests());
    } catch {
      setError("Impossible de charger les demandes.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchAll sets a loading flag ahead of an async fetch
    fetchAll();
  }, []);

  const handleToggleDone = async (request: FeatureRequest) => {
    const nextDone = !request.done;
    setRequests((prev) =>
      prev.map((r) => (r.id === request.id ? { ...r, done: nextDone } : r)),
    );
    try {
      await setFeatureRequestDone(request.id, nextDone);
    } catch {
      alert("Échec de la mise à jour.");
      fetchAll();
    }
  };

  const handleDelete = async (request: FeatureRequest) => {
    if (!window.confirm("Supprimer cette demande ?")) return;
    setRequests((prev) => prev.filter((r) => r.id !== request.id));
    try {
      await deleteFeatureRequest(request.id);
    } catch {
      alert("Échec de la suppression.");
      fetchAll();
    }
  };

  const sorted = [...requests].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return b.created_at.localeCompare(a.created_at);
  });

  return (
    <div>
      <h1 className={`${glofters.className} text-3xl text-foreground`}>
        Demandes
      </h1>
      <Breadcrumb />

      <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
        {isLoading && (
          <p className="text-sm text-foreground/60">Chargement…</p>
        )}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {!isLoading && !error && sorted.length === 0 && (
          <p className="text-sm text-foreground/60">
            Aucune demande pour l&apos;instant.
          </p>
        )}
        {!isLoading && !error && sorted.length > 0 && (
          <div className="flex flex-col gap-2">
            {sorted.map((r) => (
              <div
                key={r.id}
                className="flex items-start gap-3 rounded-lg border border-black/[.06] px-3 py-2 dark:border-white/[.06]"
              >
                <input
                  type="checkbox"
                  checked={r.done}
                  onChange={() => handleToggleDone(r)}
                  className="mt-1 h-4 w-4 flex-shrink-0 accent-primary"
                />
                <div className="flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLES[r.type] ?? "bg-black/[.05] text-foreground dark:bg-white/[.08]"}`}
                    >
                      {r.type}
                    </span>
                    <span className="text-xs text-foreground/50">
                      {r.requester_name ?? "Utilisateur"} — {formatDate(r.created_at)}
                    </span>
                  </div>
                  <p
                    className={`text-sm ${r.done ? "text-foreground/40 line-through" : "text-foreground"}`}
                  >
                    {r.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(r)}
                  aria-label="Supprimer"
                  className="flex-shrink-0 rounded-full p-1.5 text-foreground/50 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DemandesPage() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    getOwnProfile().then((profile) => setIsAdmin(profile?.role === "admin"));
  }, []);

  if (!isAdmin) return null;
  return <DemandesContent />;
}
