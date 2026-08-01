import { supabase } from "@/lib/supabase";
import { decodeHtmlEntities } from "@/lib/text";

export type GuildSeal = {
  external_id: number;
  guild_id: number;
  seal_type: string;
  status: string;
  synced_at: string;
  guilds: { name: string } | null;
};

export async function listGuildSeals(): Promise<GuildSeal[]> {
  const { data, error } = await supabase
    .from("guild_seals")
    .select("*, guilds(name)")
    .order("seal_type", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((s) => ({
    ...s,
    guilds: s.guilds ? { name: decodeHtmlEntities(s.guilds.name) } : null,
  }));
}
