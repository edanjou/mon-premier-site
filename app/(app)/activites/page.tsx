"use client";

import {
  ChevronDown,
  ChevronUp,
  Feather,
  Flag,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { glofters } from "@/app/fonts/glofters";
import RequireFeature from "@/components/require-feature";
import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_CATEGORY_STYLES,
  type Activity,
  type ActivityInput,
} from "@/lib/activities";
import {
  FRONT_COLOR_STYLES,
  FRONT_COLORS,
  getActivityFrontAssignments,
  maxOrganizersFor,
  saveActivityFrontAssignments,
  type FrontAssignments,
  type FrontColor,
} from "@/lib/activity-fronts";
import { searchCharacters, type Character } from "@/lib/characters";
import { listGuilds, type Guild } from "@/lib/guilds";
import { supabase } from "@/lib/supabase";

function formatActivityDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

type SortDirection = "asc" | "desc";

function ActivityModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: Activity;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [date, setDate] = useState(initial?.date ?? "");
  const [category, setCategory] = useState<string>(
    initial?.category ?? ACTIVITY_CATEGORIES[0],
  );
  const [numberOfFronts, setNumberOfFronts] = useState(
    String(initial?.number_of_fronts ?? 1),
  );
  const [participantsPerFront, setParticipantsPerFront] = useState(
    String(initial?.participants_per_front ?? 1),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    const payload: ActivityInput = {
      name,
      date,
      category: category as ActivityInput["category"],
      number_of_fronts: parseInt(numberOfFronts, 10),
      participants_per_front: parseInt(participantsPerFront, 10),
    };

    const { error } = initial
      ? await supabase.from("activities").update(payload).eq("id", initial.id)
      : await supabase.from("activities").insert(payload);

    setIsSaving(false);
    if (error) {
      setError("Échec de l'enregistrement.");
      return;
    }
    await onSaved();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-sm flex-col gap-3 rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900"
      >
        <h2 className="font-semibold text-foreground">
          {initial ? "Modifier l'activité" : "Créer une activité"}
        </h2>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom"
          className="rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
        />
        <input
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
        >
          {ACTIVITY_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label className="flex items-center justify-between gap-2 text-sm text-foreground/70">
          Nombre de fronts
          <input
            type="number"
            min={1}
            required
            value={numberOfFronts}
            onChange={(e) => setNumberOfFronts(e.target.value)}
            className="w-24 rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
          />
        </label>
        <label className="flex items-center justify-between gap-2 text-sm text-foreground/70">
          Participants par front
          <input
            type="number"
            min={1}
            required
            value={participantsPerFront}
            onChange={(e) => setParticipantsPerFront(e.target.value)}
            className="w-24 rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
          />
        </label>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        <div className="mt-1 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}

function FrontCard({
  color,
  front,
  allGuilds,
  onAddGuild,
  onRemoveGuild,
  onAddOrganizer,
  onRemoveOrganizer,
}: {
  color: FrontColor;
  front: FrontAssignments[FrontColor];
  allGuilds: Guild[];
  onAddGuild: (guild: Guild) => void;
  onRemoveGuild: (guildId: number) => void;
  onAddOrganizer: (character: Character) => void;
  onRemoveOrganizer: (index: number) => void;
}) {
  const [guildQuery, setGuildQuery] = useState("");
  const [organizerQuery, setOrganizerQuery] = useState("");
  const [organizerResults, setOrganizerResults] = useState<Character[]>([]);
  const [isSearchingOrganizers, setIsSearchingOrganizers] = useState(false);

  const maxOrganizers = maxOrganizersFor(front.guilds.length);

  const guildSuggestions = guildQuery.trim()
    ? allGuilds
        .filter(
          (g) =>
            g.name.toLowerCase().includes(guildQuery.toLowerCase()) &&
            !front.guilds.some((a) => a.external_id === g.external_id),
        )
        .slice(0, 8)
    : [];

  useEffect(() => {
    const trimmed = organizerQuery.trim();
    if (!trimmed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing results synchronously when the search box is emptied
      setOrganizerResults([]);
      return;
    }
    const handle = setTimeout(() => {
      setIsSearchingOrganizers(true);
      searchCharacters(trimmed)
        .then(setOrganizerResults)
        .finally(() => setIsSearchingOrganizers(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [organizerQuery]);

  const organizerSuggestions = organizerResults.filter(
    (c) => !front.organizers.some((o) => o.character_id === c.external_id),
  );

  return (
    <div className="rounded-xl border border-black/[.08] p-3 dark:border-white/[.145]">
      <div className="mb-2 flex items-center gap-2">
        <span
          className={`rounded-full px-2 py-1 text-xs font-medium ${FRONT_COLOR_STYLES[color]}`}
        >
          {color}
        </span>
      </div>
      <div className="mb-2 flex flex-wrap gap-2">
        {front.guilds.map((g) => (
          <span
            key={g.external_id}
            className="flex items-center gap-1 rounded-full bg-black/[.05] px-2 py-1 text-xs text-foreground dark:bg-white/[.08]"
          >
            {g.name}
            <button
              type="button"
              onClick={() => onRemoveGuild(g.external_id)}
              className="text-foreground/50 hover:text-foreground"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        {front.guilds.length === 0 && (
          <span className="text-xs text-foreground/40">Aucune guilde</span>
        )}
      </div>
      <div className="relative">
        <input
          type="text"
          value={guildQuery}
          onChange={(e) => setGuildQuery(e.target.value)}
          placeholder="Rechercher une guilde à ajouter…"
          className="w-full rounded border border-black/[.08] bg-white px-3 py-1.5 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
        />
        {guildSuggestions.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-lg border border-black/[.08] bg-white shadow-lg dark:border-white/[.145] dark:bg-zinc-800">
            {guildSuggestions.map((g) => (
              <button
                key={g.external_id}
                type="button"
                onClick={() => {
                  onAddGuild(g);
                  setGuildQuery("");
                }}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-black/[.04] dark:hover:bg-white/[.08]"
              >
                {g.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {front.guilds.length > 0 && (
        <div className="mt-3 border-t border-black/[.08] pt-3 dark:border-white/[.145]">
          <span className="mb-2 block text-xs font-medium text-foreground/70">
            Organisateurs ({front.organizers.length}/{maxOrganizers})
          </span>
          <div className="mb-2 flex flex-col gap-1">
            {front.organizers.map((organizer, index) => (
              <div
                key={`${organizer.character_id}-${index}`}
                className="flex items-center justify-between gap-2 rounded bg-black/[.05] px-2 py-1.5 text-xs text-foreground dark:bg-white/[.08]"
              >
                <span>
                  {organizer.name}
                  {organizer.email ? ` — ${organizer.email}` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveOrganizer(index)}
                  className="flex-shrink-0 text-foreground/50 hover:text-foreground"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {front.organizers.length === 0 && (
              <span className="text-xs text-foreground/40">
                Aucun organisateur
              </span>
            )}
          </div>

          {front.organizers.length < maxOrganizers && (
            <div className="relative">
              <input
                type="text"
                value={organizerQuery}
                onChange={(e) => setOrganizerQuery(e.target.value)}
                placeholder="Rechercher un personnage à ajouter…"
                className="w-full rounded border border-black/[.08] bg-white px-3 py-1.5 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
              />
              {isSearchingOrganizers && (
                <p className="mt-1 text-xs text-foreground/40">Recherche…</p>
              )}
              {organizerSuggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-black/[.08] bg-white shadow-lg dark:border-white/[.145] dark:bg-zinc-800">
                  {organizerSuggestions.map((c) => (
                    <button
                      key={c.external_id}
                      type="button"
                      onClick={() => {
                        onAddOrganizer(c);
                        setOrganizerQuery("");
                        setOrganizerResults([]);
                      }}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-black/[.04] dark:hover:bg-white/[.08]"
                    >
                      {c.name}
                      {c.player_name ? ` — ${c.player_name}` : ""}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ActivityFrontsModal({
  activity,
  onClose,
}: {
  activity: Activity;
  onClose: () => void;
}) {
  const [allGuilds, setAllGuilds] = useState<Guild[]>([]);
  const [assignments, setAssignments] = useState<FrontAssignments | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableColors = FRONT_COLORS.slice(
    0,
    Math.max(1, Math.min(activity.number_of_fronts, FRONT_COLORS.length)),
  );

  useEffect(() => {
    Promise.all([listGuilds(), getActivityFrontAssignments(activity.id)])
      .then(([guilds, existing]) => {
        setAllGuilds(guilds);
        setAssignments(existing);
      })
      .finally(() => setIsLoading(false));
  }, [activity.id]);

  const addGuild = (color: FrontColor, guild: Guild) => {
    setAssignments((prev) => {
      if (!prev) return prev;
      if (prev[color].guilds.some((g) => g.external_id === guild.external_id))
        return prev;
      return {
        ...prev,
        [color]: {
          ...prev[color],
          guilds: [
            ...prev[color].guilds,
            { external_id: guild.external_id, name: guild.name },
          ],
        },
      };
    });
  };

  const removeGuild = (color: FrontColor, guildId: number) => {
    setAssignments((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [color]: {
          ...prev[color],
          guilds: prev[color].guilds.filter((g) => g.external_id !== guildId),
        },
      };
    });
  };

  const addOrganizer = (color: FrontColor, character: Character) => {
    setAssignments((prev) => {
      if (!prev) return prev;
      const max = maxOrganizersFor(prev[color].guilds.length);
      if (prev[color].organizers.length >= max) return prev;
      if (
        prev[color].organizers.some(
          (o) => o.character_id === character.external_id,
        )
      )
        return prev;
      return {
        ...prev,
        [color]: {
          ...prev[color],
          organizers: [
            ...prev[color].organizers,
            {
              character_id: character.external_id,
              name: character.player_name ?? character.name,
              email: character.player_email,
            },
          ],
        },
      };
    });
  };

  const removeOrganizer = (color: FrontColor, index: number) => {
    setAssignments((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [color]: {
          ...prev[color],
          organizers: prev[color].organizers.filter((_, i) => i !== index),
        },
      };
    });
  };

  const handleSave = async () => {
    if (!assignments) return;
    setError(null);
    setIsSaving(true);
    try {
      const sanitized = { ...assignments };
      for (const color of FRONT_COLORS) {
        if (!availableColors.includes(color))
          sanitized[color] = { guilds: [], organizers: [] };
      }
      await saveActivityFrontAssignments(activity.id, sanitized);
      onClose();
    } catch {
      setError("Échec de l'enregistrement.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col gap-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900"
      >
        <h2 className="font-semibold text-foreground">
          Fronts — {activity.name}
        </h2>
        <p className="-mt-2 text-sm text-foreground/60">
          {activity.number_of_fronts} front
          {activity.number_of_fronts > 1 ? "s" : ""} prévu
          {activity.number_of_fronts > 1 ? "s" : ""} pour cette activité.
        </p>

        {isLoading || !assignments ? (
          <p className="text-sm text-foreground/60">Chargement…</p>
        ) : (
          <div className="flex flex-col gap-4">
            {availableColors.map((color) => (
              <FrontCard
                key={color}
                color={color}
                front={assignments[color]}
                allGuilds={allGuilds}
                onAddGuild={(guild) => addGuild(color, guild)}
                onRemoveGuild={(guildId) => removeGuild(color, guildId)}
                onAddOrganizer={(character) => addOrganizer(color, character)}
                onRemoveOrganizer={(index) => removeOrganizer(color, index)}
              />
            ))}
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="mt-1 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActivitesContent() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [frontsActivity, setFrontsActivity] = useState<Activity | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchActivities = async () => {
    setIsLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("activities")
      .select("*")
      .order("date", { ascending: true });
    setIsLoading(false);
    if (error) {
      setError("Impossible de charger les activités.");
      return;
    }
    setActivities(data ?? []);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchActivities sets a loading flag ahead of an async fetch
    fetchActivities();
  }, []);

  const handleDelete = async (activity: Activity) => {
    if (!window.confirm(`Supprimer l'activité "${activity.name}" ?`)) return;
    const { error } = await supabase
      .from("activities")
      .delete()
      .eq("id", activity.id);
    if (error) {
      alert("Échec de la suppression.");
      return;
    }
    setActivities((prev) => prev.filter((a) => a.id !== activity.id));
  };

  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const query = searchQuery.trim().toLowerCase();
  const visibleActivities = activities
    .filter((a) => !categoryFilter || a.category === categoryFilter)
    .filter((a) => !query || a.name.toLowerCase().includes(query))
    .sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      return sortDirection === "asc" ? cmp : -cmp;
    });

  return (
    <div>
      <h1 className={`${glofters.className} text-3xl text-foreground`}>
        Activités
      </h1>
      <p className="mt-2 text-foreground/70">
        Campagnes militaires, campagnes d&apos;aventure, scénarios spéciaux,
        escarmouches et grandes batailles.
      </p>

      <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
        <h2 className="mb-4 font-semibold text-foreground">
          Activités planifiées
        </h2>

        {isLoading && <p className="text-sm text-foreground/60">Chargement…</p>}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {!isLoading && !error && (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher par nom…"
                    className="w-56 rounded-full border border-black/[.08] bg-white py-2 pl-9 pr-3 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-full border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
                >
                  <option value="">Toutes les catégories</option>
                  {ACTIVITY_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390]"
              >
                <Plus size={16} />
                Créer une activité
              </button>
            </div>

            {activities.length === 0 && (
              <p className="text-sm text-foreground/60">
                Aucune activité pour l&apos;instant.
              </p>
            )}

            {activities.length > 0 && visibleActivities.length === 0 && (
              <p className="text-sm text-foreground/60">
                Aucune activité ne correspond à ces critères.
              </p>
            )}

            {visibleActivities.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-black/[.08] text-foreground/60 dark:border-white/[.08]">
                      <th className="py-2 pr-4 font-medium">Nom</th>
                      <th className="py-2 pr-4 font-medium">
                        <button
                          type="button"
                          onClick={toggleSortDirection}
                          className="flex items-center gap-1 hover:text-foreground"
                        >
                          Date
                          {sortDirection === "asc" ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          )}
                        </button>
                      </th>
                      <th className="py-2 pr-4 font-medium">Catégorie</th>
                      <th className="py-2 pr-4 font-medium">Fronts</th>
                      <th className="py-2 pr-4 font-medium">
                        Participants/front
                      </th>
                      <th className="py-2 pr-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleActivities.map((activity) => (
                      <tr
                        key={activity.id}
                        className="border-b border-black/[.06] odd:bg-black/[.015] dark:border-white/[.06] dark:odd:bg-white/[.03]"
                      >
                        <td className="py-2 pr-4 text-foreground">
                          {activity.name}
                        </td>
                        <td className="py-2 pr-4 text-foreground/80">
                          {formatActivityDate(activity.date)}
                        </td>
                        <td className="py-2 pr-4">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${ACTIVITY_CATEGORY_STYLES[activity.category]}`}
                          >
                            {activity.category}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-foreground/80">
                          {activity.number_of_fronts}
                        </td>
                        <td className="py-2 pr-4 text-foreground/80">
                          {activity.participants_per_front}
                        </td>
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setFrontsActivity(activity)}
                              aria-label="Fronts"
                              className="rounded-full p-2 text-foreground/60 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                            >
                              <Flag size={16} />
                            </button>
                            <button
                              onClick={() => setEditingActivity(activity)}
                              aria-label="Modifier"
                              className="rounded-full p-2 text-foreground/60 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                            >
                              <Feather size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(activity)}
                              aria-label="Supprimer"
                              className="rounded-full p-2 text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {isCreateOpen && (
        <ActivityModal
          onClose={() => setIsCreateOpen(false)}
          onSaved={fetchActivities}
        />
      )}
      {editingActivity && (
        <ActivityModal
          initial={editingActivity}
          onClose={() => setEditingActivity(null)}
          onSaved={fetchActivities}
        />
      )}
      {frontsActivity && (
        <ActivityFrontsModal
          activity={frontsActivity}
          onClose={() => setFrontsActivity(null)}
        />
      )}
    </div>
  );
}

export default function ActivitesPage() {
  return (
    <RequireFeature feature="activites">
      <ActivitesContent />
    </RequireFeature>
  );
}
