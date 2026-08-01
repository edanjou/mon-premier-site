"use client";

import { Hourglass, Search, Stamp, User, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { glofters } from "@/app/fonts/glofters";
import { Pagination, usePagination } from "@/components/pagination";
import RequireFeature from "@/components/require-feature";
import { searchCharacters, type Character } from "@/lib/characters";
import { listGuilds, type Guild } from "@/lib/guilds";
import { listGuildSeals, type GuildSeal } from "@/lib/guild-seals";
import {
  getSablierSummary,
  listReligions,
  type Religion,
  type SablierSummary,
} from "@/lib/religions";

type Tab = "guildes" | "sceaux" | "personnages" | "croyances" | "sabliers";

const TABS: { key: Tab; label: string; icon: typeof Users }[] = [
  { key: "guildes", label: "Guildes", icon: Users },
  { key: "sceaux", label: "Sceaux", icon: Stamp },
  { key: "personnages", label: "Personnages", icon: User },
  { key: "sabliers", label: "Sabliers", icon: Hourglass },
];

const inputClassName =
  "w-64 rounded-full border border-black/[.08] bg-white py-2 pl-9 pr-3 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800";
const rowClassName =
  "border-b border-black/[.06] odd:bg-black/[.015] dark:border-white/[.06] dark:odd:bg-white/[.03]";
const linkClassName =
  "link-button text-primary underline-offset-2 hover:underline";

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

function GuildesTab({
  query,
  onQueryChange,
}: {
  query: string;
  onQueryChange: (value: string) => void;
}) {
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    listGuilds()
      .then(setGuilds)
      .finally(() => setIsLoading(false));
  }, []);

  const q = query.toLowerCase();
  const visible = guilds.filter(
    (g) =>
      g.name.toLowerCase().includes(q) ||
      String(g.member_count ?? "").includes(q) ||
      String(g.presence_count ?? "").includes(q) ||
      (g.is_faction ? "oui" : "non").includes(q),
  );
  const { page, pageCount, setPage, pageItems } = usePagination(visible);

  if (isLoading)
    return <p className="text-sm text-foreground/60">Chargement…</p>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <SearchInput
          value={query}
          onChange={onQueryChange}
          placeholder="Rechercher une guilde…"
        />
        <span className="text-sm text-foreground/60">
          {visible.length} / {guilds.length} guildes
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-b border-black/[.08] text-foreground/60 dark:border-white/[.08]">
              <th className="py-2 pr-4 font-medium">Nom</th>
              <th className="py-2 pr-4 font-medium">Membres</th>
              <th className="py-2 pr-4 font-medium">Présences</th>
              <th className="py-2 pr-4 font-medium">Faction</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((g) => (
              <tr key={g.external_id} className={rowClassName}>
                <td className="py-2 pr-4 text-foreground">{g.name}</td>
                <td className="py-2 pr-4 text-foreground/80">
                  {g.member_count ?? "—"}
                </td>
                <td className="py-2 pr-4 text-foreground/80">
                  {g.presence_count ?? "—"}
                </td>
                <td className="py-2 pr-4 text-foreground/80">
                  {g.is_faction ? "Oui" : "Non"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
    </div>
  );
}

function SceauxTab({ onGuildClick }: { onGuildClick: (name: string) => void }) {
  const [seals, setSeals] = useState<GuildSeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    listGuildSeals()
      .then(setSeals)
      .finally(() => setIsLoading(false));
  }, []);

  const sealsQuery = query.toLowerCase();
  const visible = seals.filter(
    (s) =>
      (s.guilds?.name ?? "").toLowerCase().includes(sealsQuery) ||
      s.seal_type.toLowerCase().includes(sealsQuery) ||
      s.status.toLowerCase().includes(sealsQuery),
  );
  const { page, pageCount, setPage, pageItems } = usePagination(visible);

  if (isLoading)
    return <p className="text-sm text-foreground/60">Chargement…</p>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Rechercher par guilde…"
        />
        <span className="text-sm text-foreground/60">
          {visible.length} / {seals.length} sceaux
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-b border-black/[.08] text-foreground/60 dark:border-white/[.08]">
              <th className="py-2 pr-4 font-medium">Guilde</th>
              <th className="py-2 pr-4 font-medium">Sceau</th>
              <th className="py-2 pr-4 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((s) => (
              <tr key={s.external_id} className={rowClassName}>
                <td className="py-2 pr-4 text-foreground">
                  {s.guilds?.name ? (
                    <button
                      type="button"
                      onClick={() => onGuildClick(s.guilds!.name)}
                      className={linkClassName}
                    >
                      {s.guilds.name}
                    </button>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-2 pr-4 text-foreground/80">{s.seal_type}</td>
                <td className="py-2 pr-4 text-foreground/80">{s.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
    </div>
  );
}

const selectClassName =
  "rounded-full border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800";

function PersonnagesTab({
  query,
  onQueryChange,
  onGuildClick,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onGuildClick: (name: string) => void;
}) {
  const [results, setResults] = useState<Character[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [religions, setReligions] = useState<Religion[]>([]);
  const [guildFilter, setGuildFilter] = useState("");
  const [religionFilter, setReligionFilter] = useState("");

  useEffect(() => {
    listGuilds().then(setGuilds);
    listReligions().then(setReligions);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed && !guildFilter && !religionFilter) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing results synchronously when the search box and filters are empty
      setResults([]);
      setHasSearched(false);
      return;
    }

    const handle = setTimeout(() => {
      setIsSearching(true);
      searchCharacters(trimmed, {
        guildId: guildFilter ? Number(guildFilter) : null,
        religionName: religionFilter || null,
      })
        .then((data) => {
          setResults(data);
          setHasSearched(true);
        })
        .finally(() => setIsSearching(false));
    }, 300);

    return () => clearTimeout(handle);
  }, [query, guildFilter, religionFilter]);

  const { page, pageCount, setPage, pageItems } = usePagination(results);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={query}
            onChange={onQueryChange}
            placeholder="Rechercher un personnage ou un joueur…"
          />
          <select
            value={guildFilter}
            onChange={(e) => setGuildFilter(e.target.value)}
            className={selectClassName}
          >
            <option value="">Toutes les guildes</option>
            {guilds.map((g) => (
              <option key={g.external_id} value={g.external_id}>
                {g.name}
              </option>
            ))}
          </select>
          <select
            value={religionFilter}
            onChange={(e) => setReligionFilter(e.target.value)}
            className={selectClassName}
          >
            <option value="">Toutes les croyances</option>
            {religions.map((r) => (
              <option key={r.name} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        {hasSearched && (
          <span className="text-sm text-foreground/60">
            {results.length} résultat{results.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {!query.trim() && !guildFilter && !religionFilter && (
        <p className="text-sm text-foreground/60">
          Tape un nom ou choisis une guilde/croyance pour rechercher parmi les
          10 093 personnages.
        </p>
      )}
      {isSearching && <p className="text-sm text-foreground/60">Recherche…</p>}

      {!isSearching && hasSearched && results.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-black/[.08] text-foreground/60 dark:border-white/[.08]">
                  <th className="py-2 pr-4 font-medium">Nom</th>
                  <th className="py-2 pr-4 font-medium">Guilde</th>
                  <th className="py-2 pr-4 font-medium">Croyance</th>
                  <th className="py-2 pr-4 font-medium">PNJ</th>
                  <th className="py-2 pr-4 font-medium">Joueur</th>
                  <th className="py-2 pr-4 font-medium">Email</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((c) => (
                  <tr key={c.external_id} className={rowClassName}>
                    <td className="py-2 pr-4 text-foreground">{c.name}</td>
                    <td className="py-2 pr-4 text-foreground/80">
                      {c.guilds?.name ? (
                        <button
                          type="button"
                          onClick={() => onGuildClick(c.guilds!.name)}
                          className={linkClassName}
                        >
                          {c.guilds.name}
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2 pr-4 text-foreground/80">
                      {c.religion_name ?? "—"}
                    </td>
                    <td className="py-2 pr-4 text-foreground/80">
                      {c.is_npc ? "Oui" : "Non"}
                    </td>
                    <td className="py-2 pr-4 text-foreground/80">
                      {c.player_name ?? "—"}
                    </td>
                    <td className="py-2 pr-4 text-foreground/80">
                      {c.player_email ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            pageCount={pageCount}
            onPageChange={setPage}
          />
        </>
      )}

      {!isSearching && hasSearched && results.length === 0 && (
        <p className="text-sm text-foreground/60">Aucun résultat.</p>
      )}
    </div>
  );
}

function CroyancesTab() {
  const [religions, setReligions] = useState<Religion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    listReligions()
      .then(setReligions)
      .finally(() => setIsLoading(false));
  }, []);

  const religionsQuery = query.toLowerCase();
  const visible = religions.filter(
    (r) =>
      r.name.toLowerCase().includes(religionsQuery) ||
      String(r.memberCount).includes(religionsQuery),
  );
  const { page, pageCount, setPage, pageItems } = usePagination(visible);

  if (isLoading)
    return <p className="text-sm text-foreground/60">Chargement…</p>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Rechercher une croyance…"
        />
        <span className="text-sm text-foreground/60">
          {visible.length} / {religions.length} croyances
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[400px] text-left text-sm">
          <thead>
            <tr className="border-b border-black/[.08] text-foreground/60 dark:border-white/[.08]">
              <th className="py-2 pr-4 font-medium">Nom</th>
              <th className="py-2 pr-4 font-medium">Fidèles</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((r) => (
              <tr key={r.name} className={rowClassName}>
                <td className="py-2 pr-4 text-foreground">{r.name}</td>
                <td className="py-2 pr-4 text-foreground/80">
                  {r.memberCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
    </div>
  );
}

type SablierFilter = "tous" | "grands-pretres-clercs" | "pretres";

type SablierRow = {
  key: string;
  religionName: string;
  titulaire: string | null;
  clerc: string | null;
  type: "Grand-Prêtre / Clerc" | "Prêtre";
};

function SablierStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Hourglass;
  label: string;
  value: number;
}) {
  return (
    <div
      title={label}
      className="flex items-center gap-3 rounded-2xl bg-white p-5 shadow-sm dark:bg-zinc-900"
    >
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white">
        <Icon size={20} />
      </div>
      <p className="text-3xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function SablierStats({ summary }: { summary: SablierSummary }) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <SablierStat
        icon={Hourglass}
        label="Total des sabliers"
        value={summary.total}
      />
      <SablierStat
        icon={Users}
        label="Partagés (Grand-Prêtre / Clerc)"
        value={summary.sharedPairs.length}
      />
      <SablierStat
        icon={User}
        label="Individuels (Prêtre)"
        value={summary.individualPriests.length}
      />
    </div>
  );
}

function SabliersTab({
  summary,
  onCharacterClick,
}: {
  summary: SablierSummary;
  onCharacterClick: (name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SablierFilter>("tous");

  const q = query.toLowerCase();

  const pairRows: SablierRow[] = summary.sharedPairs
    .filter(
      (p) =>
        (p.grand_priest_name ?? "").toLowerCase().includes(q) ||
        (p.cleric_name ?? "").toLowerCase().includes(q) ||
        p.religion_name.toLowerCase().includes(q),
    )
    .map((p) => ({
      key: `pair-${p.external_id}`,
      religionName: p.religion_name,
      titulaire: p.grand_priest_name,
      clerc: p.cleric_name,
      type: "Grand-Prêtre / Clerc",
    }));

  const priestRows: SablierRow[] = summary.individualPriests
    .filter(
      (p) =>
        (p.priest_name ?? "").toLowerCase().includes(q) ||
        p.religion_name.toLowerCase().includes(q),
    )
    .map((p) => ({
      key: `priest-${p.external_id}`,
      religionName: p.religion_name,
      titulaire: p.priest_name,
      clerc: null,
      type: "Prêtre",
    }));

  const rows: SablierRow[] =
    filter === "grands-pretres-clercs"
      ? pairRows
      : filter === "pretres"
        ? priestRows
        : [...pairRows, ...priestRows];

  const { page, pageCount, setPage, pageItems } = usePagination(rows);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Rechercher un personnage ou une croyance…"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as SablierFilter)}
            className="rounded-full border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
          >
            <option value="tous">Tous les sabliers</option>
            <option value="grands-pretres-clercs">
              Grands-prêtres ou clercs
            </option>
            <option value="pretres">Prêtres</option>
          </select>
        </div>
        <span className="text-sm font-medium text-foreground">
          {rows.length} / {summary.total} sabliers
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead>
            <tr className="border-b border-black/[.08] text-foreground/60 dark:border-white/[.08]">
              <th className="py-2 pr-4 font-medium">Croyance</th>
              <th className="py-2 pr-4 font-medium">Titulaire</th>
              <th className="py-2 pr-4 font-medium">Clerc</th>
              <th className="py-2 pr-4 font-medium">Type</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((r) => (
              <tr key={r.key} className={rowClassName}>
                <td className="py-2 pr-4 text-foreground/80">
                  {r.religionName}
                </td>
                <td className="py-2 pr-4 text-foreground">
                  {r.titulaire ? (
                    <button
                      type="button"
                      onClick={() => onCharacterClick(r.titulaire!)}
                      className={linkClassName}
                    >
                      {r.titulaire}
                    </button>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-2 pr-4 text-foreground/80">
                  {r.clerc ? (
                    <button
                      type="button"
                      onClick={() => onCharacterClick(r.clerc!)}
                      className={linkClassName}
                    >
                      {r.clerc}
                    </button>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-2 pr-4 text-foreground/80">{r.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
    </div>
  );
}

function JeuContent() {
  const [tab, setTab] = useState<Tab>("guildes");
  const [guildQuery, setGuildQuery] = useState("");
  const [characterQuery, setCharacterQuery] = useState("");
  const [sablierSummary, setSablierSummary] = useState<SablierSummary | null>(
    null,
  );

  const goToGuild = (name: string) => {
    setGuildQuery(name);
    setTab("guildes");
  };

  const goToCharacter = (name: string) => {
    setCharacterQuery(name);
    setTab("personnages");
  };

  useEffect(() => {
    if (tab === "sabliers" && !sablierSummary) {
      getSablierSummary().then(setSablierSummary);
    }
  }, [tab, sablierSummary]);

  return (
    <div>
      <h1 className={`${glofters.className} text-3xl text-foreground`}>Jeu</h1>

      {tab === "sabliers" && sablierSummary && (
        <div className="mt-6">
          <SablierStats summary={sablierSummary} />
        </div>
      )}

      <div className="mt-6 flex gap-2 border-b border-black/[.08] dark:border-white/[.08]">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
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

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
        {tab === "guildes" && (
          <GuildesTab query={guildQuery} onQueryChange={setGuildQuery} />
        )}
        {tab === "sceaux" && <SceauxTab onGuildClick={goToGuild} />}
        {tab === "personnages" && (
          <PersonnagesTab
            query={characterQuery}
            onQueryChange={setCharacterQuery}
            onGuildClick={goToGuild}
          />
        )}
        {tab === "croyances" && <CroyancesTab />}
        {tab === "sabliers" &&
          (sablierSummary ? (
            <SabliersTab
              summary={sablierSummary}
              onCharacterClick={goToCharacter}
            />
          ) : (
            <p className="text-sm text-foreground/60">Chargement…</p>
          ))}
      </div>
    </div>
  );
}

export default function JeuPage() {
  return (
    <RequireFeature feature="jeu">
      <JeuContent />
    </RequireFeature>
  );
}
