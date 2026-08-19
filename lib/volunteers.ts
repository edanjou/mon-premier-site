import { supabase } from "@/lib/supabase";

export type Volunteer = {
  id: string;
  character_id: number;
  coordination_key: string;
  year: number;
  created_at: string;
  hours_confirmed: boolean;
  discount_scheduled: boolean;
  hours_adjustment: number;
  name: string;
  player_name: string | null;
  player_email: string | null;
};

type RawCharacterJoin = {
  name: string;
  player_name: string | null;
  player_email: string | null;
} | null;

type RawVolunteer = {
  id: string;
  character_id: number;
  coordination_key: string;
  year: number;
  created_at: string;
  hours_confirmed: boolean;
  discount_scheduled: boolean;
  hours_adjustment: number;
  characters: RawCharacterJoin | RawCharacterJoin[];
};

function normalizeVolunteer(row: RawVolunteer): Volunteer {
  const character = Array.isArray(row.characters)
    ? (row.characters[0] ?? null)
    : row.characters;
  return {
    id: row.id,
    character_id: row.character_id,
    coordination_key: row.coordination_key,
    year: row.year,
    created_at: row.created_at,
    hours_confirmed: row.hours_confirmed,
    discount_scheduled: row.discount_scheduled,
    hours_adjustment: row.hours_adjustment,
    name: character?.name ?? "",
    player_name: character?.player_name ?? null,
    player_email: character?.player_email ?? null,
  };
}

const VOLUNTEER_SELECT =
  "id, character_id, coordination_key, year, created_at, hours_confirmed, discount_scheduled, hours_adjustment, characters(name, player_name, player_email)";

export async function listVolunteers(
  coordinationKey: string,
  year: number,
): Promise<Volunteer[]> {
  const { data, error } = await supabase
    .from("volunteers")
    .select(VOLUNTEER_SELECT)
    .eq("coordination_key", coordinationKey)
    .eq("year", year)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => normalizeVolunteer(row as RawVolunteer));
}

export async function addVolunteer(
  coordinationKey: string,
  year: number,
  characterId: number,
): Promise<Volunteer> {
  const { data, error } = await supabase
    .from("volunteers")
    .insert({
      coordination_key: coordinationKey,
      year,
      character_id: characterId,
    })
    .select(VOLUNTEER_SELECT)
    .single();
  if (error) throw error;
  return normalizeVolunteer(data as RawVolunteer);
}

export async function removeVolunteer(id: string): Promise<void> {
  const { error } = await supabase.from("volunteers").delete().eq("id", id);
  if (error) throw error;
}

export async function setVolunteerStatus(
  id: string,
  field: "hours_confirmed" | "discount_scheduled",
  value: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("volunteers")
    .update({ [field]: value })
    .eq("id", id);
  if (error) throw error;
}

export async function setVolunteerHoursAdjustment(
  id: string,
  value: number,
): Promise<void> {
  const { error } = await supabase
    .from("volunteers")
    .update({ hours_adjustment: value })
    .eq("id", id);
  if (error) throw error;
}

// Used from the centralized volunteer view: a character can have one
// `volunteers` row per coordination, so scheduling their discount touches
// every row at once rather than a single id.
export async function setDiscountScheduledForCharacter(
  characterId: number,
  value: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("volunteers")
    .update({ discount_scheduled: value })
    .eq("character_id", characterId);
  if (error) throw error;
}

export async function getOrCreateVolunteer(
  coordinationKey: string,
  year: number,
  characterId: number,
): Promise<Volunteer> {
  const { data: existing, error: selectError } = await supabase
    .from("volunteers")
    .select(VOLUNTEER_SELECT)
    .eq("coordination_key", coordinationKey)
    .eq("year", year)
    .eq("character_id", characterId)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return normalizeVolunteer(existing as RawVolunteer);
  return addVolunteer(coordinationKey, year, characterId);
}
