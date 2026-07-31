"use client";

import {
  ChevronDown,
  ChevronUp,
  Feather,
  Plus,
  Search,
  Trash2,
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

function ActivitesContent() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
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
