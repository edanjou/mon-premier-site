import { supabase } from "@/lib/supabase";

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
  return data ?? [];
}
