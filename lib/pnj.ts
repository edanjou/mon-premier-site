import { supabase } from "@/lib/supabase";

export type Pnj = {
  id: string;
  character_id: number;
  created_at: string;
  name: string;
  player_name: string | null;
  recurring_characters: string | null;
  internal_note: string | null;
};

type RawCharacterJoin = {
  name: string;
  player_name: string | null;
} | null;

type RawPnj = {
  id: string;
  character_id: number;
  created_at: string;
  recurring_characters: string | null;
  internal_note: string | null;
  characters: RawCharacterJoin | RawCharacterJoin[];
};

function normalizePnj(row: RawPnj): Pnj {
  const character = Array.isArray(row.characters)
    ? (row.characters[0] ?? null)
    : row.characters;
  return {
    id: row.id,
    character_id: row.character_id,
    created_at: row.created_at,
    recurring_characters: row.recurring_characters,
    internal_note: row.internal_note,
    name: character?.name ?? "",
    player_name: character?.player_name ?? null,
  };
}

const PNJ_SELECT =
  "id, character_id, created_at, recurring_characters, internal_note, characters(name, player_name)";

export async function listPnj(): Promise<Pnj[]> {
  const { data, error } = await supabase
    .from("pnj")
    .select(PNJ_SELECT)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => normalizePnj(row as RawPnj));
}

export async function addPnj(characterId: number): Promise<Pnj> {
  const { data, error } = await supabase
    .from("pnj")
    .insert({ character_id: characterId })
    .select(PNJ_SELECT)
    .single();
  if (error) throw error;
  return normalizePnj(data as RawPnj);
}

export async function updatePnj(
  id: string,
  input: {
    recurring_characters: string | null;
    internal_note: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from("pnj").update(input).eq("id", id);
  if (error) throw error;
}

export async function removePnj(id: string): Promise<void> {
  const { error } = await supabase.from("pnj").delete().eq("id", id);
  if (error) throw error;
}
