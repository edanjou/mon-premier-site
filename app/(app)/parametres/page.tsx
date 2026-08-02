"use client";

import { Feather, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import {
  getCharacterLastSyncedAt,
  getGuildLastSyncedAt,
  getGuildSyncFrequency,
  getReligionMemberLastSyncedAt,
  GUILD_SYNC_FREQUENCIES,
  setGuildSyncFrequency,
  type GuildSyncFrequency,
} from "@/lib/app-settings";
import {
  createBattlefield,
  deleteBattlefield,
  listBattlefields,
  renameBattlefield,
  type Battlefield,
} from "@/lib/battlefields";
import { getOwnProfile } from "@/lib/profile";
import {
  createQuartier,
  deleteQuartier,
  listQuartiers,
  renameQuartier,
  type Quartier,
} from "@/lib/quartiers";
import { supabase } from "@/lib/supabase";
import {
  createTaskType,
  deleteTaskType,
  listTaskTypes,
  renameTaskType,
  type TaskType,
} from "@/lib/task-types";

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

function BattlefieldsSettings() {
  const [battlefields, setBattlefields] = useState<Battlefield[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchBattlefields = async () => {
    setBattlefields(await listBattlefields());
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchBattlefields resolves before the loading flag is cleared
    fetchBattlefields().finally(() => setIsLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setError(null);
    try {
      await createBattlefield(newName.trim());
      setNewName("");
      await fetchBattlefields();
    } catch {
      setError("Échec de la création.");
    }
  };

  const handleRename = async (id: string) => {
    if (!editingName.trim()) return;
    setError(null);
    try {
      await renameBattlefield(id, editingName.trim());
      setEditingId(null);
      await fetchBattlefields();
    } catch {
      setError("Échec de la modification.");
    }
  };

  const handleDelete = async (battlefield: Battlefield) => {
    if (
      !window.confirm(`Supprimer le champ de bataille "${battlefield.name}" ?`)
    )
      return;
    try {
      await deleteBattlefield(battlefield.id);
      setBattlefields((prev) => prev.filter((b) => b.id !== battlefield.id));
    } catch {
      setError("Échec de la suppression.");
    }
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
      <h2 className="font-semibold text-foreground">Champs de bataille</h2>
      <p className="mt-1 text-sm text-foreground/60">
        Liste réutilisable dans les chapitres des modules Campagnes, Grandes
        Batailles, Escarmouches et Scénarios.
      </p>

      {isLoading ? (
        <p className="mt-4 text-sm text-foreground/60">Chargement…</p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {battlefields.length === 0 && (
            <p className="text-sm text-foreground/60">
              Aucun champ de bataille pour l&apos;instant.
            </p>
          )}
          {battlefields.map((b) =>
            editingId === b.id ? (
              <div
                key={b.id}
                className="flex items-center gap-1 rounded-full border border-black/[.08] py-1 pl-3 pr-1 dark:border-white/[.145]"
              >
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="w-28 rounded border border-black/[.08] bg-white px-2 py-0.5 text-xs text-foreground dark:border-white/[.145] dark:bg-zinc-800"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => handleRename(b.id)}
                  className="px-1 text-xs font-medium text-primary hover:underline"
                >
                  OK
                </button>
              </div>
            ) : (
              <div
                key={b.id}
                className="flex items-center gap-1 rounded-full border border-black/[.08] py-1 pl-3 pr-1 text-xs text-foreground dark:border-white/[.145]"
              >
                {b.name}
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(b.id);
                    setEditingName(b.name);
                  }}
                  aria-label="Modifier"
                  className="rounded-full p-1 text-foreground/60 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                >
                  <Feather size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(b)}
                  aria-label="Supprimer"
                  className="rounded-full p-1 text-foreground/60 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ),
          )}
        </div>
      )}

      <form onSubmit={handleCreate} className="mt-3 flex items-center gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nouveau champ de bataille…"
          className="w-64 rounded-full border border-black/[.08] bg-white px-3 py-1.5 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
        />
        <button
          type="submit"
          className="rounded-full bg-primary p-1.5 text-white transition-colors hover:bg-[#0c4390]"
        >
          <Plus size={16} />
        </button>
      </form>

      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

function QuartiersSettings() {
  const [quartiers, setQuartiers] = useState<Quartier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchQuartiers = async () => {
    setQuartiers(await listQuartiers());
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchQuartiers resolves before the loading flag is cleared
    fetchQuartiers().finally(() => setIsLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setError(null);
    try {
      await createQuartier(newName.trim());
      setNewName("");
      await fetchQuartiers();
    } catch {
      setError("Échec de la création.");
    }
  };

  const handleRename = async (id: string) => {
    if (!editingName.trim()) return;
    setError(null);
    try {
      await renameQuartier(id, editingName.trim());
      setEditingId(null);
      await fetchQuartiers();
    } catch {
      setError("Échec de la modification.");
    }
  };

  const handleDelete = async (quartier: Quartier) => {
    if (!window.confirm(`Supprimer le quartier "${quartier.name}" ?`)) return;
    try {
      await deleteQuartier(quartier.id);
      setQuartiers((prev) => prev.filter((q) => q.id !== quartier.id));
    } catch {
      setError("Échec de la suppression.");
    }
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
      <h2 className="font-semibold text-foreground">Quartiers</h2>
      <p className="mt-1 text-sm text-foreground/60">
        Liste réutilisable dans le module Homologation.
      </p>

      {isLoading ? (
        <p className="mt-4 text-sm text-foreground/60">Chargement…</p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {quartiers.length === 0 && (
            <p className="text-sm text-foreground/60">
              Aucun quartier pour l&apos;instant.
            </p>
          )}
          {quartiers.map((q) =>
            editingId === q.id ? (
              <div
                key={q.id}
                className="flex items-center gap-1 rounded-full border border-black/[.08] py-1 pl-3 pr-1 dark:border-white/[.145]"
              >
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="w-28 rounded border border-black/[.08] bg-white px-2 py-0.5 text-xs text-foreground dark:border-white/[.145] dark:bg-zinc-800"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => handleRename(q.id)}
                  className="px-1 text-xs font-medium text-primary hover:underline"
                >
                  OK
                </button>
              </div>
            ) : (
              <div
                key={q.id}
                className="flex items-center gap-1 rounded-full border border-black/[.08] py-1 pl-3 pr-1 text-xs text-foreground dark:border-white/[.145]"
              >
                {q.name}
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(q.id);
                    setEditingName(q.name);
                  }}
                  aria-label="Modifier"
                  className="rounded-full p-1 text-foreground/60 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                >
                  <Feather size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(q)}
                  aria-label="Supprimer"
                  className="rounded-full p-1 text-foreground/60 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ),
          )}
        </div>
      )}

      <form onSubmit={handleCreate} className="mt-3 flex items-center gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nouveau quartier…"
          className="w-64 rounded-full border border-black/[.08] bg-white px-3 py-1.5 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
        />
        <button
          type="submit"
          className="rounded-full bg-primary p-1.5 text-white transition-colors hover:bg-[#0c4390]"
        >
          <Plus size={16} />
        </button>
      </form>

      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

function TaskTypesSettings() {
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchTaskTypes = async () => {
    setTaskTypes(await listTaskTypes());
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchTaskTypes resolves before the loading flag is cleared
    fetchTaskTypes().finally(() => setIsLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setError(null);
    try {
      await createTaskType(newName.trim());
      setNewName("");
      await fetchTaskTypes();
    } catch {
      setError("Échec de la création.");
    }
  };

  const handleRename = async (id: string) => {
    if (!editingName.trim()) return;
    setError(null);
    try {
      await renameTaskType(id, editingName.trim());
      setEditingId(null);
      await fetchTaskTypes();
    } catch {
      setError("Échec de la modification.");
    }
  };

  const handleDelete = async (taskType: TaskType) => {
    if (!window.confirm(`Supprimer le type de tâche "${taskType.name}" ?`))
      return;
    try {
      await deleteTaskType(taskType.id);
      setTaskTypes((prev) => prev.filter((t) => t.id !== taskType.id));
    } catch {
      setError("Échec de la suppression.");
    }
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
      <h2 className="font-semibold text-foreground">Types de tâche</h2>
      <p className="mt-1 text-sm text-foreground/60">
        Liste réutilisable dans l&apos;onglet Tâches du module Maréchaux.
      </p>

      {isLoading ? (
        <p className="mt-4 text-sm text-foreground/60">Chargement…</p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {taskTypes.length === 0 && (
            <p className="text-sm text-foreground/60">
              Aucun type de tâche pour l&apos;instant.
            </p>
          )}
          {taskTypes.map((t) =>
            editingId === t.id ? (
              <div
                key={t.id}
                className="flex items-center gap-1 rounded-full border border-black/[.08] py-1 pl-3 pr-1 dark:border-white/[.145]"
              >
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="w-28 rounded border border-black/[.08] bg-white px-2 py-0.5 text-xs text-foreground dark:border-white/[.145] dark:bg-zinc-800"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => handleRename(t.id)}
                  className="px-1 text-xs font-medium text-primary hover:underline"
                >
                  OK
                </button>
              </div>
            ) : (
              <div
                key={t.id}
                className="flex items-center gap-1 rounded-full border border-black/[.08] py-1 pl-3 pr-1 text-xs text-foreground dark:border-white/[.145]"
              >
                {t.name}
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(t.id);
                    setEditingName(t.name);
                  }}
                  aria-label="Modifier"
                  className="rounded-full p-1 text-foreground/60 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                >
                  <Feather size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(t)}
                  aria-label="Supprimer"
                  className="rounded-full p-1 text-foreground/60 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ),
          )}
        </div>
      )}

      <form onSubmit={handleCreate} className="mt-3 flex items-center gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nouveau type de tâche…"
          className="w-64 rounded-full border border-black/[.08] bg-white px-3 py-1.5 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
        />
        <button
          type="submit"
          className="rounded-full bg-primary p-1.5 text-white transition-colors hover:bg-[#0c4390]"
        >
          <Plus size={16} />
        </button>
      </form>

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
      <Breadcrumb />

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
          <BattlefieldsSettings />
          <QuartiersSettings />
          <TaskTypesSettings />
        </div>
      ) : (
        <p className="mt-2 text-foreground/70">À venir.</p>
      )}
    </div>
  );
}
