import { supabase } from "@/lib/supabase";

export type Marechal = {
  id: string;
  character_id: number;
  formation_2025: boolean;
  formation_2026: boolean;
  is_campaign_team: boolean;
  notes: string | null;
  created_at: string;
  name: string;
  player_name: string | null;
  player_email: string | null;
  guild_name: string | null;
};

type RawCharacterJoin = {
  name: string;
  player_name: string | null;
  player_email: string | null;
  guilds: { name: string } | { name: string }[] | null;
} | null;

type RawMarechal = {
  id: string;
  character_id: number;
  formation_2025: boolean;
  formation_2026: boolean;
  is_campaign_team: boolean;
  notes: string | null;
  created_at: string;
  characters: RawCharacterJoin | RawCharacterJoin[];
};

function normalizeMarechal(row: RawMarechal): Marechal {
  const character = Array.isArray(row.characters)
    ? (row.characters[0] ?? null)
    : row.characters;
  const guild = character
    ? Array.isArray(character.guilds)
      ? (character.guilds[0] ?? null)
      : character.guilds
    : null;
  return {
    id: row.id,
    character_id: row.character_id,
    formation_2025: row.formation_2025,
    formation_2026: row.formation_2026,
    is_campaign_team: row.is_campaign_team,
    notes: row.notes,
    created_at: row.created_at,
    name: character?.name ?? "",
    player_name: character?.player_name ?? null,
    player_email: character?.player_email ?? null,
    guild_name: guild?.name ?? null,
  };
}

const MARECHAL_SELECT =
  "id, character_id, formation_2025, formation_2026, is_campaign_team, notes, created_at, characters(name, player_name, player_email, guilds(name))";

export function toTitleCase(value: string): string {
  return value
    .split(" ")
    .map((word) =>
      word
        .split("-")
        .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
        .join("-"),
    )
    .join(" ");
}

export function marechalDisplayName(m: {
  name: string;
  player_name: string | null;
}): string {
  return toTitleCase(m.player_name || m.name);
}

export async function listMarechaux(): Promise<Marechal[]> {
  const { data, error } = await supabase
    .from("marechaux")
    .select(MARECHAL_SELECT)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => normalizeMarechal(row as RawMarechal));
}

export async function addMarechal(characterId: number): Promise<Marechal> {
  const { data, error } = await supabase
    .from("marechaux")
    .insert({ character_id: characterId })
    .select(MARECHAL_SELECT)
    .single();
  if (error) throw error;
  return normalizeMarechal(data as RawMarechal);
}

export async function updateMarechal(
  id: string,
  input: {
    is_campaign_team: boolean;
    notes: string | null;
  },
): Promise<void> {
  const { error } = await supabase
    .from("marechaux")
    .update(input)
    .eq("id", id);
  if (error) throw error;
}

export async function setMarechalFormation(
  id: string,
  field: "formation_2025" | "formation_2026",
  value: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("marechaux")
    .update({ [field]: value })
    .eq("id", id);
  if (error) throw error;
}

export async function removeMarechal(id: string): Promise<void> {
  const { error } = await supabase.from("marechaux").delete().eq("id", id);
  if (error) throw error;
}

export type MarechalActivityStatus = {
  marechal_id: string;
  activity_id: string;
  is_available: boolean;
  is_assigned: boolean;
  is_confirmed: boolean;
  is_registered: boolean;
  briefing_7h45: string | null;
  homologation_8h9h: string | null;
  homologation_9h10h: string | null;
  briefing_17h: string | null;
  position: number;
};

export type MarechalScheduleSlot =
  | "briefing_7h45"
  | "homologation_8h9h"
  | "homologation_9h10h"
  | "briefing_17h";

export async function listMarechalActivityStatuses(
  activityId: string,
): Promise<MarechalActivityStatus[]> {
  const { data, error } = await supabase
    .from("marechal_activity_status")
    .select(
      "marechal_id, activity_id, is_available, is_assigned, is_confirmed, is_registered, briefing_7h45, homologation_8h9h, homologation_9h10h, briefing_17h, position",
    )
    .eq("activity_id", activityId)
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listActivityStatusesForMarechal(
  marechalId: string,
): Promise<MarechalActivityStatus[]> {
  const { data, error } = await supabase
    .from("marechal_activity_status")
    .select(
      "marechal_id, activity_id, is_available, is_assigned, is_confirmed, is_registered, briefing_7h45, homologation_8h9h, homologation_9h10h, briefing_17h, position",
    )
    .eq("marechal_id", marechalId);
  if (error) throw error;
  return data ?? [];
}

export async function reorderMarechalActivityStatuses(
  updates: { marechal_id: string; activity_id: string; position: number }[],
): Promise<void> {
  await Promise.all(
    updates.map(async ({ marechal_id, activity_id, position }) => {
      const { error } = await supabase
        .from("marechal_activity_status")
        .update({ position })
        .eq("marechal_id", marechal_id)
        .eq("activity_id", activity_id);
      if (error) throw error;
    }),
  );
}

export async function setMarechalActivityStatus(
  marechalId: string,
  activityId: string,
  input: {
    is_available?: boolean;
    is_assigned?: boolean;
    is_confirmed?: boolean;
    is_registered?: boolean;
  },
): Promise<void> {
  const { data: existing } = await supabase
    .from("marechal_activity_status")
    .select("is_available, is_assigned, is_confirmed, is_registered")
    .eq("marechal_id", marechalId)
    .eq("activity_id", activityId)
    .maybeSingle();

  const { error } = await supabase.from("marechal_activity_status").upsert(
    {
      marechal_id: marechalId,
      activity_id: activityId,
      is_available: input.is_available ?? existing?.is_available ?? false,
      is_assigned: input.is_assigned ?? existing?.is_assigned ?? false,
      is_confirmed: input.is_confirmed ?? existing?.is_confirmed ?? false,
      is_registered: input.is_registered ?? existing?.is_registered ?? false,
    },
    { onConflict: "marechal_id,activity_id" },
  );
  if (error) throw error;
}

export async function setMarechalScheduleSlot(
  marechalId: string,
  activityId: string,
  slot: MarechalScheduleSlot,
  value: string | null,
): Promise<void> {
  const { data: existing } = await supabase
    .from("marechal_activity_status")
    .select(
      "is_available, is_assigned, briefing_7h45, homologation_8h9h, homologation_9h10h, briefing_17h",
    )
    .eq("marechal_id", marechalId)
    .eq("activity_id", activityId)
    .maybeSingle();

  const { error } = await supabase.from("marechal_activity_status").upsert(
    {
      marechal_id: marechalId,
      activity_id: activityId,
      is_available: existing?.is_available ?? false,
      is_assigned: existing?.is_assigned ?? false,
      briefing_7h45: existing?.briefing_7h45 ?? null,
      homologation_8h9h: existing?.homologation_8h9h ?? null,
      homologation_9h10h: existing?.homologation_9h10h ?? null,
      briefing_17h: existing?.briefing_17h ?? null,
      [slot]: value,
    },
    { onConflict: "marechal_id,activity_id" },
  );
  if (error) throw error;
}

export async function listActivityStatusCounts(): Promise<
  Record<string, { available: number; assigned: number }>
> {
  const { data, error } = await supabase
    .from("marechal_activity_status")
    .select("activity_id, is_available, is_assigned");
  if (error) throw error;
  const counts: Record<string, { available: number; assigned: number }> = {};
  (data ?? []).forEach((row) => {
    const entry = counts[row.activity_id] ?? { available: 0, assigned: 0 };
    if (row.is_available) entry.available += 1;
    if (row.is_assigned) entry.assigned += 1;
    counts[row.activity_id] = entry;
  });
  return counts;
}

export async function listAssignedActivityCountByMarechal(): Promise<
  Record<string, number>
> {
  const { data, error } = await supabase
    .from("marechal_activity_status")
    .select("marechal_id")
    .eq("is_assigned", true);
  if (error) throw error;
  const counts: Record<string, number> = {};
  (data ?? []).forEach((row) => {
    counts[row.marechal_id] = (counts[row.marechal_id] ?? 0) + 1;
  });
  return counts;
}

export async function listAssignedMarechalIdsByActivity(): Promise<
  Record<string, string[]>
> {
  const { data, error } = await supabase
    .from("marechal_activity_status")
    .select("activity_id, marechal_id")
    .eq("is_assigned", true);
  if (error) throw error;
  const map: Record<string, string[]> = {};
  (data ?? []).forEach((row) => {
    (map[row.activity_id] ??= []).push(row.marechal_id);
  });
  return map;
}

export async function listNonCampaignTeamStatusCounts(): Promise<
  Record<string, { available: number; assigned: number }>
> {
  const [{ data: statusRows, error: statusError }, { data: teamRows, error: teamError }] =
    await Promise.all([
      supabase
        .from("marechal_activity_status")
        .select("activity_id, marechal_id, is_available, is_assigned"),
      supabase.from("marechaux").select("id").eq("is_campaign_team", true),
    ]);
  if (statusError) throw statusError;
  if (teamError) throw teamError;
  const teamIds = new Set((teamRows ?? []).map((row) => row.id));
  const counts: Record<string, { available: number; assigned: number }> = {};
  (statusRows ?? []).forEach((row) => {
    if (teamIds.has(row.marechal_id)) return;
    const entry = counts[row.activity_id] ?? { available: 0, assigned: 0 };
    if (row.is_available) entry.available += 1;
    if (row.is_assigned) entry.assigned += 1;
    counts[row.activity_id] = entry;
  });
  return counts;
}

export async function listCampaignTeamAssignedCounts(): Promise<
  Record<string, number>
> {
  const [{ data: statusRows, error: statusError }, { data: teamRows, error: teamError }] =
    await Promise.all([
      supabase
        .from("marechal_activity_status")
        .select("activity_id, marechal_id")
        .eq("is_assigned", true),
      supabase.from("marechaux").select("id").eq("is_campaign_team", true),
    ]);
  if (statusError) throw statusError;
  if (teamError) throw teamError;
  const teamIds = new Set((teamRows ?? []).map((row) => row.id));
  const counts: Record<string, number> = {};
  (statusRows ?? []).forEach((row) => {
    if (teamIds.has(row.marechal_id)) {
      counts[row.activity_id] = (counts[row.activity_id] ?? 0) + 1;
    }
  });
  return counts;
}
