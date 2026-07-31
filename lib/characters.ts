import { supabase } from "@/lib/supabase";

export type Character = {
  external_id: number;
  name: string;
  guild_id: number | null;
  religion_name: string | null;
  is_npc: boolean;
  player_name: string | null;
  player_email: string | null;
  synced_at: string;
  guilds: { name: string } | null;
};

const SEARCH_RESULT_LIMIT = 100;

export async function searchCharacters(query: string): Promise<Character[]> {
  const sanitized = query.replace(/[%,()]/g, "").trim();
  if (!sanitized) return [];

  const { data, error } = await supabase
    .from("characters")
    .select("*, guilds(name)")
    .or(`name.ilike.%${sanitized}%,player_name.ilike.%${sanitized}%`)
    .order("name", { ascending: true })
    .limit(SEARCH_RESULT_LIMIT);

  if (error) throw error;
  return data ?? [];
}
