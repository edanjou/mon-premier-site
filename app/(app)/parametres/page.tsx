"use client";

import { useEffect, useState } from "react";
import { glofters } from "@/app/fonts/glofters";
import {
  getCharacterLastSyncedAt,
  getGuildLastSyncedAt,
  getGuildSyncFrequency,
  getReligionMemberLastSyncedAt,
  GUILD_SYNC_FREQUENCIES,
  setGuildSyncFrequency,
  type GuildSyncFrequency,
} from "@/lib/app-settings";
import { getOwnProfile } from "@/lib/profile";
import { supabase } from "@/lib/supabase";

async function getAuthToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function formatSyncDate(dateStr: string | null): string {
  if (!dateStr) return "Jamais";
  return new Date(dateStr).toLocaleString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function GuildSyncSettings() {
  const [frequency, setFrequency] = useState<GuildSyncFrequency>("weekly");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getGuildSyncFrequency(), getGuildLastSyncedAt()]).then(
      ([freq, lastSynced]) => {
        setFrequency(freq);
        setLastSyncedAt(lastSynced);
        setIsLoading(false);
      },
    );
  }, []);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as GuildSyncFrequency;
    setFrequency(next);
    setError(null);
    setMessage(null);
    setIsSaving(true);
    try {
      await setGuildSyncFrequency(next);
      setMessage("Fréquence mise à jour.");
    } catch {
      setError("Échec de la mise à jour de la fréquence.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncNow = async () => {
    setError(null);
    setMessage(null);
    setIsSyncing(true);
    try {
      const token = await getAuthToken();
      const res = await fetch("/api/admin/sync-guilds", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Échec de la synchronisation.");
        return;
      }
      setLastSyncedAt(await getGuildLastSyncedAt());
      setMessage(
        `${data.guildsSynced} guildes et ${data.sealsSynced} sceaux synchronisés.`,
      );
    } catch {
      setError("Échec de la synchronisation.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
      <h2 className="font-semibold text-foreground">
        Synchronisation des guildes et sceaux
      </h2>
      <p className="mt-1 text-sm text-foreground/60">
        Fréquence à laquelle les guildes et sceaux sont récupérés depuis
        bicolline.online.
      </p>

      {isLoading ? (
        <p className="mt-4 text-sm text-foreground/60">Chargement…</p>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <select
            value={frequency}
            onChange={handleChange}
            disabled={isSaving}
            className="rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
          >
            {GUILD_SYNC_FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSyncing ? "Synchronisation…" : "Synchroniser"}
          </button>
          <span className="text-sm text-foreground/60">
            Dernière synchronisation : {formatSyncDate(lastSyncedAt)}
          </span>
        </div>
      )}

      {message && (
        <p className="mt-2 text-sm text-green-600 dark:text-green-400">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

function ChunkedSyncSettings({
  title,
  description,
  endpoint,
  resultKey,
  unitLabel,
  getLastSyncedAt,
}: {
  title: string;
  description: string;
  endpoint: string;
  resultKey: string;
  unitLabel: string;
  getLastSyncedAt: () => Promise<string | null>;
}) {
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLastSyncedAt().then((lastSynced) => {
      setLastSyncedAt(lastSynced);
      setIsLoading(false);
    });
  }, [getLastSyncedAt]);

  const handleSyncNow = async () => {
    setError(null);
    setMessage(null);
    setIsSyncing(true);

    let total = 0;
    let totalPages = 0;

    try {
      const token = await getAuthToken();
      let done = false;

      while (!done) {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Échec de la synchronisation.");
          return;
        }

        total += data[resultKey];
        totalPages += data.pagesProcessed;
        done = data.done;
        setProgress(
          `${totalPages} pages traitées, ${total} ${unitLabel} synchronisés…`,
        );
      }

      setLastSyncedAt(await getLastSyncedAt());
      setMessage(`${total} ${unitLabel} synchronisés.`);
    } catch {
      setError("Échec de la synchronisation.");
    } finally {
      setProgress(null);
      setIsSyncing(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
      <h2 className="font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-foreground/60">{description}</p>

      {isLoading ? (
        <p className="mt-4 text-sm text-foreground/60">Chargement…</p>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSyncing ? "Synchronisation…" : "Synchroniser"}
          </button>
          <span className="text-sm text-foreground/60">
            Dernière synchronisation : {formatSyncDate(lastSyncedAt)}
          </span>
        </div>
      )}

      {progress && (
        <p className="mt-2 text-sm text-foreground/60">{progress}</p>
      )}
      {message && (
        <p className="mt-2 text-sm text-green-600 dark:text-green-400">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

export default function ParametresPage() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    getOwnProfile().then((profile) => setIsAdmin(profile?.role === "admin"));
  }, []);

  return (
    <div>
      <h1 className={`${glofters.className} text-3xl text-foreground`}>
        Paramètres
      </h1>

      {isAdmin ? (
        <div className="mt-8 flex flex-col gap-6">
          <GuildSyncSettings />
          <ChunkedSyncSettings
            title="Synchronisation des personnages"
            description="Nom, guilde, croyance, statut PNJ, ainsi que le nom et l'email du joueur associé, depuis bicolline.online. Plusieurs centaines de pages — la synchronisation peut prendre quelques minutes."
            endpoint="/api/admin/sync-characters"
            resultKey="charactersSynced"
            unitLabel="personnages"
            getLastSyncedAt={getCharacterLastSyncedAt}
          />
          <ChunkedSyncSettings
            title="Synchronisation des croyances et titres"
            description="Croyance, clerc, prêtre et grand prêtre par personnage, depuis bicolline.online. Plusieurs centaines de pages — la synchronisation peut prendre quelques minutes."
            endpoint="/api/admin/sync-religion-members"
            resultKey="membersSynced"
            unitLabel="entrées"
            getLastSyncedAt={getReligionMemberLastSyncedAt}
          />
        </div>
      ) : (
        <p className="mt-2 text-foreground/70">À venir.</p>
      )}
    </div>
  );
}
