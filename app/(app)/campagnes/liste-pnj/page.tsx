"use client";

import { FileText, Search, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import { Pagination, usePagination } from "@/components/pagination";
import RequireFeature from "@/components/require-feature";
import RichTextEditor from "@/components/rich-text-editor";
import { searchCharacters, type Character } from "@/lib/characters";
import { getModuleAccessLevels } from "@/lib/features";
import { marechalDisplayName, toTitleCase } from "@/lib/marechaux";
import { addPnj, listPnj, removePnj, updatePnj, type Pnj } from "@/lib/pnj";
import { getOwnProfile } from "@/lib/profile";

const inputClassName =
  "w-64 rounded-full border border-black/[.08] bg-white py-2 pl-9 pr-3 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800";
const rowClassName =
  "border-b border-black/[.06] odd:bg-black/[.015] dark:border-white/[.06] dark:odd:bg-white/[.03]";

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Search
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClassName}
      />
    </div>
  );
}

function AddPnjSearch({
  onAdd,
  excludeIds,
}: {
  onAdd: (character: Character) => void;
  excludeIds: number[];
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Character[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing results synchronously when the search box is emptied
      setResults([]);
      return;
    }
    const handle = setTimeout(() => {
      setIsSearching(true);
      searchCharacters(trimmed)
        .then(setResults)
        .finally(() => setIsSearching(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  const suggestions = results.filter(
    (c) => !excludeIds.includes(c.external_id),
  );

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher un personnage à ajouter comme PNJ…"
        className="w-full rounded-full border border-black/[.08] bg-white px-4 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
      />
      {isSearching && (
        <p className="mt-1 text-xs text-foreground/40">Recherche…</p>
      )}
      {suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-black/[.08] bg-white shadow-lg dark:border-white/[.145] dark:bg-zinc-800">
          {suggestions.map((c) => (
            <button
              key={c.external_id}
              type="button"
              onClick={() => {
                onAdd(c);
                setQuery("");
                setResults([]);
              }}
              className="picker-button block w-full px-3 py-2 text-left text-sm hover:bg-black/[.04] dark:hover:bg-white/[.08]"
            >
              {toTitleCase(c.player_name || c.name)}
              {c.player_name ? ` — ${toTitleCase(c.name)}` : ""}
              {c.player_email ? ` — ${c.player_email}` : ""}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PnjEditModal({
  pnj,
  canWrite,
  onClose,
  onSaved,
}: {
  pnj: Pnj;
  canWrite: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [recurringCharacters, setRecurringCharacters] = useState(
    pnj.recurring_characters ?? "",
  );
  const [internalNote, setInternalNote] = useState(pnj.internal_note ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
    setError(null);
    setIsSaving(true);
    try {
      await updatePnj(pnj.id, {
        recurring_characters: recurringCharacters || null,
        internal_note: internalNote || null,
      });
      await onSaved();
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
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-lg flex-col gap-3 overflow-y-auto rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">
            {marechalDisplayName(pnj)}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full p-1 hover:bg-black/[.04] dark:hover:bg-white/[.08]"
          >
            <X size={20} />
          </button>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-foreground">
            Noms de personnages récurrents incarnés
          </label>
          <textarea
            value={recurringCharacters}
            onChange={(e) => setRecurringCharacters(e.target.value)}
            readOnly={!canWrite}
            placeholder="Un nom par ligne…"
            rows={4}
            className={`w-full rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800 ${
              canWrite ? "" : "opacity-60"
            }`}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-foreground">
            Note interne
          </label>
          <RichTextEditor
            readOnly={!canWrite}
            value={internalNote}
            onChange={setInternalNote}
            placeholder="Notes et commentaires…"
            minHeight="6rem"
          />
        </div>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        <div className="mt-1 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
          >
            {canWrite ? "Annuler" : "Fermer"}
          </button>
          {canWrite && (
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "…" : "Enregistrer"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function ListePnjContent() {
  const [pnjList, setPnjList] = useState<Pnj[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [canWrite, setCanWrite] = useState(true);
  const [editingPnj, setEditingPnj] = useState<Pnj | null>(null);

  const fetchAll = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setPnjList(await listPnj());
    } catch {
      setError("Impossible de charger les PNJ.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchAll sets a loading flag ahead of an async fetch
    fetchAll();
  }, []);

  useEffect(() => {
    getOwnProfile().then((profile) => {
      if (!profile) return;
      getModuleAccessLevels(profile).then((levels) => {
        setCanWrite(levels["pnj"] === "ecriture");
      });
    });
  }, []);

  const handleAdd = async (character: Character) => {
    if (!canWrite) return;
    try {
      await addPnj(character.external_id);
      await fetchAll();
    } catch {
      alert("Échec de l'ajout.");
    }
  };

  const handleRemove = async (pnj: Pnj) => {
    if (!canWrite) return;
    if (!window.confirm(`Retirer ${marechalDisplayName(pnj)} des PNJ ?`))
      return;
    try {
      await removePnj(pnj.id);
      setPnjList((prev) => prev.filter((p) => p.id !== pnj.id));
    } catch {
      alert("Échec du retrait.");
    }
  };

  const filterQuery = query.toLowerCase();

  const matchedCharacterNames = (p: Pnj): string[] => {
    if (!filterQuery) return [];
    const names: string[] = [];
    if (p.name.toLowerCase().includes(filterQuery)) names.push(p.name);
    (p.recurring_characters ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && line.toLowerCase().includes(filterQuery))
      .forEach((line) => names.push(line));
    return names;
  };

  const visible = pnjList
    .filter(
      (p) =>
        marechalDisplayName(p).toLowerCase().includes(filterQuery) ||
        matchedCharacterNames(p).length > 0,
    )
    .sort((a, b) =>
      marechalDisplayName(a).localeCompare(marechalDisplayName(b), "fr"),
    );
  const { page, pageCount, setPage, pageItems } = usePagination(visible);

  return (
    <div>
      <h1 className={`${glofters.className} text-3xl text-foreground`}>
        Liste PNJ
      </h1>
      <Breadcrumb />

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
        <div className="flex flex-col gap-4">
          {canWrite && (
            <AddPnjSearch
              onAdd={handleAdd}
              excludeIds={pnjList.map((p) => p.character_id)}
            />
          )}

          {isLoading && (
            <p className="text-sm text-foreground/60">Chargement…</p>
          )}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          {!isLoading && !error && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <SearchInput
                  value={query}
                  onChange={setQuery}
                  placeholder="Rechercher un PNJ…"
                />
                <span className="text-sm text-foreground/60">
                  {visible.length} / {pnjList.length} PNJ
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[400px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-black/[.08] text-foreground/60 dark:border-white/[.08]">
                      <th className="py-2 pr-4 font-medium">Nom</th>
                      <th className="py-2 pr-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((p) => (
                      <tr key={p.id} className={rowClassName}>
                        <td className="py-2 pr-4 text-foreground">
                          {marechalDisplayName(p)}
                          {matchedCharacterNames(p).length > 0 && (
                            <span className="block text-xs text-foreground/50">
                              {matchedCharacterNames(p).join(", ")}
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setEditingPnj(p)}
                              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-foreground/60 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                            >
                              <FileText size={14} />
                              Détails
                            </button>
                            {canWrite && (
                              <button
                                onClick={() => handleRemove(p)}
                                aria-label="Supprimer"
                                className="rounded-full p-2 text-foreground/60 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {visible.length === 0 && (
                  <p className="py-3 text-sm text-foreground/60">
                    Aucun PNJ pour l&apos;instant.
                  </p>
                )}
              </div>
              <Pagination
                page={page}
                pageCount={pageCount}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      </div>

      {editingPnj && (
        <PnjEditModal
          pnj={editingPnj}
          canWrite={canWrite}
          onClose={() => setEditingPnj(null)}
          onSaved={fetchAll}
        />
      )}
    </div>
  );
}

export default function ListePnjPage() {
  return (
    <RequireFeature feature="pnj">
      <ListePnjContent />
    </RequireFeature>
  );
}
