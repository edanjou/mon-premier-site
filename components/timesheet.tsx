"use client";

import { CalendarDays, Clock, Feather, Plus, Trash2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { getModuleAccessLevels } from "@/lib/features";
import {
  createPerson,
  deletePerson,
  listPeople,
  renamePerson,
  type Person,
} from "@/lib/people";
import { getOwnProfile } from "@/lib/profile";
import {
  createTimesheetEntry,
  deleteTimesheetEntry,
  listTimesheetEntries,
  updateTimesheetEntry,
  type TimesheetEntry,
} from "@/lib/timesheet";
import {
  createTimesheetCategory,
  deleteTimesheetCategory,
  listTimesheetCategories,
  renameTimesheetCategory,
  type TimesheetCategory,
} from "@/lib/timesheet-categories";

const cellFieldClassName =
  "w-full rounded border border-black/[.08] bg-white px-2 py-1 text-sm text-foreground disabled:opacity-60 dark:border-white/[.145] dark:bg-zinc-800";

function PeopleManager({
  coordinationKey,
  year,
  people,
  onChange,
}: {
  coordinationKey: string;
  year: number;
  people: Person[];
  onChange: () => Promise<void>;
}) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setError(null);
    try {
      await createPerson(coordinationKey, year, newName.trim());
      setNewName("");
      await onChange();
    } catch {
      setError("Échec de la création.");
    }
  };

  const handleRename = async (id: string) => {
    if (!editingName.trim()) return;
    setError(null);
    try {
      await renamePerson(id, editingName.trim());
      setEditingId(null);
      await onChange();
    } catch {
      setError("Échec de la modification.");
    }
  };

  const handleDelete = async (person: Person) => {
    if (!window.confirm(`Supprimer "${person.name}" ?`)) return;
    try {
      await deletePerson(person.id);
      await onChange();
    } catch {
      setError("Échec de la suppression.");
    }
  };

  return (
    <div>
      <form
        onSubmit={handleCreate}
        className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-black/[.08] p-3 dark:border-white/[.145]"
      >
        <div className="flex min-w-40 flex-1 flex-col gap-1">
          <label className="text-xs font-medium text-foreground/70">
            Nom
          </label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nouvelle personne…"
            className={cellFieldClassName}
          />
        </div>
        <button
          type="submit"
          className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#0c4390]"
        >
          <Plus size={14} />
          Ajouter
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] table-fixed text-left text-sm">
          <colgroup>
            <col />
            <col className="w-20" />
          </colgroup>
          <thead>
            <tr className="border-b border-black/[.08] text-foreground/60 dark:border-white/[.08]">
              <th className="py-2 pr-4 font-medium">Nom</th>
              <th className="py-2 pr-4 font-medium" />
            </tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <tr
                key={p.id}
                className="border-b border-black/[.06] odd:bg-black/[.015] dark:border-white/[.06] dark:odd:bg-white/[.03]"
              >
                <td className="w-full py-2 pr-4">
                  {editingId === p.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => handleRename(p.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleRename(p.id);
                        }
                      }}
                      autoFocus
                      className={cellFieldClassName}
                    />
                  ) : (
                    <span className="text-sm text-foreground">{p.name}</span>
                  )}
                </td>
                <td className="py-2 pr-4">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(p.id);
                        setEditingName(p.name);
                      }}
                      aria-label="Modifier"
                      className="rounded-full p-1.5 text-foreground/60 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                    >
                      <Feather size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p)}
                      aria-label="Supprimer"
                      className="rounded-full p-1.5 text-foreground/60 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {people.length === 0 && (
              <tr>
                <td
                  colSpan={2}
                  className="py-3 text-center text-sm text-foreground/60"
                >
                  Aucune personne pour l&apos;instant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

function EventsManager({
  coordinationKey,
  year,
  categories,
  onChange,
}: {
  coordinationKey: string;
  year: number;
  categories: TimesheetCategory[];
  onChange: () => Promise<void>;
}) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setError(null);
    try {
      await createTimesheetCategory(coordinationKey, year, newName.trim());
      setNewName("");
      await onChange();
    } catch {
      setError("Échec de la création.");
    }
  };

  const handleRename = async (id: string) => {
    if (!editingName.trim()) return;
    setError(null);
    try {
      await renameTimesheetCategory(id, editingName.trim());
      setEditingId(null);
      await onChange();
    } catch {
      setError("Échec de la modification.");
    }
  };

  const handleDelete = async (category: TimesheetCategory) => {
    if (!window.confirm(`Supprimer "${category.name}" ?`)) return;
    try {
      await deleteTimesheetCategory(category.id);
      await onChange();
    } catch {
      setError("Échec de la suppression.");
    }
  };

  return (
    <div>
      <form
        onSubmit={handleCreate}
        className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-black/[.08] p-3 dark:border-white/[.145]"
      >
        <div className="flex min-w-40 flex-1 flex-col gap-1">
          <label className="text-xs font-medium text-foreground/70">
            Événement
          </label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nouvel événement…"
            className={cellFieldClassName}
          />
        </div>
        <button
          type="submit"
          className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#0c4390]"
        >
          <Plus size={14} />
          Ajouter
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] table-fixed text-left text-sm">
          <colgroup>
            <col />
            <col className="w-20" />
          </colgroup>
          <thead>
            <tr className="border-b border-black/[.08] text-foreground/60 dark:border-white/[.08]">
              <th className="py-2 pr-4 font-medium">Événement</th>
              <th className="py-2 pr-4 font-medium" />
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr
                key={c.id}
                className="border-b border-black/[.06] odd:bg-black/[.015] dark:border-white/[.06] dark:odd:bg-white/[.03]"
              >
                <td className="w-full py-2 pr-4">
                  {editingId === c.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => handleRename(c.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleRename(c.id);
                        }
                      }}
                      autoFocus
                      className={cellFieldClassName}
                    />
                  ) : (
                    <span className="text-sm text-foreground">{c.name}</span>
                  )}
                </td>
                <td className="py-2 pr-4">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(c.id);
                        setEditingName(c.name);
                      }}
                      aria-label="Modifier"
                      className="rounded-full p-1.5 text-foreground/60 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                    >
                      <Feather size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(c)}
                      aria-label="Supprimer"
                      className="rounded-full p-1.5 text-foreground/60 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td
                  colSpan={2}
                  className="py-3 text-center text-sm text-foreground/60"
                >
                  Aucun événement pour l&apos;instant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

type TimesheetTab = "feuille-de-temps" | "personnes" | "evenements";

const TABS: { key: TimesheetTab; label: string; icon: typeof Clock }[] = [
  { key: "feuille-de-temps", label: "Feuille de temps", icon: Clock },
  { key: "personnes", label: "Personnes", icon: Users },
  { key: "evenements", label: "Événements", icon: CalendarDays },
];

export default function Timesheet({
  coordinationKey,
  moduleKey,
  year,
}: {
  coordinationKey: string;
  moduleKey: string;
  year: number;
}) {
  const [tab, setTab] = useState<TimesheetTab>("feuille-de-temps");
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [categories, setCategories] = useState<TimesheetCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canWrite, setCanWrite] = useState(true);

  const [newDate, setNewDate] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newHours, setNewHours] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getOwnProfile().then((profile) => {
      if (!profile) return;
      getModuleAccessLevels(profile).then((levels) => {
        setCanWrite(levels[moduleKey] === "ecriture");
      });
    });
  }, [moduleKey]);

  const fetchAll = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [entryList, peopleList, categoryList] = await Promise.all([
        listTimesheetEntries(coordinationKey, year),
        listPeople(coordinationKey, year),
        listTimesheetCategories(coordinationKey, year),
      ]);
      setEntries(entryList);
      setPeople(peopleList);
      setCategories(categoryList);
      setNewCategoryId(
        (prev) =>
          prev ||
          categoryList.find((c) => c.name.trim().toUpperCase() === "GB")
            ?.id ||
          "",
      );
    } catch {
      setError("Impossible de charger la feuille de temps.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchAll sets a loading flag ahead of an async fetch
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchAll is stable for a given coordinationKey/year
  }, [coordinationKey, year]);

  const updateLocalEntry = (id: string, patch: Partial<TimesheetEntry>) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    );
  };

  const persistEntry = async (entry: TimesheetEntry) => {
    if (!canWrite) return;
    try {
      await updateTimesheetEntry(entry.id, {
        date: entry.date,
        category_id: entry.category_id,
        description: entry.description,
        hours: entry.hours,
      });
    } catch {
      alert("Échec de la mise à jour.");
      await fetchAll();
    }
  };

  const handleDateChange = (entry: TimesheetEntry, date: string) => {
    if (!canWrite) return;
    updateLocalEntry(entry.id, { date });
    persistEntry({ ...entry, date });
  };

  const handleCategoryChange = (entry: TimesheetEntry, categoryId: string) => {
    if (!canWrite) return;
    const category = categories.find((c) => c.id === categoryId);
    updateLocalEntry(entry.id, {
      category_id: categoryId || null,
      category_name: category?.name ?? null,
    });
    persistEntry({ ...entry, category_id: categoryId || null });
  };

  const handleHoursChange = (
    entryId: string,
    personId: string,
    value: string,
  ) => {
    if (!canWrite) return;
    const hoursValue = parseFloat(value) || 0;
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId
          ? { ...e, hours: { ...e.hours, [personId]: hoursValue } }
          : e,
      ),
    );
  };

  const handleHoursBlur = (entryId: string) => {
    const entry = entries.find((e) => e.id === entryId);
    if (entry) persistEntry(entry);
  };

  const handleDescriptionChange = (entryId: string, description: string) => {
    if (!canWrite) return;
    updateLocalEntry(entryId, { description });
  };

  const handleDescriptionBlur = (entryId: string) => {
    const entry = entries.find((e) => e.id === entryId);
    if (entry) persistEntry(entry);
  };

  const handleDelete = async (entry: TimesheetEntry) => {
    if (!canWrite) return;
    if (!window.confirm("Supprimer cette entrée ?")) return;
    try {
      await deleteTimesheetEntry(entry.id);
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    } catch {
      alert("Échec de la suppression.");
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite || !newDate) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const hours: Record<string, number> = {};
      for (const [personId, value] of Object.entries(newHours)) {
        const n = parseFloat(value);
        if (n > 0) hours[personId] = n;
      }
      await createTimesheetEntry(coordinationKey, year, {
        date: newDate,
        category_id: newCategoryId || null,
        description: newDescription || null,
        hours,
      });
      setNewDate("");
      setNewCategoryId("");
      setNewDescription("");
      setNewHours({});
      await fetchAll();
    } catch {
      setError("Échec de l'ajout.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totals: Record<string, number> = {};
  for (const person of people) {
    totals[person.id] = entries.reduce(
      (sum, entry) => sum + (entry.hours[person.id] ?? 0),
      0,
    );
  }

  const sortedEntries = [...entries].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  const visibleTabs = canWrite
    ? TABS
    : TABS.filter((t) => t.key === "feuille-de-temps");

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
      <div className="flex gap-2 border-b border-black/[.08] dark:border-white/[.08]">
        {visibleTabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 rounded-t-lg px-3 py-2 text-sm font-medium transition-colors ${
                tab === t.key
                  ? "border-b-2 border-primary text-primary"
                  : "text-foreground/60 hover:text-foreground"
              }`}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "feuille-de-temps" && (
        <div className="pt-4">
          {isLoading && (
            <p className="text-sm text-foreground/60">Chargement…</p>
          )}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          {!isLoading && !error && people.length === 0 && (
            <p className="text-sm text-foreground/60">
              Ajoute d&apos;abord des personnes ci-dessous pour commencer à
              suivre les heures.
            </p>
          )}

          {canWrite && people.length > 0 && (
            <form
              onSubmit={handleAdd}
              className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-black/[.08] p-3 dark:border-white/[.145]"
            >
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-foreground/70">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className={cellFieldClassName}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-foreground/70">
                  Événement
                </label>
                <select
                  value={newCategoryId}
                  onChange={(e) => setNewCategoryId(e.target.value)}
                  className={cellFieldClassName}
                >
                  <option value="">—</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex min-w-40 flex-1 flex-col gap-1">
                <label className="text-xs font-medium text-foreground/70">
                  Description
                </label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Description…"
                  className={cellFieldClassName}
                />
              </div>
              {people.map((p) => (
                <div key={p.id} className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-foreground/70">
                    {p.name}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.25}
                    value={newHours[p.id] ?? ""}
                    onChange={(e) =>
                      setNewHours((prev) => ({
                        ...prev,
                        [p.id]: e.target.value,
                      }))
                    }
                    className={`${cellFieldClassName} w-[100px]`}
                  />
                </div>
              ))}
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#0c4390] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus size={14} />
                Ajouter
              </button>
            </form>
          )}

          {!isLoading && !error && people.length > 0 && (
            <div className="overflow-x-auto">
              <table
                className="w-full table-fixed text-left text-sm"
                style={{
                  minWidth: `${380 + people.length * 64 + (canWrite ? 48 : 0)}px`,
                }}
              >
                <colgroup>
                  <col className="w-36" />
                  <col className="w-40" />
                  <col />
                  {people.map((p) => (
                    <col key={p.id} className="w-16" />
                  ))}
                  {canWrite && <col className="w-12" />}
                </colgroup>
                <thead>
                  <tr className="border-b border-black/[.08] text-foreground/60 dark:border-white/[.08]">
                    <th className="py-2 pr-4 font-medium">Date</th>
                    <th className="py-2 pr-4 font-medium">Événement</th>
                    <th className="py-2 pr-4 font-medium">Description</th>
                    {people.map((p) => (
                      <th
                        key={p.id}
                        className="whitespace-normal break-words px-1 py-2 text-center align-bottom font-medium"
                      >
                        {p.name}
                      </th>
                    ))}
                    {canWrite && <th className="py-2 pr-4 font-medium" />}
                  </tr>
                  <tr className="border-b border-black/[.08] bg-primary/10 font-semibold text-primary dark:border-white/[.08] dark:bg-primary/20">
                    <td className="py-2 pr-4" colSpan={3}>
                      Total
                    </td>
                    {people.map((p) => (
                      <td key={p.id} className="py-2 px-1 text-center">
                        {totals[p.id] > 0 ? totals[p.id] : ""}
                      </td>
                    ))}
                    {canWrite && <td className="py-2 pr-4" />}
                  </tr>
                </thead>
                <tbody>
                  {sortedEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-black/[.06] odd:bg-black/[.015] dark:border-white/[.06] dark:odd:bg-white/[.03]"
                    >
                      <td className="py-2 pr-4">
                        <input
                          type="date"
                          value={entry.date}
                          disabled={!canWrite}
                          onChange={(e) => handleDateChange(entry, e.target.value)}
                          className={cellFieldClassName}
                        />
                      </td>
                      <td className="py-2 pr-4">
                        <select
                          value={entry.category_id ?? ""}
                          disabled={!canWrite}
                          onChange={(e) =>
                            handleCategoryChange(entry, e.target.value)
                          }
                          className={cellFieldClassName}
                        >
                          <option value="">—</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="w-full py-2 pr-4">
                        <input
                          type="text"
                          value={entry.description ?? ""}
                          disabled={!canWrite}
                          onChange={(e) =>
                            handleDescriptionChange(entry.id, e.target.value)
                          }
                          onBlur={() => handleDescriptionBlur(entry.id)}
                          className={cellFieldClassName}
                        />
                      </td>
                      {people.map((p) => (
                        <td key={p.id} className="py-2 px-1">
                          <input
                            type="number"
                            min={0}
                            step={0.25}
                            value={entry.hours[p.id] ?? ""}
                            disabled={!canWrite}
                            onChange={(e) =>
                              handleHoursChange(entry.id, p.id, e.target.value)
                            }
                            onBlur={() => handleHoursBlur(entry.id)}
                            className={`${cellFieldClassName} w-full px-1 text-center`}
                          />
                        </td>
                      ))}
                      {canWrite && (
                        <td className="py-2 pr-4">
                          <button
                            type="button"
                            onClick={() => handleDelete(entry)}
                            aria-label="Supprimer"
                            className="rounded-full p-2 text-foreground/60 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {entries.length === 0 && (
                    <tr>
                      <td
                        colSpan={people.length + 3}
                        className="py-3 text-center text-sm text-foreground/60"
                      >
                        Aucune entrée pour l&apos;instant.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "personnes" && canWrite && (
        <div className="pt-4">
          <PeopleManager
            coordinationKey={coordinationKey}
            year={year}
            people={people}
            onChange={fetchAll}
          />
        </div>
      )}

      {tab === "evenements" && canWrite && (
        <div className="pt-4">
          <EventsManager
            coordinationKey={coordinationKey}
            year={year}
            categories={categories}
            onChange={fetchAll}
          />
        </div>
      )}
    </div>
  );
}
