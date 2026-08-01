import { supabase } from "@/lib/supabase";
import { decodeHtmlEntities } from "@/lib/text";

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

export type CharacterSearchFilters = {
  guildId?: number | null;
  religionName?: string | null;
};

export async function searchCharacters(
  query: string,
  filters: CharacterSearchFilters = {},
): Promise<Character[]> {
  const sanitized = query.replace(/[%,()]/g, "").trim();
  const { guildId, religionName } = filters;
  if (!sanitized && !guildId && !religionName) return [];

  let request = supabase.from("characters").select("*, guilds(name)");
  if (sanitized) {
    request = request.or(
      `name.ilike.%${sanitized}%,player_name.ilike.%${sanitized}%,religion_name.ilike.%${sanitized}%,player_email.ilike.%${sanitized}%`,
    );
  }
  if (guildId != null) request = request.eq("guild_id", guildId);
  if (religionName) request = request.eq("religion_name", religionName);

  const { data, error } = await request
    .order("name", { ascending: true })
    .limit(SEARCH_RESULT_LIMIT);

  if (error) throw error;
  return (data ?? []).map((c) => ({
    ...c,
    name: decodeHtmlEntities(c.name),
    player_name: c.player_name ? decodeHtmlEntities(c.player_name) : null,
    religion_name: c.religion_name ? decodeHtmlEntities(c.religion_name) : null,
    guilds: c.guilds ? { name: decodeHtmlEntities(c.guilds.name) } : null,
  }));
}
