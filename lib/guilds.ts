import { supabase } from "@/lib/supabase";
import { decodeHtmlEntities } from "@/lib/text";

export type Guild = {
  external_id: number;
  name: string;
  member_count: number | null;
  presence_count: number | null;
  is_faction: boolean;
  synced_at: string;
};

export async function listGuilds(): Promise<Guild[]> {
  const { data, error } = await supabase
    .from("guilds")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((g) => ({ ...g, name: decodeHtmlEntities(g.name) }));
}
