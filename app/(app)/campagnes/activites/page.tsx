"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertTriangle,
  Archive,
  BookOpen,
  BookText,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock,
  Cross,
  Download,
  Feather,
  FileStack,
  FileText,
  FlagTriangleRight,
  GripVertical,
  Import,
  ListChecks,
  Map as MapIcon,
  Phone,
  PocketKnife,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Swords,
  Ticket,
  Trash2,
  Unlink,
  Upload,
  Users,
  Variable,
  Wand2,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import MarechalTasksPanel from "@/components/marechal-tasks-panel";
import MarechalTeamPanel from "@/components/marechal-team-panel";
import MedicTeamPanel from "@/components/medic-team-panel";
import { Pagination, usePagination } from "@/components/pagination";
import RequireFeature from "@/components/require-feature";
import RichTextEditor from "@/components/rich-text-editor";
import WeaponMasterTeamPanel from "@/components/weapon-master-team-panel";
import {
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
  exportActivityDocumentToDocx,
} from "@/lib/activity-docx-export";
import {
  buildDefaultBlocks,
  DOCUMENT_BLOCK_LABELS,
  listDocumentBlocks,
  saveDocumentBlocks,
  STANDARD_BLOCK_ORDER,
  type DocumentBlock,
  type StandardDocumentBlockType,
} from "@/lib/activity-document";
import {
  applyTemplateVariables,
  buildTemplateVariables,
} from "@/lib/activity-template-tokens";
import {
  CHAPTER_HEALING_MODES,
  createActivityChapter,
  deleteActivityChapter,
  listActivityChapters,
  listAllActivityChapters,
  updateActivityChapter,
  updateChapterPositions,
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
  buildScheduleRows,
  listScheduleBlocks,
  saveScheduleBlocks,
  type ScheduleBlockInput,
  type ScheduleRow,
} from "@/lib/activity-schedule";
import { listBattlefields, type Battlefield } from "@/lib/battlefields";
import { searchCharacters, type Character } from "@/lib/characters";
import {
  countDocumentLinksByActivity,
  listDocumentsForActivity,
  unlinkDocument,
  type ActivityDocumentLink,
} from "@/lib/document-library";
import { getModuleAccessLevels } from "@/lib/features";
import { listGuilds, type Guild } from "@/lib/guilds";
import {
  listCampaignTeamAssignedCounts,
  listMarechaux,
  listNonCampaignTeamStatusCounts,
  type Marechal,
} from "@/lib/marechaux";
import {
  listMedicActivityStatusCounts,
  listMedics,
  type Medic,
} from "@/lib/medics";
import { uploadMedia } from "@/lib/media-library";
import { getOwnProfile } from "@/lib/profile";
import { supabase } from "@/lib/supabase";
import {
  listWeaponMasterActivityStatusCounts,
  listWeaponMasters,
  type WeaponMaster,
} from "@/lib/weapon-masters";

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
          {initial ? "Modifier la campagne" : "Créer une campagne"}
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
  canWrite,
  onAddGuild,
  onRemoveGuild,
  onAddOrganizer,
  onRemoveOrganizer,
}: {
  color: FrontColor;
  front: FrontAssignments[FrontColor];
  allGuilds: Guild[];
  canWrite: boolean;
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
            {canWrite && (
              <button
                type="button"
                onClick={() => onRemoveGuild(g.external_id)}
                className="text-foreground/50 hover:text-foreground"
              >
                <X size={12} />
              </button>
            )}
          </span>
        ))}
        {front.guilds.length === 0 && (
          <span className="text-xs text-foreground/40">Aucune guilde</span>
        )}
      </div>
      {canWrite && (
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
      )}

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
                {canWrite && (
                  <button
                    type="button"
                    onClick={() => onRemoveOrganizer(index)}
                    className="flex-shrink-0 text-foreground/50 hover:text-foreground"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
            {front.organizers.length === 0 && (
              <span className="text-xs text-foreground/40">
                Aucun organisateur
              </span>
            )}
          </div>

          {canWrite && front.organizers.length < maxOrganizers && (
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
  canWrite,
  onClose,
}: {
  activity: Activity;
  canWrite: boolean;
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
          {activity.number_of_fronts > 1 ? "s" : ""} pour cette campagne.
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
                canWrite={canWrite}
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
            {canWrite ? "Annuler" : "Fermer"}
          </button>
          {canWrite && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "…" : "Enregistrer"}
            </button>
          )}
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
        minHeight="10rem"
      />
      <div>
        <label className="mb-1 block text-sm font-semibold text-foreground">
          Champs de bataille
        </label>
        {battlefields.length === 0 ? (
          <p className="text-xs text-foreground/40">
            Aucun champ de bataille défini — gère-les depuis la section
            &quot;Champs de bataille&quot; de la page Paramètres.
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
          minHeight="8rem"
        />
      </div>
      <label className="mb-1 block text-sm font-semibold text-foreground">
        Temps
      </label>
      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          required
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="Durée (ex. 45 minutes)"
          className={chapterFieldClassName}
        />
        <input
          type="time"
          required
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className={chapterFieldClassName}
        />
      </div>
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
        minHeight="10rem"
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
                minHeight="8rem"
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
                minHeight="8rem"
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
        minHeight="8rem"
      />
      <label className="mb-1 block text-sm font-semibold text-foreground">
        Éléments spéciaux
      </label>
      <RichTextEditor
        value={specialElements}
        onChange={setSpecialElements}
        placeholder="Détailler les éléments spéciaux"
        minHeight="8rem"
      />
      <label className="mb-1 block text-sm font-semibold text-foreground">
        Monstres et machines de guerre
      </label>
      <RichTextEditor
        value={monstersWarMachines}
        onChange={setMonstersWarMachines}
        placeholder="Détailler les monstres et machines de guerre"
        minHeight="8rem"
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
            Création de carte
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
  canWrite,
  onClose,
}: {
  activity: Activity;
  canWrite: boolean;
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
      c.activity_name.toLowerCase().includes(q) ||
      formatActivityDate(c.activity_date).toLowerCase().includes(q) ||
      c.battlefields.some((b) => b.name.toLowerCase().includes(q))
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`flex max-h-[85vh] w-full flex-col gap-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900 ${
          view === "form" ? "max-w-5xl" : "max-w-2xl"
        }`}
      >
        {view === "list" ? (
          <>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">
                Chapitres — {activity.name}
              </h2>
              {canWrite && (
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
              )}
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
                    {canWrite && (
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
                          className="rounded-full p-2 text-foreground/60 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
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
                placeholder="Rechercher par titre, campagne, date ou champ de bataille…"
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
                        {chapter.activity_name} ·{" "}
                        {formatActivityDate(chapter.activity_date)}
                      </p>
                      {chapter.battlefields.length > 0 && (
                        <p className="text-xs text-foreground/50">
                          {chapter.battlefields.map((b) => b.name).join(", ")}
                        </p>
                      )}
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
type ActivityTab = "variables" | "texte-jeu" | DetailsTab;

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
  { key: "texte-jeu", label: "Texte jeu", icon: BookOpen },
  ...DETAILS_TABS,
];

type ScheduleFormRow = {
  key: string;
  label: string;
  startTime: string;
  endTime: string;
  position: number;
};

const DEFAULT_SCHEDULE_ROWS: Omit<ScheduleFormRow, "key" | "position">[] = [
  {
    label: "Arrivée, inscription et homologation",
    startTime: "08:00",
    endTime: "09:30",
  },
  { label: "Déploiement", startTime: "09:30", endTime: "10:00" },
  {
    label: "Fin de la campagne et début de la Ducasse",
    startTime: "17:00",
    endTime: "17:00",
  },
];

function SortableBlockRow({
  row,
  hasConflict,
  onUpdate,
  onRemove,
}: {
  row: ScheduleFormRow;
  hasConflict: boolean;
  onUpdate: (
    key: string,
    field: "label" | "startTime" | "endTime",
    value: string,
  ) => void;
  onRemove: (key: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.key });

  return (
    <tr
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`border-t border-black/[.06] dark:border-white/[.08] ${
        hasConflict ? "bg-red-50 dark:bg-red-950/40" : ""
      } ${isDragging ? "relative z-10 opacity-50" : ""}`}
    >
      <td className="px-3 py-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Déplacer"
          className="cursor-grab touch-none text-foreground/40 hover:text-foreground/70"
        >
          <GripVertical size={14} />
        </button>
      </td>
      <td className="px-3 py-2">
        <input
          type="time"
          value={row.startTime}
          onChange={(e) => onUpdate(row.key, "startTime", e.target.value)}
          className={chapterFieldClassName}
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="time"
          value={row.endTime}
          onChange={(e) => onUpdate(row.key, "endTime", e.target.value)}
          className={chapterFieldClassName}
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="text"
          value={row.label}
          onChange={(e) => onUpdate(row.key, "label", e.target.value)}
          placeholder="Nom du bloc (ex. Accueil)"
          className={`w-full ${chapterFieldClassName}`}
        />
        {hasConflict && (
          <AlertTriangle
            size={14}
            className="ml-2 inline text-red-600 dark:text-red-400"
          />
        )}
      </td>
      <td className="px-3 py-2 text-right">
        <button
          type="button"
          onClick={() => onRemove(row.key)}
          aria-label="Retirer"
          className="text-foreground/50 hover:text-foreground"
        >
          <X size={14} />
        </button>
      </td>
    </tr>
  );
}

function SortableChapterRow({ row }: { row: ScheduleRow }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.key });

  return (
    <tr
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`border-t border-black/[.06] dark:border-white/[.08] ${
        row.hasConflict ? "bg-red-50 dark:bg-red-950/40" : ""
      } ${isDragging ? "relative z-10 opacity-50" : ""}`}
    >
      <td className="px-3 py-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Déplacer"
          className="cursor-grab touch-none text-foreground/40 hover:text-foreground/70"
        >
          <GripVertical size={14} />
        </button>
      </td>
      <td className="px-3 py-2 text-foreground/80">{row.startTime || "—"}</td>
      <td className="px-3 py-2 text-foreground/80">{row.endTime || "—"}</td>
      <td className="px-3 py-2 text-foreground/80">
        {row.label}
        <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
          Chapitre
        </span>
        {row.hasConflict && (
          <AlertTriangle
            size={14}
            className="ml-2 inline text-red-600 dark:text-red-400"
          />
        )}
      </td>
      <td className="px-3 py-2" />
    </tr>
  );
}

function ActivityDetailsModal({
  activity,
  canWrite,
  onClose,
}: {
  activity: Activity;
  canWrite: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<ActivityTab>("variables");

  const [gameText, setGameText] = useState(activity.game_text ?? "");

  const [mealLunchPrice, setMealLunchPrice] = useState(
    activity.meal_lunch_price ?? "",
  );
  const [mealDinnerPrice, setMealDinnerPrice] = useState(
    activity.meal_dinner_price ?? "",
  );
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getActivityFrontAssignments(activity.id),
      listActivityChapters(activity.id),
      listScheduleBlocks(activity.id),
      getActivityDetailTemplate(),
    ])
      .then(([frontAssignments, chapterList, blocks, template]) => {
        setFronts(frontAssignments);
        setChapters(chapterList);
        // Horaire vide au chargement -> on part des blocs par défaut.
        setScheduleRows(
          blocks.length > 0
            ? blocks.map((b) => ({
                key: b.id,
                label: b.label,
                startTime: b.start_time ?? "",
                endTime: b.end_time ?? "",
                position: b.position,
              }))
            : DEFAULT_SCHEDULE_ROWS.map((r, index) => ({
                ...r,
                key: crypto.randomUUID(),
                position: chapterList.length + index,
              })),
        );
        // Texte vide au chargement -> on part du modèle par défaut.
        if (!registrationParticipantsPricing)
          setRegistrationParticipantsPricing(
            template.registration_participants_pricing ?? "",
          );
        if (!registrationParticipantsHowto)
          setRegistrationParticipantsHowto(
            template.registration_participants_howto ?? "",
          );
        if (!registrationNonParticipantsPricing)
          setRegistrationNonParticipantsPricing(
            template.registration_non_participants_pricing ?? "",
          );
        if (!registrationNonParticipantsHowto)
          setRegistrationNonParticipantsHowto(
            template.registration_non_participants_howto ?? "",
          );
        if (!scheduleIntro) setScheduleIntro(template.schedule_intro ?? "");
        if (!scheduleOutro) setScheduleOutro(template.schedule_outro ?? "");
        if (!gameSecurity) setGameSecurity(template.game_security ?? "");
        if (!gameStaff) setGameStaff(template.game_staff ?? "");
        if (!gameRewards) setGameRewards(template.game_rewards ?? "");
        if (!gameRules) setGameRules(template.game_rules ?? "");
        if (!gameDeathHealing)
          setGameDeathHealing(template.game_death_healing ?? "");
        if (!gameVaria) setGameVaria(template.game_varia ?? "");
        if (!contactInfo) setContactInfo(template.contact_info ?? "");
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only checks the fields' initial (pre-edit) values to decide whether to auto-fill from the template; must run once per activity, not on every keystroke
  }, [activity.id]);

  const addScheduleRow = () => {
    if (!canWrite) return;
    const maxPosition = Math.max(
      -1,
      ...chapters.map((c) => c.position),
      ...scheduleRows.map((r) => r.position),
    );
    setScheduleRows((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        label: "",
        startTime: "",
        endTime: "",
        position: maxPosition + 1,
      },
    ]);
  };

  const updateScheduleRow = (
    key: string,
    field: "label" | "startTime" | "endTime",
    value: string,
  ) => {
    if (!canWrite) return;
    setScheduleRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)),
    );
  };

  const removeScheduleRow = (key: string) => {
    if (!canWrite) return;
    setScheduleRows((prev) => prev.filter((r) => r.key !== key));
  };

  const scheduleSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const combinedSchedule = buildScheduleRows(chapters, scheduleRows);

  const handleScheduleDragEnd = (event: DragEndEvent) => {
    if (!canWrite) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = combinedSchedule.findIndex((r) => r.key === active.id);
    const toIndex = combinedSchedule.findIndex((r) => r.key === over.id);
    if (fromIndex === -1 || toIndex === -1) return;
    const reordered = arrayMove(combinedSchedule, fromIndex, toIndex);
    const positionByKey = new Map(reordered.map((r, index) => [r.key, index]));
    setChapters((prev) =>
      prev.map((c) => ({
        ...c,
        position: positionByKey.get(c.id) ?? c.position,
      })),
    );
    setScheduleRows((prev) =>
      prev.map((r) => ({
        ...r,
        position: positionByKey.get(r.key) ?? r.position,
      })),
    );
  };

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
      applyDetails(template);
    } catch {
      setError("Échec du chargement du modèle.");
    } finally {
      setIsApplyingTemplate(false);
    }
  };

  const handleApplyVariables = () => {
    const vars = buildTemplateVariables({
      date: activity.date,
      participants_per_front: activity.participants_per_front,
      non_participants_max: activity.non_participants_max,
      meal_lunch_price: mealLunchPrice || null,
      meal_dinner_price: mealDinnerPrice || null,
      bonus_participants: bonusParticipants || null,
      bonus2_participants: bonus2Participants || null,
    });
    setRegistrationParticipantsPricing((v) => applyTemplateVariables(v, vars));
    setRegistrationParticipantsHowto((v) => applyTemplateVariables(v, vars));
    setRegistrationNonParticipantsPricing((v) =>
      applyTemplateVariables(v, vars),
    );
    setRegistrationNonParticipantsHowto((v) => applyTemplateVariables(v, vars));
    setScheduleIntro((v) => applyTemplateVariables(v, vars));
    setScheduleOutro((v) => applyTemplateVariables(v, vars));
    setGameSecurity((v) => applyTemplateVariables(v, vars));
    setGameStaff((v) => applyTemplateVariables(v, vars));
    setGameRewards((v) => applyTemplateVariables(v, vars));
    setGameRules((v) => applyTemplateVariables(v, vars));
    setGameDeathHealing((v) => applyTemplateVariables(v, vars));
    setGameVaria((v) => applyTemplateVariables(v, vars));
    setContactInfo((v) => applyTemplateVariables(v, vars));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
    setError(null);
    setIsSaving(true);
    try {
      await updateActivityGameText(activity.id, {
        game_text: gameText || null,
      });
      await updateActivityDetails(activity.id, buildDetailsPayload());

      const variables: ActivityVariables = {
        meal_lunch_price: mealLunchPrice || null,
        meal_dinner_price: mealDinnerPrice || null,
        bonus_participants: bonusParticipants || null,
        bonus2_participants: bonus2Participants || null,
      };
      await updateActivityVariables(activity.id, variables);

      const blockInputs: ScheduleBlockInput[] = scheduleRows.map((r) => ({
        label: r.label,
        start_time: r.startTime || null,
        end_time: r.endTime || null,
        position: r.position,
      }));
      await saveScheduleBlocks(activity.id, blockInputs);
      await updateChapterPositions(
        chapters.map((c) => ({ id: c.id, position: c.position })),
      );
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
        className="flex max-h-[85vh] w-full max-w-3xl flex-col gap-4 overflow-hidden rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">
            Détails — {activity.name}
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

        {canWrite && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-foreground/50">
              Modèle : contenu réutilisable d&apos;une campagne à l&apos;autre
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
                onClick={handleApplyVariables}
                className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 font-medium text-white transition-colors hover:bg-[#0c4390]"
              >
                <Wand2 size={14} />
                Intégrer les variables
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pr-1">
          {isLoading ? (
            <p className="text-sm text-foreground/60">Chargement…</p>
          ) : (
            <>
              {tab === "variables" && (
                <div className="flex flex-col gap-4">
                  <p className="text-xs text-foreground/50">
                    Remplis ces valeurs, puis clique sur &quot;Intégrer les
                    variables dans les textes&quot; pour remplacer les jetons
                    (ex. [BONUSPARTICIPANTS]) présents dans les textes par ces
                    valeurs.
                  </p>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-foreground">
                      Repas dîner
                    </label>
                    <RichTextEditor
                      readOnly={!canWrite}
                      value={mealLunchPrice}
                      onChange={setMealLunchPrice}
                      placeholder="Détailler les infos du dîner"
                      minHeight="4rem"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-foreground">
                      Repas souper
                    </label>
                    <RichTextEditor
                      readOnly={!canWrite}
                      value={mealDinnerPrice}
                      onChange={setMealDinnerPrice}
                      placeholder="Détailler les infos du souper"
                      minHeight="4rem"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1 text-sm text-foreground/70">
                      Bonus de participants
                      <input
                        type="text"
                        disabled={!canWrite}
                        value={bonusParticipants}
                        onChange={(e) => setBonusParticipants(e.target.value)}
                        className={chapterFieldClassName}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm text-foreground/70">
                      Bonus de participants (palier 2)
                      <input
                        type="text"
                        disabled={!canWrite}
                        value={bonus2Participants}
                        onChange={(e) => setBonus2Participants(e.target.value)}
                        className={chapterFieldClassName}
                      />
                    </label>
                  </div>
                </div>
              )}

              {tab === "texte-jeu" && (
                <div>
                  <label className="mb-1 block text-sm font-semibold text-foreground">
                    Texte jeu
                  </label>
                  <RichTextEditor
                      readOnly={!canWrite}
                    value={gameText}
                    onChange={setGameText}
                    placeholder="Texte jeu de la campagne"
                    minHeight="8rem"
                  />
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
                      readOnly={!canWrite}
                      value={registrationParticipantsPricing}
                      onChange={setRegistrationParticipantsPricing}
                      placeholder="Détailler les tarifs"
                      minHeight="5rem"
                    />
                    <label className="mb-1 mt-3 block text-sm font-semibold text-foreground">
                      Pour vous inscrire
                    </label>
                    <RichTextEditor
                      readOnly={!canWrite}
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
                        &quot;Fronts&quot; de cette campagne.
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
                      readOnly={!canWrite}
                      value={registrationNonParticipantsPricing}
                      onChange={setRegistrationNonParticipantsPricing}
                      placeholder="Détailler les tarifs"
                      minHeight="5rem"
                    />
                    <label className="mb-1 mt-3 block text-sm font-semibold text-foreground">
                      Pour vous inscrire
                    </label>
                    <RichTextEditor
                      readOnly={!canWrite}
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
                      readOnly={!canWrite}
                      value={scheduleIntro}
                      onChange={setScheduleIntro}
                      placeholder="Introduction affichée avant le tableau"
                      minHeight="4rem"
                    />
                  </div>

                  {combinedSchedule.some((row) => row.hasConflict) && (
                    <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
                      <AlertTriangle size={16} />
                      Conflit d&apos;horaire détecté entre certains éléments
                      (surlignés ci-dessous).
                    </p>
                  )}

                  <div className="overflow-hidden rounded-lg border border-black/[.08] dark:border-white/[.145]">
                    <DndContext
                      sensors={scheduleSensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleScheduleDragEnd}
                    >
                      <table className="w-full text-sm">
                        <thead className="bg-black/[.02] dark:bg-white/[.03]">
                          <tr>
                            <th className="px-3 py-2" />
                            <th className="px-3 py-2 text-left font-medium text-foreground/70">
                              Début
                            </th>
                            <th className="px-3 py-2 text-left font-medium text-foreground/70">
                              Fin
                            </th>
                            <th className="px-3 py-2 text-left font-medium text-foreground/70">
                              Élément
                            </th>
                            <th className="px-3 py-2" />
                          </tr>
                        </thead>
                        <tbody>
                          {combinedSchedule.length === 0 && (
                            <tr>
                              <td
                                colSpan={5}
                                className="px-3 py-3 text-center text-xs text-foreground/40"
                              >
                                Aucun élément à l&apos;horaire.
                              </td>
                            </tr>
                          )}
                          <SortableContext
                            items={combinedSchedule.map((r) => r.key)}
                            strategy={verticalListSortingStrategy}
                          >
                            {combinedSchedule.map((row) =>
                              row.isChapter ? (
                                <SortableChapterRow key={row.key} row={row} />
                              ) : (
                                <SortableBlockRow
                                  key={row.key}
                                  row={
                                    scheduleRows.find(
                                      (r) => r.key === row.key,
                                    ) as ScheduleFormRow
                                  }
                                  hasConflict={row.hasConflict}
                                  onUpdate={updateScheduleRow}
                                  onRemove={removeScheduleRow}
                                />
                              ),
                            )}
                          </SortableContext>
                        </tbody>
                      </table>
                    </DndContext>
                    {canWrite && (
                      <button
                        type="button"
                        onClick={addScheduleRow}
                        className="flex items-center gap-1 border-t border-black/[.06] px-3 py-2 text-xs font-medium text-primary hover:underline dark:border-white/[.08]"
                      >
                        <Plus size={14} />
                        Ajouter un bloc (accueil, homologation, dîner…)
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold text-foreground">
                      Texte après l&apos;horaire
                    </label>
                    <RichTextEditor
                      readOnly={!canWrite}
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
                      readOnly={!canWrite}
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
                      readOnly={!canWrite}
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
                      readOnly={!canWrite}
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
                      readOnly={!canWrite}
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
                      readOnly={!canWrite}
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
                      readOnly={!canWrite}
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
                      readOnly={!canWrite}
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

function SortableDocumentBlockRow({
  block,
  title,
  onRemove,
  onLabelChange,
  onContentChange,
}: {
  block: DocumentBlock;
  title: string;
  onRemove: (id: string) => void;
  onLabelChange: (id: string, label: string) => void;
  onContentChange: (id: string, content: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-lg border border-black/[.08] p-3 dark:border-white/[.145] ${
        isDragging ? "relative z-10 opacity-50" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Déplacer"
          className="cursor-grab touch-none text-foreground/40 hover:text-foreground/70"
        >
          <GripVertical size={14} />
        </button>
        {block.block_type === "custom_text" ? (
          <input
            type="text"
            value={block.label ?? ""}
            onChange={(e) => onLabelChange(block.id, e.target.value)}
            placeholder="Titre du bloc (optionnel)"
            className={`flex-1 ${chapterFieldClassName}`}
          />
        ) : (
          <p className="flex-1 font-medium text-foreground">{title}</p>
        )}
        <button
          type="button"
          onClick={() => onRemove(block.id)}
          aria-label="Retirer"
          className="text-foreground/50 hover:text-foreground"
        >
          <X size={14} />
        </button>
      </div>
      {block.block_type === "custom_text" && (
        <div className="mt-2">
          <RichTextEditor
            value={block.content ?? ""}
            onChange={(html) => onContentChange(block.id, html)}
            placeholder="Contenu du bloc…"
            minHeight="6rem"
          />
        </div>
      )}
    </div>
  );
}

function ActivityDocumentModal({
  activity,
  canWrite,
  onClose,
}: {
  activity: Activity;
  canWrite: boolean;
  onClose: () => void;
}) {
  const [chapters, setChapters] = useState<ActivityChapter[]>([]);
  const [blocks, setBlocks] = useState<DocumentBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      listActivityChapters(activity.id),
      listDocumentBlocks(activity.id),
    ])
      .then(([chapterList, savedBlocks]) => {
        setChapters(chapterList);
        setBlocks(
          savedBlocks.length > 0
            ? savedBlocks
            : buildDefaultBlocks(chapterList),
        );
      })
      .finally(() => setIsLoading(false));
  }, [activity.id]);

  const chapterTitleById = new Map(chapters.map((c) => [c.id, c.title]));

  const blockTitle = (block: DocumentBlock): string => {
    if (block.block_type === "chapter") {
      return (
        (block.chapter_id && chapterTitleById.get(block.chapter_id)) ||
        "Chapitre supprimé"
      );
    }
    if (block.block_type === "custom_text") {
      return block.label || "Bloc de texte";
    }
    return DOCUMENT_BLOCK_LABELS[block.block_type];
  };

  const missingStandardBlocks = STANDARD_BLOCK_ORDER.filter(
    (type) => !blocks.some((b) => b.block_type === type),
  );
  const missingChapters = chapters.filter(
    (c) =>
      !blocks.some((b) => b.block_type === "chapter" && b.chapter_id === c.id),
  );

  const addStandardBlock = (type: StandardDocumentBlockType) => {
    if (!canWrite) return;
    setBlocks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        block_type: type,
        chapter_id: null,
        label: null,
        content: null,
        position: prev.length,
      },
    ]);
  };

  const addChapterBlock = (chapter: ActivityChapter) => {
    if (!canWrite) return;
    setBlocks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        block_type: "chapter",
        chapter_id: chapter.id,
        label: null,
        content: null,
        position: prev.length,
      },
    ]);
  };

  const addTextBlock = () => {
    if (!canWrite) return;
    setBlocks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        block_type: "custom_text",
        chapter_id: null,
        label: "",
        content: "",
        position: prev.length,
      },
    ]);
  };

  const removeBlock = (id: string) => {
    if (!canWrite) return;
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  };

  const updateBlockLabel = (id: string, label: string) => {
    if (!canWrite) return;
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, label } : b)));
  };

  const updateBlockContent = (id: string, content: string) => {
    if (!canWrite) return;
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, content } : b)),
    );
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    if (!canWrite) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBlocks((prev) => {
      const fromIndex = prev.findIndex((b) => b.id === active.id);
      const toIndex = prev.findIndex((b) => b.id === over.id);
      if (fromIndex === -1 || toIndex === -1) return prev;
      return arrayMove(prev, fromIndex, toIndex);
    });
  };

  const handleSave = async () => {
    if (!canWrite) return;
    setError(null);
    setIsSaving(true);
    try {
      await saveDocumentBlocks(activity.id, blocks);
    } catch {
      setError("Échec de l'enregistrement.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    if (!canWrite) return;
    setError(null);
    setIsExporting(true);
    try {
      await saveDocumentBlocks(activity.id, blocks);
      const [scheduleBlocks, frontAssignments] = await Promise.all([
        listScheduleBlocks(activity.id),
        getActivityFrontAssignments(activity.id),
      ]);
      const scheduleRows = buildScheduleRows(
        chapters,
        scheduleBlocks.map((b) => ({
          key: b.id,
          label: b.label,
          startTime: b.start_time ?? "",
          endTime: b.end_time ?? "",
          position: b.position,
        })),
      );
      const blob = await exportActivityDocumentToDocx({
        activity,
        formattedDate: formatActivityDate(activity.date),
        chapters,
        blocks,
        scheduleRows,
        scheduleIntro: activity.schedule_intro ?? "",
        scheduleOutro: activity.schedule_outro ?? "",
        fronts: buildFrontsExportInfo(frontAssignments),
      });
      downloadBlob(blob, `${activity.name}.docx`);
    } catch {
      setError("Échec de l'exportation Word.");
    } finally {
      setIsExporting(false);
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
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">
            Document — {activity.name}
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

        {isLoading && (
          <p className="text-sm text-foreground/60">Chargement…</p>
        )}

        {!isLoading && (
          <>
            <p className="rounded-lg border border-black/[.08] px-3 py-2 text-sm font-medium text-foreground/70 dark:border-white/[.145]">
              {activity.name}{" "}
              <span className="font-normal text-foreground/50">
                (titre, toujours en premier)
              </span>
            </p>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={blocks.map((b) => b.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-2">
                  {blocks.map((block) => (
                    <SortableDocumentBlockRow
                      key={block.id}
                      block={block}
                      title={blockTitle(block)}
                      onRemove={removeBlock}
                      onLabelChange={updateBlockLabel}
                      onContentChange={updateBlockContent}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {canWrite &&
              (missingStandardBlocks.length > 0 ||
                missingChapters.length > 0) && (
                <div className="flex flex-wrap items-center gap-2 border-t border-black/[.08] pt-3 dark:border-white/[.08]">
                  <span className="text-xs text-foreground/60">Ajouter :</span>
                  {missingStandardBlocks.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => addStandardBlock(type)}
                      className="rounded-full border border-black/[.08] px-3 py-1 text-xs font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
                    >
                      + {DOCUMENT_BLOCK_LABELS[type]}
                    </button>
                  ))}
                  {missingChapters.map((chapter) => (
                    <button
                      key={chapter.id}
                      type="button"
                      onClick={() => addChapterBlock(chapter)}
                      className="rounded-full border border-black/[.08] px-3 py-1 text-xs font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
                    >
                      + {chapter.title}
                    </button>
                  ))}
                </div>
              )}

            {canWrite && (
              <button
                type="button"
                onClick={addTextBlock}
                className="flex items-center justify-center gap-2 self-start rounded-full border border-black/[.08] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
              >
                <Plus size={14} />
                Ajouter un bloc de texte
              </button>
            )}
          </>
        )}

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="flex justify-end gap-2 border-t border-black/[.08] pt-3 dark:border-white/[.08]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
          >
            Fermer
          </button>
          {canWrite && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
            >
              {isSaving ? "…" : "Enregistrer la structure"}
            </button>
          )}
          {canWrite && (
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || isLoading}
              className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FileText size={14} />
              {isExporting ? "…" : "Exporter en Word"}
            </button>
          )}
        </div>
      </div>
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
            Modèle par défaut des campagnes
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
          Ce texte sert de base réutilisable d&apos;une campagne à l&apos;autre.
          Chaque campagne peut ensuite le charger et l&apos;ajuster depuis son
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
                    temps) est propre à chaque campagne et ne fait pas partie du
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

function LinkedDocumentsModal({
  activity,
  canWrite,
  onClose,
  onChange,
}: {
  activity: Activity;
  canWrite: boolean;
  onClose: () => void;
  onChange: () => void;
}) {
  const [links, setLinks] = useState<ActivityDocumentLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLinks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setLinks(await listDocumentsForActivity(activity.id));
    } catch {
      setError("Impossible de charger les documents liés.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchLinks resolves before the loading flag is cleared
    fetchLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity.id]);

  const handleUnlink = async (link: ActivityDocumentLink) => {
    try {
      await unlinkDocument(link.storage_path);
      setLinks((prev) =>
        prev.filter((l) => l.storage_path !== link.storage_path),
      );
      onChange();
    } catch {
      alert("Échec du délien.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900"
      >
        <h2 className="font-semibold text-foreground">
          Documents liés — {activity.name}
        </h2>

        {isLoading && (
          <p className="text-sm text-foreground/60">Chargement…</p>
        )}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {!isLoading && !error && links.length === 0 && (
          <p className="text-sm text-foreground/60">
            Aucun document lié pour l&apos;instant. Rends-toi dans Gestion
            documentaire pour lier un document à cette campagne.
          </p>
        )}
        {!isLoading && !error && links.length > 0 && (
          <div className="flex flex-col gap-2">
            {links.map((link) => (
              <div
                key={link.storage_path}
                className="flex items-center justify-between gap-2 rounded-lg border border-black/[.08] p-3 dark:border-white/[.145]"
              >
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-sm text-foreground hover:underline"
                >
                  {link.name}
                </a>
                {canWrite && (
                  <button
                    type="button"
                    onClick={() => handleUnlink(link)}
                    aria-label="Délier"
                    className="rounded-full p-2 text-foreground/60 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                  >
                    <Unlink size={16} />
                  </button>
                )}
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
      </div>
    </div>
  );
}

type PageTab = "campagnes" | "marechaux" | "medics" | "weapon-masters";

const PAGE_TABS: { key: PageTab; label: string; icon: typeof Swords }[] = [
  { key: "campagnes", label: "Campagnes", icon: Swords },
  { key: "marechaux", label: "Maréchaux", icon: PocketKnife },
  { key: "medics", label: "Médics", icon: Cross },
  { key: "weapon-masters", label: "Maîtres d'armes", icon: Shield },
];

function MarechalTeamModal({
  activity,
  marechaux,
  canWrite,
  onClose,
}: {
  activity: Activity;
  marechaux: Marechal[];
  canWrite: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">{activity.name}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full p-1 hover:bg-black/[.04] dark:hover:bg-white/[.08]"
          >
            <X size={20} />
          </button>
        </div>

        <MarechalTeamPanel
          activity={activity}
          marechaux={marechaux}
          canWrite={canWrite}
        />
      </div>
    </div>
  );
}

function MarechalTasksModal({
  activity,
  marechaux,
  canWrite,
  onClose,
}: {
  activity: Activity;
  marechaux: Marechal[];
  canWrite: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-6xl flex-col gap-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">
            Tâches — {activity.name}
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

        <MarechalTasksPanel
          activity={activity}
          marechaux={marechaux}
          canWrite={canWrite}
        />
      </div>
    </div>
  );
}

function MedicTeamModal({
  activity,
  medics,
  canWrite,
  onClose,
}: {
  activity: Activity;
  medics: Medic[];
  canWrite: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">{activity.name}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full p-1 hover:bg-black/[.04] dark:hover:bg-white/[.08]"
          >
            <X size={20} />
          </button>
        </div>

        <MedicTeamPanel activity={activity} medics={medics} canWrite={canWrite} />
      </div>
    </div>
  );
}

function WeaponMasterTeamModal({
  activity,
  weaponMasters,
  canWrite,
  onClose,
}: {
  activity: Activity;
  weaponMasters: WeaponMaster[];
  canWrite: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-xl flex-col gap-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">{activity.name}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full p-1 hover:bg-black/[.04] dark:hover:bg-white/[.08]"
          >
            <X size={20} />
          </button>
        </div>

        <WeaponMasterTeamPanel
          activity={activity}
          weaponMasters={weaponMasters}
          canWrite={canWrite}
        />
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
  const [chaptersActivity, setChaptersActivity] = useState<Activity | null>(
    null,
  );
  const [detailsActivity, setDetailsActivity] = useState<Activity | null>(null);
  const [documentActivity, setDocumentActivity] = useState<Activity | null>(
    null,
  );
  const [linkedDocumentsActivity, setLinkedDocumentsActivity] =
    useState<Activity | null>(null);
  const [documentLinkCounts, setDocumentLinkCounts] = useState<
    Record<string, number>
  >({});
  const [isDefaultTemplateOpen, setIsDefaultTemplateOpen] = useState(false);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [hasFullAccess, setHasFullAccess] = useState(true);
  const [tab, setTab] = useState<PageTab>("campagnes");
  const [marechaux, setMarechaux] = useState<Marechal[]>([]);
  const [marechalCounts, setMarechalCounts] = useState<
    Record<string, { available: number; assigned: number }>
  >({});
  const [campaignTeamCounts, setCampaignTeamCounts] = useState<
    Record<string, number>
  >({});
  const [isMarechalLoading, setIsMarechalLoading] = useState(true);
  const [teamActivity, setTeamActivity] = useState<Activity | null>(null);
  const [tasksActivity, setTasksActivity] = useState<Activity | null>(null);
  const [medics, setMedics] = useState<Medic[]>([]);
  const [medicCounts, setMedicCounts] = useState<
    Record<string, { available: number; assigned: number }>
  >({});
  const [isMedicLoading, setIsMedicLoading] = useState(true);
  const [medicTeamActivity, setMedicTeamActivity] = useState<Activity | null>(
    null,
  );
  const [weaponMasters, setWeaponMasters] = useState<WeaponMaster[]>([]);
  const [weaponMasterCounts, setWeaponMasterCounts] = useState<
    Record<string, { available: number; assigned: number }>
  >({});
  const [isWeaponMasterLoading, setIsWeaponMasterLoading] = useState(true);
  const [weaponMasterTeamActivity, setWeaponMasterTeamActivity] =
    useState<Activity | null>(null);

  const refreshDocumentLinkCounts = () => {
    countDocumentLinksByActivity().then(setDocumentLinkCounts);
  };

  useEffect(() => {
    refreshDocumentLinkCounts();
  }, []);

  useEffect(() => {
    if (tab !== "marechaux") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sets a loading flag ahead of an async fetch
    setIsMarechalLoading(true);
    Promise.all([
      listMarechaux(),
      listNonCampaignTeamStatusCounts(),
      listCampaignTeamAssignedCounts(),
    ])
      .then(([marechalList, counts, teamCounts]) => {
        setMarechaux(marechalList);
        setMarechalCounts(counts);
        setCampaignTeamCounts(teamCounts);
      })
      .finally(() => setIsMarechalLoading(false));
  }, [tab]);

  useEffect(() => {
    if (tab !== "medics") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sets a loading flag ahead of an async fetch
    setIsMedicLoading(true);
    Promise.all([listMedics(), listMedicActivityStatusCounts()])
      .then(([medicList, counts]) => {
        setMedics(medicList);
        setMedicCounts(counts);
      })
      .finally(() => setIsMedicLoading(false));
  }, [tab]);

  useEffect(() => {
    if (tab !== "weapon-masters") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sets a loading flag ahead of an async fetch
    setIsWeaponMasterLoading(true);
    Promise.all([listWeaponMasters(), listWeaponMasterActivityStatusCounts()])
      .then(([weaponMasterList, counts]) => {
        setWeaponMasters(weaponMasterList);
        setWeaponMasterCounts(counts);
      })
      .finally(() => setIsWeaponMasterLoading(false));
  }, [tab]);

  useEffect(() => {
    getOwnProfile().then((profile) => {
      if (!profile) return;
      getModuleAccessLevels(profile).then((levels) => {
        setHasFullAccess(levels["activites"] === "ecriture");
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
      setError("Impossible de charger les campagnes.");
      return;
    }
    setActivities(data ?? []);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchActivities sets a loading flag ahead of an async fetch
    fetchActivities();
  }, []);

  const handleDelete = async (activity: Activity) => {
    if (!window.confirm(`Supprimer la campagne "${activity.name}" ?`)) return;
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
    .filter(
      (a) =>
        !query ||
        a.name.toLowerCase().includes(query) ||
        formatActivityDate(a.date).toLowerCase().includes(query) ||
        String(a.number_of_fronts).includes(query) ||
        String(a.participants_per_front).includes(query),
    )
    .sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      return sortDirection === "asc" ? cmp : -cmp;
    });
  const {
    page: activitiesPage,
    pageCount: activitiesPageCount,
    setPage: setActivitiesPage,
    pageItems: pagedActivities,
  } = usePagination(visibleActivities);

  return (
    <div>
      <h1 className={`${glofters.className} text-3xl text-foreground`}>
        Campagnes militaires
      </h1>
      <Breadcrumb />

      <div className="mt-6 flex gap-2 border-b border-black/[.08] dark:border-white/[.08]">
        {PAGE_TABS.map((t) => {
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
        {tab === "campagnes" && (
          <>
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
              </div>
              {hasFullAccess && (
                <div className="flex items-center gap-2">
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
                    Créer une campagne
                  </button>
                </div>
              )}
            </div>

            {activities.length === 0 && (
              <p className="text-sm text-foreground/60">
                Aucune campagne pour l&apos;instant.
              </p>
            )}

            {activities.length > 0 && visibleActivities.length === 0 && (
              <p className="text-sm text-foreground/60">
                Aucune campagne ne correspond à ces critères.
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
                      <th className="py-2 pr-4 font-medium">Fronts</th>
                      <th className="py-2 pr-4 font-medium">
                        Participants/front
                      </th>
                      <th className="py-2 pr-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedActivities.map((activity) => (
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
                        <td className="py-2 pr-4 text-foreground/80">
                          {activity.number_of_fronts}
                        </td>
                        <td className="py-2 pr-4 text-foreground/80">
                          {activity.participants_per_front}
                        </td>
                        <td className="py-2 pr-4">
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setFrontsActivity(activity)}
                                className="flex items-center gap-1.5 rounded-full border border-black/[.08] px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
                              >
                                <FlagTriangleRight size={14} />
                                Fronts
                              </button>
                              <button
                                onClick={() => setChaptersActivity(activity)}
                                className="flex items-center gap-1.5 rounded-full border border-black/[.08] px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
                              >
                                <BookText size={14} />
                                Chapitres
                              </button>
                              <button
                                onClick={() => setDetailsActivity(activity)}
                                className="flex items-center gap-1.5 rounded-full border border-black/[.08] px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
                              >
                                <ClipboardList size={14} />
                                Détails
                              </button>
                              <button
                                onClick={() => setDocumentActivity(activity)}
                                className="flex items-center gap-1.5 rounded-full border border-black/[.08] px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
                              >
                                <FileText size={14} />
                                Document
                              </button>
                              <button
                                onClick={() =>
                                  setLinkedDocumentsActivity(activity)
                                }
                                aria-label="Documents liés"
                                title="Documents liés"
                                className="relative flex items-center justify-center rounded-full border border-black/[.08] p-1.5 text-foreground/70 transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
                              >
                                <Archive size={14} />
                                {(documentLinkCounts[activity.id] ?? 0) >
                                  0 && (
                                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white">
                                    {documentLinkCounts[activity.id]}
                                  </span>
                                )}
                              </button>
                            </div>
                            <div className="flex items-center gap-1">
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
                                    className="rounded-full p-2 text-foreground/60 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pagination
                  page={activitiesPage}
                  pageCount={activitiesPageCount}
                  onPageChange={setActivitiesPage}
                />
              </div>
            )}
          </>
        )}
          </>
        )}

        {tab === "marechaux" && (
          <>
            {isMarechalLoading && (
              <p className="text-sm text-foreground/60">Chargement…</p>
            )}
            {!isMarechalLoading && activities.length === 0 && (
              <p className="text-sm text-foreground/60">
                Aucune campagne pour l&apos;instant.
              </p>
            )}
            {!isMarechalLoading && activities.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-black/[.08] text-foreground/60 dark:border-white/[.08]">
                      <th className="py-2 pr-4 font-medium">Nom</th>
                      <th className="py-2 pr-4 font-medium">Date</th>
                      <th className="py-2 pr-4 font-medium">Disponibles</th>
                      <th className="py-2 pr-4 font-medium">Assignés</th>
                      <th className="py-2 pr-4 font-medium">
                        Équipe campagne
                      </th>
                      <th className="py-2 pr-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...activities]
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .map((activity) => (
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
                          <td className="py-2 pr-4 text-foreground/80">
                            {marechalCounts[activity.id]?.available ?? 0}
                          </td>
                          <td className="py-2 pr-4 text-foreground/80">
                            {marechalCounts[activity.id]?.assigned ?? 0} /{" "}
                            {activity.marshal_count ?? "—"}
                          </td>
                          <td className="py-2 pr-4 text-foreground/80">
                            {campaignTeamCounts[activity.id] ?? 0} /{" "}
                            {activity.campaign_team_count ?? "—"}
                          </td>
                          <td className="py-2 pr-4">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setTeamActivity(activity)}
                                className="flex items-center gap-1.5 rounded-full border border-black/[.08] px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
                              >
                                <Users size={14} />
                                Gérer l&apos;équipe
                              </button>
                              <button
                                onClick={() => setTasksActivity(activity)}
                                className="flex items-center gap-1.5 rounded-full border border-black/[.08] px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
                              >
                                <ListChecks size={14} />
                                Tâches
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

        {tab === "medics" && (
          <>
            {isMedicLoading && (
              <p className="text-sm text-foreground/60">Chargement…</p>
            )}
            {!isMedicLoading && activities.length === 0 && (
              <p className="text-sm text-foreground/60">
                Aucune campagne pour l&apos;instant.
              </p>
            )}
            {!isMedicLoading && activities.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-black/[.08] text-foreground/60 dark:border-white/[.08]">
                      <th className="py-2 pr-4 font-medium">Nom</th>
                      <th className="py-2 pr-4 font-medium">Date</th>
                      <th className="py-2 pr-4 font-medium">Disponibles</th>
                      <th className="py-2 pr-4 font-medium">Assignés</th>
                      <th className="py-2 pr-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...activities]
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .map((activity) => (
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
                          <td className="py-2 pr-4 text-foreground/80">
                            {medicCounts[activity.id]?.available ?? 0}
                          </td>
                          <td className="py-2 pr-4 text-foreground/80">
                            {medicCounts[activity.id]?.assigned ?? 0} /{" "}
                            {activity.healer_count ?? "—"}
                          </td>
                          <td className="py-2 pr-4">
                            <button
                              onClick={() => setMedicTeamActivity(activity)}
                              className="flex items-center gap-1.5 rounded-full border border-black/[.08] px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
                            >
                              <Cross size={14} />
                              Gérer
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab === "weapon-masters" && (
          <>
            {isWeaponMasterLoading && (
              <p className="text-sm text-foreground/60">Chargement…</p>
            )}
            {!isWeaponMasterLoading && activities.length === 0 && (
              <p className="text-sm text-foreground/60">
                Aucune campagne pour l&apos;instant.
              </p>
            )}
            {!isWeaponMasterLoading && activities.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-black/[.08] text-foreground/60 dark:border-white/[.08]">
                      <th className="py-2 pr-4 font-medium">Nom</th>
                      <th className="py-2 pr-4 font-medium">Date</th>
                      <th className="py-2 pr-4 font-medium">Disponibles</th>
                      <th className="py-2 pr-4 font-medium">Assignés</th>
                      <th className="py-2 pr-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...activities]
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .map((activity) => (
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
                          <td className="py-2 pr-4 text-foreground/80">
                            {weaponMasterCounts[activity.id]?.available ?? 0}
                          </td>
                          <td className="py-2 pr-4 text-foreground/80">
                            {weaponMasterCounts[activity.id]?.assigned ?? 0} /{" "}
                            {activity.weapon_master_count ?? "—"}
                          </td>
                          <td className="py-2 pr-4">
                            <button
                              onClick={() =>
                                setWeaponMasterTeamActivity(activity)
                              }
                              className="flex items-center gap-1.5 rounded-full border border-black/[.08] px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
                            >
                              <Shield size={14} />
                              Gérer
                            </button>
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
          canWrite={hasFullAccess}
          onClose={() => setFrontsActivity(null)}
        />
      )}
      {chaptersActivity && (
        <ActivityChaptersModal
          activity={chaptersActivity}
          canWrite={hasFullAccess}
          onClose={() => setChaptersActivity(null)}
        />
      )}
      {detailsActivity && (
        <ActivityDetailsModal
          activity={detailsActivity}
          canWrite={hasFullAccess}
          onClose={() => setDetailsActivity(null)}
        />
      )}
      {documentActivity && (
        <ActivityDocumentModal
          activity={documentActivity}
          canWrite={hasFullAccess}
          onClose={() => setDocumentActivity(null)}
        />
      )}
      {linkedDocumentsActivity && (
        <LinkedDocumentsModal
          activity={linkedDocumentsActivity}
          canWrite={hasFullAccess}
          onClose={() => setLinkedDocumentsActivity(null)}
          onChange={refreshDocumentLinkCounts}
        />
      )}
      {isDefaultTemplateOpen && (
        <DefaultTemplateModal onClose={() => setIsDefaultTemplateOpen(false)} />
      )}
      {teamActivity && (
        <MarechalTeamModal
          activity={teamActivity}
          marechaux={marechaux}
          canWrite={hasFullAccess}
          onClose={() => setTeamActivity(null)}
        />
      )}
      {tasksActivity && (
        <MarechalTasksModal
          activity={tasksActivity}
          marechaux={marechaux}
          canWrite={hasFullAccess}
          onClose={() => setTasksActivity(null)}
        />
      )}
      {medicTeamActivity && (
        <MedicTeamModal
          activity={medicTeamActivity}
          medics={medics}
          canWrite={hasFullAccess}
          onClose={() => setMedicTeamActivity(null)}
        />
      )}
      {weaponMasterTeamActivity && (
        <WeaponMasterTeamModal
          activity={weaponMasterTeamActivity}
          weaponMasters={weaponMasters}
          canWrite={hasFullAccess}
          onClose={() => setWeaponMasterTeamActivity(null)}
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
