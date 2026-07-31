import { supabase } from "@/lib/supabase";

export const GUILD_SYNC_FREQUENCIES = [
  { value: "daily", label: "Quotidienne" },
  { value: "weekly", label: "Hebdomadaire" },
  { value: "biweekly", label: "Aux deux semaines" },
  { value: "monthly", label: "Mensuelle" },
] as const;

export type GuildSyncFrequency =
  (typeof GUILD_SYNC_FREQUENCIES)[number]["value"];

const GUILD_SYNC_FREQUENCY_KEY = "guild_sync_frequency";
const GUILD_LAST_SYNCED_KEY = "guild_last_synced_at";

export async function getGuildSyncFrequency(): Promise<GuildSyncFrequency> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", GUILD_SYNC_FREQUENCY_KEY)
    .maybeSingle();
  return (data?.value as GuildSyncFrequency | undefined) ?? "weekly";
}

export async function setGuildSyncFrequency(
  frequency: GuildSyncFrequency,
): Promise<void> {
  const { error } = await supabase.from("app_settings").upsert({
    key: GUILD_SYNC_FREQUENCY_KEY,
    value: frequency,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function getGuildLastSyncedAt(): Promise<string | null> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", GUILD_LAST_SYNCED_KEY)
    .maybeSingle();
  return data?.value ?? null;
}

const CHARACTER_LAST_SYNCED_KEY = "character_sync_last_synced_at";

export async function getCharacterLastSyncedAt(): Promise<string | null> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", CHARACTER_LAST_SYNCED_KEY)
    .maybeSingle();
  return data?.value ?? null;
}
