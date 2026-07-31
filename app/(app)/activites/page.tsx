"use client";

import {
  BookText,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock,
  Download,
  Feather,
  FileDown,
  FileStack,
  FlagTriangleRight,
  Import,
  Map as MapIcon,
  Mountain,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  Swords,
  Ticket,
  Trash2,
  Upload,
  Variable,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { glofters } from "@/app/fonts/glofters";
import RequireFeature from "@/components/require-feature";
import RichTextEditor from "@/components/rich-text-editor";
import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_CATEGORY_STYLES,
  getActivityDetailTemplate,
  saveActivityDetailTemplate,
  updateActivityDetails,
  updateActivityGameText,
  updateActivityVariables,
  type Activity,
  type ActivityDetails,
  type ActivityInput,
  type ActivityVariables,
} from "@/lib/activities";
import {
  buildFrontsExportInfo,
  downloadBlob,
  exportActivityToDocx,
  mergeActivitySchedule,
} from "@/lib/activity-docx-export";
import {
  applyTemplateVariables,
  buildTemplateVariables,
} from "@/lib/activity-template-tokens";
import {
  CHAPTER_DURATION_OPTIONS,
  CHAPTER_HEALING_MODES,
  createActivityChapter,
  deleteActivityChapter,
  listActivityChapters,
  listAllActivityChapters,
  updateActivityChapter,
  type ActivityChapter,
  type ActivityChapterInput,
  type ActivityChapterWithActivity,
  type ChapterObjectiveInput,
} from "@/lib/activity-chapters";
import {
  FRONT_COLOR_STYLES,
  FRONT_COLORS,
  getActivityFrontAssignments,
  maxOrganizersFor,
  saveActivityFrontAssignments,
  type FrontAssignments,
  type FrontColor,
} from "@/lib/activity-fronts";
import {
  listScheduleBlocks,
  saveScheduleBlocks,
  type ScheduleBlockInput,
} from "@/lib/activity-schedule";
import {
  createBattlefield,
  deleteBattlefield,
  listBattlefields,
  renameBattlefield,
  type Battlefield,
} from "@/lib/battlefields";
import { searchCharacters, type Character } from "@/lib/characters";
import { listGuilds, type Guild } from "@/lib/guilds";
import { uploadMedia } from "@/lib/media-library";
import { getOwnProfile } from "@/lib/profile";
import { supabase } from "@/lib/supabase";

const MapEditor = dynamic(() => import("@/components/map-editor"), {
  ssr: false,
});

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
  const [nonParticipantsEnabled, setNonParticipantsEnabled] = useState(
    initial?.non_participants_enabled ?? false,
  );
  const [nonParticipantsMax, setNonParticipantsMax] = useState(
    initial?.non_participants_max != null
      ? String(initial.non_participants_max)
      : "",
  );
  const [marshalCount, setMarshalCount] = useState(
    initial?.marshal_count != null ? String(initial.marshal_count) : "",
  );
  const [healerCount, setHealerCount] = useState(
    initial?.healer_count != null ? String(initial.healer_count) : "",
  );
  const [campaignTeamCount, setCampaignTeamCount] = useState(
    initial?.campaign_team_count != null
      ? String(initial.campaign_team_count)
      : "",
  );
  const [receptionCount, setReceptionCount] = useState(
    initial?.reception_count != null ? String(initial.reception_count) : "",
  );
  const [weaponMasterCount, setWeaponMasterCount] = useState(
    initial?.weapon_master_count != null
      ? String(initial.weapon_master_count)
      : "",
  );
  const computeSuggestedRadioCount = () =>
    (parseInt(marshalCount, 10) || 0) +
    (parseInt(campaignTeamCount, 10) || 0) +
    (parseInt(healerCount, 10) || 0) +
    (parseInt(receptionCount, 10) || 0);

  const [radioCount, setRadioCount] = useState(
    initial?.radio_count != null
      ? String(initial.radio_count)
      : String(computeSuggestedRadioCount()),
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
      non_participants_enabled: nonParticipantsEnabled,
      non_participants_max: nonParticipantsEnabled
        ? parseInt(nonParticipantsMax, 10) || null
        : null,
      marshal_count: parseInt(marshalCount, 10) || null,
      healer_count: parseInt(healerCount, 10) || null,
      campaign_team_count: parseInt(campaignTeamCount, 10) || null,
      reception_count: parseInt(receptionCount, 10) || null,
      weapon_master_count: parseInt(weaponMasterCount, 10) || null,
      radio_count: parseInt(radioCount, 10) || null,
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
        className="flex max-h-[85vh] w-full max-w-sm flex-col gap-3 overflow-y-auto rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900"
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

        <label className="flex items-center gap-2 text-sm text-foreground/70">
          <input
            type="checkbox"
            checked={nonParticipantsEnabled}
            onChange={(e) => setNonParticipantsEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-black/[.08] dark:border-white/[.145]"
          />
          Activer les non-participants
        </label>
        {nonParticipantsEnabled && (
          <label className="flex items-center justify-between gap-2 text-sm text-foreground/70">
            Nombre maximum de non-participants
            <input
              type="number"
              min={0}
              value={nonParticipantsMax}
              onChange={(e) => setNonParticipantsMax(e.target.value)}
              className="w-24 rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
            />
          </label>
        )}

        <label className="flex items-center justify-between gap-2 text-sm text-foreground/70">
          Nombre de maréchaux
          <input
            type="number"
            min={0}
            value={marshalCount}
            onChange={(e) => setMarshalCount(e.target.value)}
            className="w-24 rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
          />
        </label>
        <label className="flex items-center justify-between gap-2 text-sm text-foreground/70">
          Nombre de soigneurs prévus
          <input
            type="number"
            min={0}
            value={healerCount}
            onChange={(e) => setHealerCount(e.target.value)}
            className="w-24 rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
          />
        </label>
        <label className="flex items-center justify-between gap-2 text-sm text-foreground/70">
          Équipe campagne
          <input
            type="number"
            min={0}
            value={campaignTeamCount}
            onChange={(e) => setCampaignTeamCount(e.target.value)}
            className="w-24 rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
          />
        </label>
        <label className="flex items-center justify-between gap-2 text-sm text-foreground/70">
          Accueil
          <input
            type="number"
            min={0}
            value={receptionCount}
            onChange={(e) => setReceptionCount(e.target.value)}
            className="w-24 rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
          />
        </label>
        <label className="flex items-center justify-between gap-2 text-sm text-foreground/70">
          Maîtres d&apos;armes
          <input
            type="number"
            min={0}
            value={weaponMasterCount}
            onChange={(e) => setWeaponMasterCount(e.target.value)}
            className="w-24 rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
          />
        </label>
        <label className="flex items-center justify-between gap-2 text-sm text-foreground/70">
          Nombre de radios
          <span className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              value={radioCount}
              onChange={(e) => setRadioCount(e.target.value)}
              className="w-24 rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
            />
            <button
              type="button"
              onClick={() =>
                setRadioCount(String(computeSuggestedRadioCount()))
              }
              aria-label="Recalculer à partir des effectifs (maréchaux, équipe campagne, soigneurs, accueil)"
              title="Recalculer à partir des effectifs (maréchaux, équipe campagne, soigneurs, accueil)"
              className="rounded-full p-2 text-foreground/60 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
            >
              <RefreshCw size={14} />
            </button>
          </span>
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

function BattlefieldsModal({ onClose }: { onClose: () => void }) {
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-sm flex-col gap-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900"
      >
        <h2 className="font-semibold text-foreground">Champs de bataille</h2>

        {isLoading ? (
          <p className="text-sm text-foreground/60">Chargement…</p>
        ) : (
          <div className="flex flex-col gap-2">
            {battlefields.length === 0 && (
              <p className="text-sm text-foreground/60">
                Aucun champ de bataille pour l&apos;instant.
              </p>
            )}
            {battlefields.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-2 rounded-lg border border-black/[.08] p-2 dark:border-white/[.145]"
              >
                {editingId === b.id ? (
                  <>
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="flex-1 rounded border border-black/[.08] bg-white px-2 py-1 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleRename(b.id)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Enregistrer
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-foreground">
                      {b.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(b.id);
                        setEditingName(b.name);
                      }}
                      aria-label="Modifier"
                      className="rounded-full p-1.5 text-foreground/60 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                    >
                      <Feather size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(b)}
                      aria-label="Supprimer"
                      className="rounded-full p-1.5 text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleCreate} className="flex items-center gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nouveau champ de bataille…"
            className="flex-1 rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
          />
          <button
            type="submit"
            className="rounded-full bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390]"
          >
            <Plus size={16} />
          </button>
        </form>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="mt-1 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

const chapterFieldClassName =
  "rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800";

type ObjectiveFormRow = {
  key: string;
  description: string;
  rewardsDetail: string;
  percentage: string;
};

function ChapterForm({
  activityId,
  initial,
  position,
  onClose,
  onSaved,
}: {
  activityId: string;
  initial?: ActivityChapter;
  position: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [gameText, setGameText] = useState(initial?.game_text ?? "");
  const [terrainLimits, setTerrainLimits] = useState(
    initial?.terrain_limits ?? "",
  );
  const [battlefields, setBattlefields] = useState<Battlefield[]>([]);
  const [selectedBattlefieldIds, setSelectedBattlefieldIds] = useState<
    string[]
  >(initial?.battlefields.map((b) => b.id) ?? []);
  const [duration, setDuration] = useState(initial?.duration ?? "");
  const [isCustomDuration, setIsCustomDuration] = useState(
    () =>
      Boolean(initial?.duration) &&
      !(CHAPTER_DURATION_OPTIONS as readonly string[]).includes(
        initial?.duration ?? "",
      ),
  );
  const [startTime, setStartTime] = useState(initial?.start_time ?? "");
  const [healingModes, setHealingModes] = useState<string[]>(
    initial?.healing_mode ?? [],
  );
  const [healingModeDetails, setHealingModeDetails] = useState(
    initial?.healing_mode_details ?? "",
  );
  const [objectiveRows, setObjectiveRows] = useState<ObjectiveFormRow[]>(
    () =>
      initial?.objectives.map((o) => ({
        key: o.id,
        description: o.description ?? "",
        rewardsDetail: o.rewards_detail ?? "",
        percentage: String(o.percentage),
      })) ?? [],
  );
  const [mapUrl, setMapUrl] = useState(initial?.map_url ?? "");
  const [specialRules, setSpecialRules] = useState(
    initial?.special_rules ?? "",
  );
  const [specialElements, setSpecialElements] = useState(
    initial?.special_elements ?? "",
  );
  const [monstersWarMachines, setMonstersWarMachines] = useState(
    initial?.monsters_war_machines ?? "",
  );
  const [isUploadingMap, setIsUploadingMap] = useState(false);
  const [isMapEditorOpen, setIsMapEditorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listBattlefields().then(setBattlefields);
  }, []);

  const toggleBattlefield = (id: string) => {
    setSelectedBattlefieldIds((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id],
    );
  };

  const toggleHealingMode = (mode: string) => {
    setHealingModes((prev) =>
      prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode],
    );
  };

  const addObjective = () => {
    setObjectiveRows((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        description: "",
        rewardsDetail: "",
        percentage: "",
      },
    ]);
  };

  const updateObjective = (
    key: string,
    field: "description" | "rewardsDetail" | "percentage",
    value: string,
  ) => {
    setObjectiveRows((prev) =>
      prev.map((o) => (o.key === key ? { ...o, [field]: value } : o)),
    );
  };

  const removeObjective = (key: string) => {
    setObjectiveRows((prev) => prev.filter((o) => o.key !== key));
  };

  const totalPercentage = objectiveRows.reduce(
    (sum, o) => sum + (parseFloat(o.percentage) || 0),
    0,
  );

  const handleMapUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setIsUploadingMap(true);
    try {
      const uploaded = await uploadMedia(file, "chapitres");
      setMapUrl(uploaded.url);
    } catch {
      setError("Échec du téléversement de la carte.");
    } finally {
      setIsUploadingMap(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    const objective_inputs: ChapterObjectiveInput[] = objectiveRows.map(
      (o, index) => ({
        description: o.description || null,
        rewards_detail: o.rewardsDetail || null,
        percentage: parseFloat(o.percentage) || 0,
        position: index,
      }),
    );

    const payload: ActivityChapterInput = {
      activity_id: activityId,
      title,
      game_text: gameText || null,
      terrain_limits: terrainLimits || null,
      battlefield_ids: selectedBattlefieldIds,
      duration: duration || null,
      start_time: startTime || null,
      healing_mode: healingModes.length > 0 ? healingModes : null,
      healing_mode_details: healingModeDetails || null,
      objective_inputs,
      map_url: mapUrl || null,
      special_rules: specialRules || null,
      special_elements: specialElements || null,
      monsters_war_machines: monstersWarMachines || null,
      position,
    };

    try {
      if (initial) {
        await updateActivityChapter(initial.id, payload);
      } else {
        await createActivityChapter(payload);
      }
      await onSaved();
      onClose();
    } catch {
      setError("Échec de l'enregistrement.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <h3 className="font-semibold text-foreground">
        {initial ? "Modifier le chapitre" : "Nouveau chapitre"}
      </h3>
      <input
        type="text"
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titre"
        className={chapterFieldClassName}
      />
      <RichTextEditor
        value={gameText}
        onChange={setGameText}
        placeholder="Texte jeu"
      />
      <div>
        <label className="mb-1 block text-sm font-semibold text-foreground">
          Champs de bataille
        </label>
        {battlefields.length === 0 ? (
          <p className="text-xs text-foreground/40">
            Aucun champ de bataille défini — gère-les depuis le bouton
            &quot;Champs de bataille&quot; de la page Activités.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {battlefields.map((b) => {
              const isSelected = selectedBattlefieldIds.includes(b.id);
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => toggleBattlefield(b.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    isSelected
                      ? "border-primary bg-primary text-white"
                      : "border-black/[.08] text-foreground/70 hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
                  }`}
                >
                  {b.name}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-foreground">
          Limites de terrain
        </label>
        <RichTextEditor
          value={terrainLimits}
          onChange={setTerrainLimits}
          placeholder="Détailler les limites de terrain"
          minHeight="5rem"
        />
      </div>
      <label className="mb-1 block text-sm font-semibold text-foreground">
        Temps
      </label>
      <div className="grid grid-cols-2 gap-3">
        <select
          required={!isCustomDuration}
          value={isCustomDuration ? "custom" : duration}
          onChange={(e) => {
            if (e.target.value === "custom") {
              setIsCustomDuration(true);
              setDuration("");
            } else {
              setIsCustomDuration(false);
              setDuration(e.target.value);
            }
          }}
          className={chapterFieldClassName}
        >
          <option value="" disabled>
            Durée…
          </option>
          {CHAPTER_DURATION_OPTIONS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
          <option value="custom">Personnalisée…</option>
        </select>
        <input
          type="time"
          required
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className={chapterFieldClassName}
        />
      </div>
      {isCustomDuration && (
        <input
          type="text"
          required
          autoFocus
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="Durée personnalisée (ex. 45 minutes)"
          className={chapterFieldClassName}
        />
      )}
      <div>
        <label className="mb-1 block text-sm font-semibold text-foreground">
          Mode de guérison
        </label>
        <div className="flex flex-wrap gap-2">
          {CHAPTER_HEALING_MODES.map((m) => {
            const isSelected = healingModes.includes(m);
            return (
              <button
                key={m}
                type="button"
                onClick={() => toggleHealingMode(m)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  isSelected
                    ? "border-primary bg-primary text-white"
                    : "border-black/[.08] text-foreground/70 hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
                }`}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>
      <RichTextEditor
        value={healingModeDetails}
        onChange={setHealingModeDetails}
        placeholder="Détail du mode de guérison"
      />
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="text-sm font-semibold text-foreground">
            Objectifs
          </label>
          <span
            className={`text-xs font-medium ${
              totalPercentage === 100
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            Total : {totalPercentage}%
          </span>
        </div>
        <div className="flex flex-col gap-3">
          {objectiveRows.map((o, index) => (
            <div
              key={o.key}
              className="flex flex-col gap-2 rounded-lg border border-black/[.08] p-3 dark:border-white/[.145]"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  Objectif {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeObjective(o.key)}
                  aria-label="Retirer l'objectif"
                  className="text-foreground/50 hover:text-foreground"
                >
                  <X size={14} />
                </button>
              </div>
              <label className="text-sm font-semibold text-foreground">
                Objectifs et mécaniques
              </label>
              <RichTextEditor
                value={o.description}
                onChange={(html) => updateObjective(o.key, "description", html)}
                placeholder="Détailler l'objectif et les mécaniques de jeu"
                minHeight="5rem"
              />
              <label className="text-sm font-semibold text-foreground">
                Gains
              </label>
              <RichTextEditor
                value={o.rewardsDetail}
                onChange={(html) =>
                  updateObjective(o.key, "rewardsDetail", html)
                }
                placeholder="Détailler les gains reliés"
                minHeight="5rem"
              />
              <label className="flex items-center gap-2 text-sm text-foreground/70">
                Valeur
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={o.percentage}
                  onChange={(e) =>
                    updateObjective(o.key, "percentage", e.target.value)
                  }
                  className={`w-24 ${chapterFieldClassName}`}
                />
                %
              </label>
            </div>
          ))}
          {objectiveRows.length === 0 && (
            <p className="text-xs text-foreground/40">
              Aucun objectif pour l&apos;instant.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={addObjective}
          className="mt-2 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <Plus size={14} />
          Ajouter un objectif
        </button>
      </div>
      <label className="mb-1 block text-sm font-semibold text-foreground">
        Règles spéciales
      </label>
      <RichTextEditor
        value={specialRules}
        onChange={setSpecialRules}
        placeholder="Détailler les règles spéciales"
        minHeight="5rem"
      />
      <label className="mb-1 block text-sm font-semibold text-foreground">
        Éléments spéciaux
      </label>
      <RichTextEditor
        value={specialElements}
        onChange={setSpecialElements}
        placeholder="Détailler les éléments spéciaux"
        minHeight="5rem"
      />
      <label className="mb-1 block text-sm font-semibold text-foreground">
        Monstres et machines de guerre
      </label>
      <RichTextEditor
        value={monstersWarMachines}
        onChange={setMonstersWarMachines}
        placeholder="Détailler les monstres et machines de guerre"
        minHeight="5rem"
      />

      <div>
        <label className="mb-1 block text-sm font-semibold text-foreground">
          Carte
        </label>
        {mapUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mapUrl}
            alt="Carte du chapitre"
            className="mb-2 max-h-40 rounded border border-black/[.08] dark:border-white/[.145]"
          />
        )}
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex w-fit cursor-pointer items-center gap-2 rounded-full border border-black/[.08] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]">
            <Upload size={14} />
            {isUploadingMap
              ? "Téléversement…"
              : mapUrl
                ? "Remplacer la carte"
                : "Téléverser une carte"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={isUploadingMap}
              onChange={handleMapUpload}
            />
          </label>
          <button
            type="button"
            onClick={() => setIsMapEditorOpen(true)}
            className="flex items-center gap-2 rounded-full border border-black/[.08] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
          >
            <MapIcon size={14} />
            Éditeur de carte
          </button>
        </div>
      </div>

      {isMapEditorOpen && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-background">
          <MapEditor
            embedded
            onCancel={() => setIsMapEditorOpen(false)}
            onAttach={({ url }) => {
              setMapUrl(url);
              setIsMapEditorOpen(false);
            }}
          />
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
          type="submit"
          disabled={isSaving || isUploadingMap}
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}

function ActivityChaptersModal({
  activity,
  onClose,
}: {
  activity: Activity;
  onClose: () => void;
}) {
  const [chapters, setChapters] = useState<ActivityChapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<"list" | "form" | "import">("list");
  const [editingChapter, setEditingChapter] = useState<ActivityChapter | null>(
    null,
  );
  const [libraryChapters, setLibraryChapters] = useState<
    ActivityChapterWithActivity[]
  >([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [importingId, setImportingId] = useState<string | null>(null);

  const fetchChapters = async () => {
    const data = await listActivityChapters(activity.id);
    setChapters(data);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchChapters resolves before the loading flag is cleared
    fetchChapters().finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity.id]);

  const handleDelete = async (chapter: ActivityChapter) => {
    if (!window.confirm(`Supprimer le chapitre "${chapter.title}" ?`)) return;
    await deleteActivityChapter(chapter.id);
    setChapters((prev) => prev.filter((c) => c.id !== chapter.id));
  };

  const openImport = () => {
    setView("import");
    setIsLoadingLibrary(true);
    listAllActivityChapters()
      .then(setLibraryChapters)
      .finally(() => setIsLoadingLibrary(false));
  };

  const handleImport = async (source: ActivityChapterWithActivity) => {
    setImportingId(source.id);
    try {
      const newId = await createActivityChapter({
        activity_id: activity.id,
        title: source.title,
        game_text: source.game_text,
        terrain_limits: source.terrain_limits,
        duration: source.duration,
        start_time: source.start_time,
        healing_mode: source.healing_mode,
        healing_mode_details: source.healing_mode_details,
        map_url: source.map_url,
        special_rules: source.special_rules,
        special_elements: source.special_elements,
        monsters_war_machines: source.monsters_war_machines,
        position: chapters.length,
        battlefield_ids: source.battlefields.map((b) => b.id),
        objective_inputs: source.objectives.map((o, index) => ({
          description: o.description,
          rewards_detail: o.rewards_detail,
          percentage: o.percentage,
          position: index,
        })),
      });
      const refreshed = await listActivityChapters(activity.id);
      setChapters(refreshed);
      const created = refreshed.find((c) => c.id === newId) ?? null;
      setEditingChapter(created);
      setView("form");
    } finally {
      setImportingId(null);
    }
  };

  const visibleLibraryChapters = libraryChapters.filter((c) => {
    const q = libraryQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      c.title.toLowerCase().includes(q) ||
      c.activity_name.toLowerCase().includes(q)
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col gap-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900"
      >
        {view === "list" ? (
          <>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">
                Chapitres — {activity.name}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openImport}
                  className="flex items-center gap-2 rounded-full border border-black/[.08] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
                >
                  <Import size={14} />
                  Importer un chapitre
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingChapter(null);
                    setView("form");
                  }}
                  className="flex items-center gap-2 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#0c4390]"
                >
                  <Plus size={14} />
                  Ajouter un chapitre
                </button>
              </div>
            </div>

            {isLoading && (
              <p className="text-sm text-foreground/60">Chargement…</p>
            )}
            {!isLoading && chapters.length === 0 && (
              <p className="text-sm text-foreground/60">
                Aucun chapitre pour l&apos;instant.
              </p>
            )}
            {!isLoading && chapters.length > 0 && (
              <div className="flex flex-col gap-2">
                {chapters.map((chapter) => (
                  <div
                    key={chapter.id}
                    className="flex items-center justify-between rounded-lg border border-black/[.08] p-3 dark:border-white/[.145]"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {chapter.title}
                      </p>
                      {(chapter.duration || chapter.start_time) && (
                        <p className="text-xs text-foreground/60">
                          {chapter.start_time}
                          {chapter.start_time && chapter.duration ? " — " : ""}
                          {chapter.duration}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingChapter(chapter);
                          setView("form");
                        }}
                        aria-label="Modifier"
                        className="rounded-full p-2 text-foreground/60 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                      >
                        <Feather size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(chapter)}
                        aria-label="Supprimer"
                        className="rounded-full p-2 text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-1 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
              >
                Fermer
              </button>
            </div>
          </>
        ) : view === "form" ? (
          <ChapterForm
            activityId={activity.id}
            initial={editingChapter ?? undefined}
            position={editingChapter?.position ?? chapters.length}
            onClose={() => setView("list")}
            onSaved={async () => {
              await fetchChapters();
            }}
          />
        ) : (
          <>
            <h2 className="font-semibold text-foreground">
              Importer un chapitre
            </h2>
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40"
              />
              <input
                type="text"
                value={libraryQuery}
                onChange={(e) => setLibraryQuery(e.target.value)}
                placeholder="Rechercher par titre ou activité…"
                className="w-full rounded-full border border-black/[.08] bg-white py-2 pl-9 pr-3 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
              />
            </div>

            {isLoadingLibrary && (
              <p className="text-sm text-foreground/60">Chargement…</p>
            )}
            {!isLoadingLibrary && visibleLibraryChapters.length === 0 && (
              <p className="text-sm text-foreground/60">
                Aucun chapitre disponible.
              </p>
            )}
            {!isLoadingLibrary && visibleLibraryChapters.length > 0 && (
              <div className="flex flex-col gap-2">
                {visibleLibraryChapters.map((chapter) => (
                  <div
                    key={chapter.id}
                    className="flex items-center justify-between rounded-lg border border-black/[.08] p-3 dark:border-white/[.145]"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {chapter.title}
                      </p>
                      <p className="text-xs text-foreground/60">
                        {chapter.activity_name}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleImport(chapter)}
                      disabled={importingId === chapter.id}
                      className="rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#0c4390] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {importingId === chapter.id ? "…" : "Importer"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-1 flex justify-end">
              <button
                type="button"
                onClick={() => setView("list")}
                className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
              >
                Retour
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

type DetailsTab = "inscription" | "horaire" | "elements" | "contact";
type ActivityTab = "variables" | DetailsTab;

const DETAILS_TABS: { key: DetailsTab; label: string; icon: typeof Ticket }[] =
  [
    { key: "inscription", label: "Inscription", icon: Ticket },
    { key: "horaire", label: "Horaire", icon: Clock },
    { key: "elements", label: "Éléments jeux", icon: Swords },
    { key: "contact", label: "Nous joindre", icon: Phone },
  ];

const ACTIVITY_DETAILS_TABS: {
  key: ActivityTab;
  label: string;
  icon: typeof Ticket;
}[] = [
  { key: "variables", label: "Variables", icon: Variable },
  ...DETAILS_TABS,
];

type ScheduleFormRow = {
  key: string;
  label: string;
  startTime: string;
  duration: string;
};

type ScheduleDisplayRow = {
  key: string;
  label: string;
  startTime: string;
  duration: string;
  isChapter: boolean;
};

function ActivityDetailsModal({
  activity,
  onClose,
}: {
  activity: Activity;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<ActivityTab>("variables");

  const [gameText, setGameText] = useState(activity.game_text ?? "");

  const [bonusParticipants, setBonusParticipants] = useState(
    activity.bonus_participants ?? "",
  );
  const [bonus2Participants, setBonus2Participants] = useState(
    activity.bonus2_participants ?? "",
  );

  const [registrationParticipantsPricing, setRegistrationParticipantsPricing] =
    useState(activity.registration_participants_pricing ?? "");
  const [registrationParticipantsHowto, setRegistrationParticipantsHowto] =
    useState(activity.registration_participants_howto ?? "");
  const [
    registrationNonParticipantsPricing,
    setRegistrationNonParticipantsPricing,
  ] = useState(activity.registration_non_participants_pricing ?? "");
  const [
    registrationNonParticipantsHowto,
    setRegistrationNonParticipantsHowto,
  ] = useState(activity.registration_non_participants_howto ?? "");
  const [scheduleIntro, setScheduleIntro] = useState(
    activity.schedule_intro ?? "",
  );
  const [scheduleOutro, setScheduleOutro] = useState(
    activity.schedule_outro ?? "",
  );
  const [gameSecurity, setGameSecurity] = useState(
    activity.game_security ?? "",
  );
  const [gameStaff, setGameStaff] = useState(activity.game_staff ?? "");
  const [gameRewards, setGameRewards] = useState(activity.game_rewards ?? "");
  const [gameRules, setGameRules] = useState(activity.game_rules ?? "");
  const [gameDeathHealing, setGameDeathHealing] = useState(
    activity.game_death_healing ?? "",
  );
  const [gameVaria, setGameVaria] = useState(activity.game_varia ?? "");
  const [contactInfo, setContactInfo] = useState(activity.contact_info ?? "");

  const [fronts, setFronts] = useState<FrontAssignments | null>(null);
  const [chapters, setChapters] = useState<ActivityChapter[]>([]);
  const [scheduleRows, setScheduleRows] = useState<ScheduleFormRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getActivityFrontAssignments(activity.id),
      listActivityChapters(activity.id),
      listScheduleBlocks(activity.id),
    ])
      .then(([frontAssignments, chapterList, blocks]) => {
        setFronts(frontAssignments);
        setChapters(chapterList);
        setScheduleRows(
          blocks.map((b) => ({
            key: b.id,
            label: b.label,
            startTime: b.start_time ?? "",
            duration: b.duration ?? "",
          })),
        );
      })
      .finally(() => setIsLoading(false));
  }, [activity.id]);

  const addScheduleRow = () => {
    setScheduleRows((prev) => [
      ...prev,
      { key: crypto.randomUUID(), label: "", startTime: "", duration: "" },
    ]);
  };

  const updateScheduleRow = (
    key: string,
    field: "label" | "startTime" | "duration",
    value: string,
  ) => {
    setScheduleRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)),
    );
  };

  const removeScheduleRow = (key: string) => {
    setScheduleRows((prev) => prev.filter((r) => r.key !== key));
  };

  const combinedSchedule: ScheduleDisplayRow[] = [
    ...chapters.map((c) => ({
      key: c.id,
      label: c.title,
      startTime: c.start_time ?? "",
      duration: c.duration ?? "",
      isChapter: true,
    })),
    ...scheduleRows.map((r) => ({ ...r, isChapter: false })),
  ].sort((a, b) => a.startTime.localeCompare(b.startTime));

  const activeFrontColors = fronts
    ? FRONT_COLORS.filter(
        (c) => fronts[c].guilds.length > 0 || fronts[c].organizers.length > 0,
      )
    : [];

  const buildDetailsPayload = (): ActivityDetails => ({
    registration_participants_pricing: registrationParticipantsPricing || null,
    registration_participants_howto: registrationParticipantsHowto || null,
    registration_non_participants_pricing:
      registrationNonParticipantsPricing || null,
    registration_non_participants_howto:
      registrationNonParticipantsHowto || null,
    schedule_intro: scheduleIntro || null,
    schedule_outro: scheduleOutro || null,
    game_security: gameSecurity || null,
    game_staff: gameStaff || null,
    game_rewards: gameRewards || null,
    game_rules: gameRules || null,
    game_death_healing: gameDeathHealing || null,
    game_varia: gameVaria || null,
    contact_info: contactInfo || null,
  });

  const applyDetails = (details: ActivityDetails) => {
    setRegistrationParticipantsPricing(
      details.registration_participants_pricing ?? "",
    );
    setRegistrationParticipantsHowto(
      details.registration_participants_howto ?? "",
    );
    setRegistrationNonParticipantsPricing(
      details.registration_non_participants_pricing ?? "",
    );
    setRegistrationNonParticipantsHowto(
      details.registration_non_participants_howto ?? "",
    );
    setScheduleIntro(details.schedule_intro ?? "");
    setScheduleOutro(details.schedule_outro ?? "");
    setGameSecurity(details.game_security ?? "");
    setGameStaff(details.game_staff ?? "");
    setGameRewards(details.game_rewards ?? "");
    setGameRules(details.game_rules ?? "");
    setGameDeathHealing(details.game_death_healing ?? "");
    setGameVaria(details.game_varia ?? "");
    setContactInfo(details.contact_info ?? "");
  };

  const handleLoadTemplate = async () => {
    if (
      !window.confirm(
        "Remplacer le contenu actuel (inscriptions, éléments jeux, nous joindre) par le modèle enregistré ?",
      )
    )
      return;
    setError(null);
    setIsApplyingTemplate(true);
    try {
      const template = await getActivityDetailTemplate();
      const vars = buildTemplateVariables({
        date: activity.date,
        participants_per_front: activity.participants_per_front,
        non_participants_max: activity.non_participants_max,
        bonus_participants: bonusParticipants || null,
        bonus2_participants: bonus2Participants || null,
      });
      const substituted = Object.fromEntries(
        Object.entries(template).map(([key, val]) => [
          key,
          typeof val === "string" ? applyTemplateVariables(val, vars) : val,
        ]),
      ) as ActivityDetails;
      applyDetails(substituted);
    } catch {
      setError("Échec du chargement du modèle.");
    } finally {
      setIsApplyingTemplate(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (
      !window.confirm(
        "Enregistrer ce contenu comme nouveau modèle par défaut pour les prochaines activités ?",
      )
    )
      return;
    setError(null);
    setIsSavingTemplate(true);
    try {
      await saveActivityDetailTemplate(buildDetailsPayload());
    } catch {
      setError("Échec de l'enregistrement du modèle.");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await updateActivityGameText(activity.id, {
        game_text: gameText || null,
      });
      await updateActivityDetails(activity.id, buildDetailsPayload());

      const variables: ActivityVariables = {
        bonus_participants: bonusParticipants || null,
        bonus2_participants: bonus2Participants || null,
      };
      await updateActivityVariables(activity.id, variables);

      const blockInputs: ScheduleBlockInput[] = scheduleRows.map(
        (r, index) => ({
          label: r.label,
          start_time: r.startTime || null,
          duration: r.duration || null,
          position: index,
        }),
      );
      await saveScheduleBlocks(activity.id, blockInputs);
      onClose();
    } catch {
      setError("Échec de l'enregistrement.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportDocx = async () => {
    setError(null);
    setIsExportingDocx(true);
    try {
      const blob = await exportActivityToDocx({
        name: activity.name,
        date: formatActivityDate(activity.date),
        gameText,
        registrationParticipantsPricing,
        registrationParticipantsHowto,
        fronts: fronts ? buildFrontsExportInfo(fronts) : [],
        registrationNonParticipantsPricing,
        registrationNonParticipantsHowto,
        scheduleIntro,
        schedule: combinedSchedule,
        scheduleOutro,
        gameSecurity,
        gameStaff,
        gameRewards,
        gameRules,
        gameDeathHealing,
        gameVaria,
        contactInfo,
      });
      downloadBlob(blob, `${activity.name}.docx`);
    } catch {
      setError("Échec de l'exportation Word.");
    } finally {
      setIsExportingDocx(false);
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
        className="flex max-h-[85vh] w-full max-w-3xl flex-col gap-4 overflow-hidden rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">
            Détails — {activity.name}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportDocx}
              disabled={isExportingDocx}
              className="flex items-center gap-2 rounded-full border border-black/[.08] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
            >
              <FileDown size={14} />
              {isExportingDocx ? "…" : "Exporter en Word"}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="rounded-full p-1 hover:bg-black/[.04] dark:hover:bg-white/[.08]"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold text-foreground">
            Texte jeu
          </label>
          <RichTextEditor
            value={gameText}
            onChange={setGameText}
            placeholder="Texte jeu de la campagne"
            minHeight="4rem"
          />
        </div>

        <div className="flex gap-2 border-b border-black/[.08] dark:border-white/[.08]">
          {ACTIVITY_DETAILS_TABS.map((t) => {
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

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-foreground/50">
            Modèle : contenu réutilisable d&apos;une activité à l&apos;autre
            (inscriptions, éléments jeux, nous joindre).
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLoadTemplate}
              disabled={isApplyingTemplate}
              className="flex items-center gap-1 rounded-full border border-black/[.08] px-3 py-1.5 font-medium transition-colors hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
            >
              <Download size={14} />
              {isApplyingTemplate ? "…" : "Charger le modèle"}
            </button>
            <button
              type="button"
              onClick={handleSaveAsTemplate}
              disabled={isSavingTemplate}
              className="flex items-center gap-1 rounded-full border border-black/[.08] px-3 py-1.5 font-medium transition-colors hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
            >
              <Save size={14} />
              {isSavingTemplate ? "…" : "Enregistrer comme modèle"}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          {isLoading ? (
            <p className="text-sm text-foreground/60">Chargement…</p>
          ) : (
            <>
              {tab === "variables" && (
                <div className="flex flex-col gap-4">
                  <p className="text-xs text-foreground/50">
                    Ces valeurs remplacent automatiquement les jetons (ex.
                    [BONUSPARTICIPANTS]) présents dans le texte du modèle
                    lorsque tu cliques sur &quot;Charger le modèle&quot;.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1 text-sm text-foreground/70">
                      Bonus de participants
                      <input
                        type="text"
                        value={bonusParticipants}
                        onChange={(e) => setBonusParticipants(e.target.value)}
                        className={chapterFieldClassName}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm text-foreground/70">
                      Bonus de participants (palier 2)
                      <input
                        type="text"
                        value={bonus2Participants}
                        onChange={(e) => setBonus2Participants(e.target.value)}
                        className={chapterFieldClassName}
                      />
                    </label>
                  </div>
                </div>
              )}

              {tab === "inscription" && (
                <div className="flex flex-col gap-5">
                  <div>
                    <h3 className="mb-2 font-semibold text-foreground">
                      Participants
                    </h3>
                    <label className="mb-1 block text-sm font-semibold text-foreground">
                      Tarifs
                    </label>
                    <RichTextEditor
                      value={registrationParticipantsPricing}
                      onChange={setRegistrationParticipantsPricing}
                      placeholder="Détailler les tarifs"
                      minHeight="5rem"
                    />
                    <label className="mb-1 mt-3 block text-sm font-semibold text-foreground">
                      Pour vous inscrire
                    </label>
                    <RichTextEditor
                      value={registrationParticipantsHowto}
                      onChange={setRegistrationParticipantsHowto}
                      placeholder="Détailler la marche à suivre pour s'inscrire"
                      minHeight="5rem"
                    />

                    <label className="mb-1 mt-3 block text-sm font-semibold text-foreground">
                      Fronts et organisateurs
                    </label>
                    {fronts && activeFrontColors.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {activeFrontColors.map((color) => (
                          <div
                            key={color}
                            className="rounded-lg border border-black/[.08] p-3 text-sm dark:border-white/[.145]"
                          >
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-medium ${FRONT_COLOR_STYLES[color]}`}
                            >
                              {color}
                            </span>
                            <p className="mt-1 text-foreground/80">
                              {fronts[color].guilds
                                .map((g) => g.name)
                                .join(", ") || "Aucune guilde"}
                            </p>
                            <p className="text-foreground/60">
                              Organisateurs :{" "}
                              {fronts[color].organizers
                                .map(
                                  (o) =>
                                    o.name + (o.email ? ` — ${o.email}` : ""),
                                )
                                .join(", ") || "Aucun"}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-foreground/40">
                        Aucun front configuré — gère-les depuis le bouton
                        &quot;Fronts&quot; de cette activité.
                      </p>
                    )}
                  </div>

                  <div>
                    <h3 className="mb-2 font-semibold text-foreground">
                      Non-participants
                    </h3>
                    <label className="mb-1 block text-sm font-semibold text-foreground">
                      Tarifs
                    </label>
                    <RichTextEditor
                      value={registrationNonParticipantsPricing}
                      onChange={setRegistrationNonParticipantsPricing}
                      placeholder="Détailler les tarifs"
                      minHeight="5rem"
                    />
                    <label className="mb-1 mt-3 block text-sm font-semibold text-foreground">
                      Pour vous inscrire
                    </label>
                    <RichTextEditor
                      value={registrationNonParticipantsHowto}
                      onChange={setRegistrationNonParticipantsHowto}
                      placeholder="Détailler la marche à suivre pour s'inscrire"
                      minHeight="5rem"
                    />
                  </div>
                </div>
              )}

              {tab === "horaire" && (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-foreground">
                      Texte avant l&apos;horaire
                    </label>
                    <RichTextEditor
                      value={scheduleIntro}
                      onChange={setScheduleIntro}
                      placeholder="Introduction affichée avant le tableau"
                      minHeight="4rem"
                    />
                  </div>

                  <div className="overflow-hidden rounded-lg border border-black/[.08] dark:border-white/[.145]">
                    <table className="w-full text-sm">
                      <thead className="bg-black/[.02] dark:bg-white/[.03]">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-foreground/70">
                            Heure
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-foreground/70">
                            Élément
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-foreground/70">
                            Durée
                          </th>
                          <th className="px-3 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {combinedSchedule.length === 0 && (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-3 py-3 text-center text-xs text-foreground/40"
                            >
                              Aucun élément à l&apos;horaire.
                            </td>
                          </tr>
                        )}
                        {combinedSchedule.map((row) =>
                          row.isChapter ? (
                            <tr
                              key={row.key}
                              className="border-t border-black/[.06] dark:border-white/[.08]"
                            >
                              <td className="px-3 py-2 text-foreground/80">
                                {row.startTime || "—"}
                              </td>
                              <td className="px-3 py-2 text-foreground/80">
                                {row.label}
                                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                                  Chapitre
                                </span>
                              </td>
                              <td className="px-3 py-2 text-foreground/80">
                                {row.duration || "—"}
                              </td>
                              <td className="px-3 py-2" />
                            </tr>
                          ) : (
                            <tr
                              key={row.key}
                              className="border-t border-black/[.06] dark:border-white/[.08]"
                            >
                              <td className="px-3 py-2">
                                <input
                                  type="time"
                                  value={row.startTime}
                                  onChange={(e) =>
                                    updateScheduleRow(
                                      row.key,
                                      "startTime",
                                      e.target.value,
                                    )
                                  }
                                  className={chapterFieldClassName}
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={row.label}
                                  onChange={(e) =>
                                    updateScheduleRow(
                                      row.key,
                                      "label",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Nom du bloc (ex. Accueil)"
                                  className={`w-full ${chapterFieldClassName}`}
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={row.duration}
                                  onChange={(e) =>
                                    updateScheduleRow(
                                      row.key,
                                      "duration",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Durée (ex. 30 minutes)"
                                  className={chapterFieldClassName}
                                />
                              </td>
                              <td className="px-3 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => removeScheduleRow(row.key)}
                                  aria-label="Retirer"
                                  className="text-foreground/50 hover:text-foreground"
                                >
                                  <X size={14} />
                                </button>
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                    <button
                      type="button"
                      onClick={addScheduleRow}
                      className="flex items-center gap-1 border-t border-black/[.06] px-3 py-2 text-xs font-medium text-primary hover:underline dark:border-white/[.08]"
                    >
                      <Plus size={14} />
                      Ajouter un bloc (accueil, homologation, dîner…)
                    </button>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-foreground">
                      Texte après l&apos;horaire
                    </label>
                    <RichTextEditor
                      value={scheduleOutro}
                      onChange={setScheduleOutro}
                      placeholder="Texte affiché après le tableau"
                      minHeight="4rem"
                    />
                  </div>
                </div>
              )}

              {tab === "elements" && (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-foreground">
                      Sécurité
                    </label>
                    <RichTextEditor
                      value={gameSecurity}
                      onChange={setGameSecurity}
                      minHeight="5rem"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-foreground">
                      États-major
                    </label>
                    <RichTextEditor
                      value={gameStaff}
                      onChange={setGameStaff}
                      minHeight="5rem"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-foreground">
                      Gains
                    </label>
                    <RichTextEditor
                      value={gameRewards}
                      onChange={setGameRewards}
                      minHeight="5rem"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-foreground">
                      Règles
                    </label>
                    <RichTextEditor
                      value={gameRules}
                      onChange={setGameRules}
                      minHeight="5rem"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-foreground">
                      Mort et guérison
                    </label>
                    <RichTextEditor
                      value={gameDeathHealing}
                      onChange={setGameDeathHealing}
                      minHeight="5rem"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-foreground">
                      Varia
                    </label>
                    <RichTextEditor
                      value={gameVaria}
                      onChange={setGameVaria}
                      minHeight="5rem"
                    />
                  </div>
                </div>
              )}

              {tab === "contact" && (
                <div>
                  <label className="mb-1 block text-sm font-semibold text-foreground">
                    Nous joindre
                  </label>
                  <RichTextEditor
                    value={contactInfo}
                    onChange={setContactInfo}
                    minHeight="8rem"
                  />
                </div>
              )}
            </>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="flex justify-end gap-2 border-t border-black/[.08] pt-3 dark:border-white/[.08]">
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

function DefaultTemplateModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<DetailsTab>("inscription");

  const [registrationParticipantsPricing, setRegistrationParticipantsPricing] =
    useState("");
  const [registrationParticipantsHowto, setRegistrationParticipantsHowto] =
    useState("");
  const [
    registrationNonParticipantsPricing,
    setRegistrationNonParticipantsPricing,
  ] = useState("");
  const [
    registrationNonParticipantsHowto,
    setRegistrationNonParticipantsHowto,
  ] = useState("");
  const [scheduleIntro, setScheduleIntro] = useState("");
  const [scheduleOutro, setScheduleOutro] = useState("");
  const [gameSecurity, setGameSecurity] = useState("");
  const [gameStaff, setGameStaff] = useState("");
  const [gameRewards, setGameRewards] = useState("");
  const [gameRules, setGameRules] = useState("");
  const [gameDeathHealing, setGameDeathHealing] = useState("");
  const [gameVaria, setGameVaria] = useState("");
  const [contactInfo, setContactInfo] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyDetails = (details: ActivityDetails) => {
    setRegistrationParticipantsPricing(
      details.registration_participants_pricing ?? "",
    );
    setRegistrationParticipantsHowto(
      details.registration_participants_howto ?? "",
    );
    setRegistrationNonParticipantsPricing(
      details.registration_non_participants_pricing ?? "",
    );
    setRegistrationNonParticipantsHowto(
      details.registration_non_participants_howto ?? "",
    );
    setScheduleIntro(details.schedule_intro ?? "");
    setScheduleOutro(details.schedule_outro ?? "");
    setGameSecurity(details.game_security ?? "");
    setGameStaff(details.game_staff ?? "");
    setGameRewards(details.game_rewards ?? "");
    setGameRules(details.game_rules ?? "");
    setGameDeathHealing(details.game_death_healing ?? "");
    setGameVaria(details.game_varia ?? "");
    setContactInfo(details.contact_info ?? "");
  };

  useEffect(() => {
    getActivityDetailTemplate()
      .then(applyDetails)
      .catch(() => setError("Impossible de charger le modèle."))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const details: ActivityDetails = {
        registration_participants_pricing:
          registrationParticipantsPricing || null,
        registration_participants_howto: registrationParticipantsHowto || null,
        registration_non_participants_pricing:
          registrationNonParticipantsPricing || null,
        registration_non_participants_howto:
          registrationNonParticipantsHowto || null,
        schedule_intro: scheduleIntro || null,
        schedule_outro: scheduleOutro || null,
        game_security: gameSecurity || null,
        game_staff: gameStaff || null,
        game_rewards: gameRewards || null,
        game_rules: gameRules || null,
        game_death_healing: gameDeathHealing || null,
        game_varia: gameVaria || null,
        contact_info: contactInfo || null,
      };
      await saveActivityDetailTemplate(details);
      onClose();
    } catch {
      setError("Échec de l'enregistrement du modèle.");
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
        className="flex max-h-[85vh] w-full max-w-3xl flex-col gap-4 overflow-hidden rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">
            Modèle par défaut des activités
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

        <p className="text-xs text-foreground/50">
          Ce texte sert de base réutilisable d&apos;une activité à l&apos;autre.
          Chaque activité peut ensuite le charger et l&apos;ajuster depuis son
          bouton &quot;Détails&quot;.
        </p>

        <div className="flex gap-2 border-b border-black/[.08] dark:border-white/[.08]">
          {DETAILS_TABS.map((t) => {
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

        <div className="flex-1 overflow-y-auto pr-1">
          {isLoading ? (
            <p className="text-sm text-foreground/60">Chargement…</p>
          ) : (
            <>
              {tab === "inscription" && (
                <div className="flex flex-col gap-5">
                  <div>
                    <h3 className="mb-2 font-semibold text-foreground">
                      Participants
                    </h3>
                    <label className="mb-1 block text-sm font-semibold text-foreground">
                      Tarifs
                    </label>
                    <RichTextEditor
                      value={registrationParticipantsPricing}
                      onChange={setRegistrationParticipantsPricing}
                      placeholder="Détailler les tarifs"
                      minHeight="5rem"
                    />
                    <label className="mb-1 mt-3 block text-sm font-semibold text-foreground">
                      Pour vous inscrire
                    </label>
                    <RichTextEditor
                      value={registrationParticipantsHowto}
                      onChange={setRegistrationParticipantsHowto}
                      placeholder="Détailler la marche à suivre pour s'inscrire"
                      minHeight="5rem"
                    />
                  </div>

                  <div>
                    <h3 className="mb-2 font-semibold text-foreground">
                      Non-participants
                    </h3>
                    <label className="mb-1 block text-sm font-semibold text-foreground">
                      Tarifs
                    </label>
                    <RichTextEditor
                      value={registrationNonParticipantsPricing}
                      onChange={setRegistrationNonParticipantsPricing}
                      placeholder="Détailler les tarifs"
                      minHeight="5rem"
                    />
                    <label className="mb-1 mt-3 block text-sm font-semibold text-foreground">
                      Pour vous inscrire
                    </label>
                    <RichTextEditor
                      value={registrationNonParticipantsHowto}
                      onChange={setRegistrationNonParticipantsHowto}
                      placeholder="Détailler la marche à suivre pour s'inscrire"
                      minHeight="5rem"
                    />
                  </div>
                </div>
              )}

              {tab === "horaire" && (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-foreground">
                      Texte avant l&apos;horaire
                    </label>
                    <RichTextEditor
                      value={scheduleIntro}
                      onChange={setScheduleIntro}
                      placeholder="Introduction affichée avant le tableau"
                      minHeight="5rem"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-foreground">
                      Texte après l&apos;horaire
                    </label>
                    <RichTextEditor
                      value={scheduleOutro}
                      onChange={setScheduleOutro}
                      placeholder="Texte affiché après le tableau"
                      minHeight="5rem"
                    />
                  </div>
                  <p className="text-xs text-foreground/40">
                    Le tableau de l&apos;horaire lui-même (chapitres et blocs de
                    temps) est propre à chaque activité et ne fait pas partie du
                    modèle.
                  </p>
                </div>
              )}

              {tab === "elements" && (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-foreground">
                      Sécurité
                    </label>
                    <RichTextEditor
                      value={gameSecurity}
                      onChange={setGameSecurity}
                      minHeight="5rem"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-foreground">
                      États-major
                    </label>
                    <RichTextEditor
                      value={gameStaff}
                      onChange={setGameStaff}
                      minHeight="5rem"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-foreground">
                      Gains
                    </label>
                    <RichTextEditor
                      value={gameRewards}
                      onChange={setGameRewards}
                      minHeight="5rem"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-foreground">
                      Règles
                    </label>
                    <RichTextEditor
                      value={gameRules}
                      onChange={setGameRules}
                      minHeight="5rem"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-foreground">
                      Mort et guérison
                    </label>
                    <RichTextEditor
                      value={gameDeathHealing}
                      onChange={setGameDeathHealing}
                      minHeight="5rem"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-foreground">
                      Varia
                    </label>
                    <RichTextEditor
                      value={gameVaria}
                      onChange={setGameVaria}
                      minHeight="5rem"
                    />
                  </div>
                </div>
              )}

              {tab === "contact" && (
                <div>
                  <label className="mb-1 block text-sm font-semibold text-foreground">
                    Nous joindre
                  </label>
                  <RichTextEditor
                    value={contactInfo}
                    onChange={setContactInfo}
                    minHeight="8rem"
                  />
                </div>
              )}
            </>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="flex justify-end gap-2 border-t border-black/[.08] pt-3 dark:border-white/[.08]">
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
  const [frontsActivity, setFrontsActivity] = useState<Activity | null>(null);
  const [chaptersActivity, setChaptersActivity] = useState<Activity | null>(
    null,
  );
  const [detailsActivity, setDetailsActivity] = useState<Activity | null>(null);
  const [isBattlefieldsOpen, setIsBattlefieldsOpen] = useState(false);
  const [isDefaultTemplateOpen, setIsDefaultTemplateOpen] = useState(false);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [exportingActivityId, setExportingActivityId] = useState<string | null>(
    null,
  );
  const [hasFullAccess, setHasFullAccess] = useState(true);

  useEffect(() => {
    getOwnProfile().then((profile) => {
      if (!profile) return;
      if (profile.role === "admin") {
        setHasFullAccess(true);
        return;
      }
      supabase
        .from("permissions")
        .select("feature, granted")
        .eq("user_id", profile.id)
        .in("feature", ["activites", "activites-scenariste"])
        .then(({ data }) => {
          setHasFullAccess(
            (data ?? []).some((r) => r.feature === "activites" && r.granted),
          );
        });
    });
  }, []);

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

  const handleExportActivityDocx = async (activity: Activity) => {
    setExportingActivityId(activity.id);
    try {
      const [chapters, blocks, frontAssignments] = await Promise.all([
        listActivityChapters(activity.id),
        listScheduleBlocks(activity.id),
        getActivityFrontAssignments(activity.id),
      ]);
      const blob = await exportActivityToDocx({
        name: activity.name,
        date: formatActivityDate(activity.date),
        gameText: activity.game_text ?? "",
        registrationParticipantsPricing:
          activity.registration_participants_pricing ?? "",
        registrationParticipantsHowto:
          activity.registration_participants_howto ?? "",
        fronts: buildFrontsExportInfo(frontAssignments),
        registrationNonParticipantsPricing:
          activity.registration_non_participants_pricing ?? "",
        registrationNonParticipantsHowto:
          activity.registration_non_participants_howto ?? "",
        scheduleIntro: activity.schedule_intro ?? "",
        schedule: mergeActivitySchedule(chapters, blocks),
        scheduleOutro: activity.schedule_outro ?? "",
        gameSecurity: activity.game_security ?? "",
        gameStaff: activity.game_staff ?? "",
        gameRewards: activity.game_rewards ?? "",
        gameRules: activity.game_rules ?? "",
        gameDeathHealing: activity.game_death_healing ?? "",
        gameVaria: activity.game_varia ?? "",
        contactInfo: activity.contact_info ?? "",
      });
      downloadBlob(blob, `${activity.name}.docx`);
    } catch {
      alert("Échec de l'exportation Word.");
    } finally {
      setExportingActivityId(null);
    }
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
              {hasFullAccess && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsBattlefieldsOpen(true)}
                    className="flex items-center gap-2 rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
                  >
                    <Mountain size={16} />
                    Champs de bataille
                  </button>
                  <button
                    onClick={() => setIsDefaultTemplateOpen(true)}
                    className="flex items-center gap-2 rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
                  >
                    <FileStack size={16} />
                    Modèle par défaut
                  </button>
                  <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390]"
                  >
                    <Plus size={16} />
                    Créer une activité
                  </button>
                </div>
              )}
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
                              <FlagTriangleRight size={16} />
                            </button>
                            <button
                              onClick={() => setChaptersActivity(activity)}
                              aria-label="Chapitres"
                              className="rounded-full p-2 text-foreground/60 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                            >
                              <BookText size={16} />
                            </button>
                            <button
                              onClick={() => setDetailsActivity(activity)}
                              aria-label="Détails"
                              className="rounded-full p-2 text-foreground/60 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                            >
                              <ClipboardList size={16} />
                            </button>
                            <button
                              onClick={() => handleExportActivityDocx(activity)}
                              disabled={exportingActivityId === activity.id}
                              aria-label="Exporter en Word"
                              className="rounded-full p-2 text-foreground/60 transition-colors hover:bg-black/[.05] disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-white/[.08]"
                            >
                              <FileDown size={16} />
                            </button>
                            {hasFullAccess && (
                              <>
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
                              </>
                            )}
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
      {chaptersActivity && (
        <ActivityChaptersModal
          activity={chaptersActivity}
          onClose={() => setChaptersActivity(null)}
        />
      )}
      {detailsActivity && (
        <ActivityDetailsModal
          activity={detailsActivity}
          onClose={() => setDetailsActivity(null)}
        />
      )}
      {isBattlefieldsOpen && (
        <BattlefieldsModal onClose={() => setIsBattlefieldsOpen(false)} />
      )}
      {isDefaultTemplateOpen && (
        <DefaultTemplateModal onClose={() => setIsDefaultTemplateOpen(false)} />
      )}
    </div>
  );
}

const ACTIVITES_PAGE_FEATURES = ["activites", "activites-scenariste"] as const;

export default function ActivitesPage() {
  return (
    <RequireFeature feature={ACTIVITES_PAGE_FEATURES}>
      <ActivitesContent />
    </RequireFeature>
  );
}
