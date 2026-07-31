import { supabase } from "@/lib/supabase";

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
  return data ?? [];
}
