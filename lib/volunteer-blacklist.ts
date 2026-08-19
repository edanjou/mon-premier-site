import { supabase } from "@/lib/supabase";

export type BlacklistEntry = {
  id: string;
  coordination_key: string;
  character_id: number;
  reason: string | null;
  created_at: string;
  name: string;
  player_name: string | null;
};

type RawCharacterJoin =
  | { name: string; player_name: string | null }
  | { name: string; player_name: string | null }[]
  | null;

type RawBlacklistEntry = {
  id: string;
  coordination_key: string;
  character_id: number;
  reason: string | null;
  created_at: string;
  characters: RawCharacterJoin;
};

function normalize(row: RawBlacklistEntry): BlacklistEntry {
  const character = Array.isArray(row.characters)
    ? (row.characters[0] ?? null)
    : row.characters;
  return {
    id: row.id,
    coordination_key: row.coordination_key,
    character_id: row.character_id,
    reason: row.reason,
    created_at: row.created_at,
    name: character?.name ?? "",
    player_name: character?.player_name ?? null,
  };
}

const BLACKLIST_SELECT =
  "id, coordination_key, character_id, reason, created_at, characters(name, player_name)";

export async function listBlacklist(
  coordinationKey: string,
): Promise<BlacklistEntry[]> {
  const { data, error } = await supabase
    .from("volunteer_blacklist")
    .select(BLACKLIST_SELECT)
    .eq("coordination_key", coordinationKey)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => normalize(row as RawBlacklistEntry));
}

export async function addToBlacklist(
  coordinationKey: string,
  characterId: number,
  reason: string | null,
): Promise<void> {
  const { error } = await supabase.from("volunteer_blacklist").insert({
    coordination_key: coordinationKey,
    character_id: characterId,
    reason,
  });
  if (error) throw error;
}

export async function removeFromBlacklist(id: string): Promise<void> {
  const { error } = await supabase
    .from("volunteer_blacklist")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
