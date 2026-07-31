import { supabase } from "@/lib/supabase";

async function getAppSettingValue(key: string): Promise<string | null> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return data?.value ?? null;
}

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
const CHARACTER_LAST_SYNCED_KEY = "character_sync_last_synced_at";
const RELIGION_MEMBER_LAST_SYNCED_KEY = "religion_member_sync_last_synced_at";

export async function getGuildSyncFrequency(): Promise<GuildSyncFrequency> {
  const value = await getAppSettingValue(GUILD_SYNC_FREQUENCY_KEY);
  return (value as GuildSyncFrequency | null) ?? "weekly";
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

export function getGuildLastSyncedAt(): Promise<string | null> {
  return getAppSettingValue(GUILD_LAST_SYNCED_KEY);
}

export function getCharacterLastSyncedAt(): Promise<string | null> {
  return getAppSettingValue(CHARACTER_LAST_SYNCED_KEY);
}

export function getReligionMemberLastSyncedAt(): Promise<string | null> {
  return getAppSettingValue(RELIGION_MEMBER_LAST_SYNCED_KEY);
}
