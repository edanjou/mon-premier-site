import { supabase } from "@/lib/supabase";

export type Tournament = {
  id: string;
  name: string;
  date: string | null;
  rules: string | null;
  created_at: string;
};

export async function listTournaments(): Promise<Tournament[]> {
  const { data, error } = await supabase
    .from("tournaments")
    .select("id, name, date, rules, created_at")
    .order("date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createTournament(input: {
  name: string;
  date: string | null;
}): Promise<Tournament> {
  const { data, error } = await supabase
    .from("tournaments")
    .insert(input)
    .select("id, name, date, rules, created_at")
    .single();
  if (error) throw error;
  return data;
}

export async function updateTournament(
  id: string,
  input: { name: string; date: string | null },
): Promise<void> {
  const { error } = await supabase
    .from("tournaments")
    .update(input)
    .eq("id", id);
  if (error) throw error;
}

export async function updateTournamentRules(
  id: string,
  rules: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("tournaments")
    .update({ rules })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTournament(id: string): Promise<void> {
  const { error } = await supabase.from("tournaments").delete().eq("id", id);
  if (error) throw error;
}

export type TournamentScheduleBlock = {
  id: string;
  tournament_id: string;
  label: string;
  start_time: string | null;
  end_time: string | null;
  position: number;
};

export type TournamentScheduleBlockInput = {
  label: string;
  start_time: string | null;
  end_time: string | null;
  position: number;
};

export async function listTournamentScheduleBlocks(
  tournamentId: string,
): Promise<TournamentScheduleBlock[]> {
  const { data, error } = await supabase
    .from("tournament_schedule_blocks")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function saveTournamentScheduleBlocks(
  tournamentId: string,
  blocks: TournamentScheduleBlockInput[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("tournament_schedule_blocks")
    .delete()
    .eq("tournament_id", tournamentId);
  if (deleteError) throw deleteError;

  if (blocks.length === 0) return;

  const { error } = await supabase.from("tournament_schedule_blocks").insert(
    blocks.map((b) => ({
      tournament_id: tournamentId,
      label: b.label,
      start_time: b.start_time,
      end_time: b.end_time,
      position: b.position,
    })),
  );
  if (error) throw error;
}

export type TournamentVolunteer = {
  id: string;
  character_id: number;
  role: string | null;
  name: string;
  player_name: string | null;
};

type RawCharacterJoin = {
  name: string;
  player_name: string | null;
} | null;

type RawTournamentVolunteer = {
  id: string;
  character_id: number;
  role: string | null;
  characters: RawCharacterJoin | RawCharacterJoin[];
};

function normalizeVolunteer(row: RawTournamentVolunteer): TournamentVolunteer {
  const character = Array.isArray(row.characters)
    ? (row.characters[0] ?? null)
    : row.characters;
  return {
    id: row.id,
    character_id: row.character_id,
    role: row.role,
    name: character?.name ?? "",
    player_name: character?.player_name ?? null,
  };
}

const TOURNAMENT_VOLUNTEER_SELECT =
  "id, character_id, role, characters(name, player_name)";

export async function listTournamentVolunteers(
  tournamentId: string,
): Promise<TournamentVolunteer[]> {
  const { data, error } = await supabase
    .from("tournament_volunteers")
    .select(TOURNAMENT_VOLUNTEER_SELECT)
    .eq("tournament_id", tournamentId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) =>
    normalizeVolunteer(row as RawTournamentVolunteer),
  );
}

export async function addTournamentVolunteer(
  tournamentId: string,
  characterId: number,
): Promise<TournamentVolunteer> {
  const { data, error } = await supabase
    .from("tournament_volunteers")
    .insert({ tournament_id: tournamentId, character_id: characterId })
    .select(TOURNAMENT_VOLUNTEER_SELECT)
    .single();
  if (error) throw error;
  return normalizeVolunteer(data as RawTournamentVolunteer);
}

export async function updateTournamentVolunteerRole(
  id: string,
  role: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("tournament_volunteers")
    .update({ role })
    .eq("id", id);
  if (error) throw error;
}

export async function removeTournamentVolunteer(id: string): Promise<void> {
  const { error } = await supabase
    .from("tournament_volunteers")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
