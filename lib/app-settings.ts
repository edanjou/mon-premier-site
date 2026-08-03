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

// Generic alias — this frequency scale and its interval math are shared by
// every scraped-data sync (guilds, characters, religion members), not just guilds.
export type SyncFrequency = GuildSyncFrequency;
export const SYNC_FREQUENCIES = GUILD_SYNC_FREQUENCIES;

export const FREQUENCY_INTERVAL_MS: Record<string, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  biweekly: 14 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
};

// Pure — safe to import from server-only sync modules that read app_settings
// via their own admin Supabase client rather than the one in this file.
export function isSyncDue(
  lastSyncedAt: string | null | undefined,
  frequency: string,
): boolean {
  if (!lastSyncedAt) return true;
  const intervalMs =
    FREQUENCY_INTERVAL_MS[frequency] ?? FREQUENCY_INTERVAL_MS.weekly;
  return Date.now() - new Date(lastSyncedAt).getTime() >= intervalMs;
}

const GUILD_SYNC_FREQUENCY_KEY = "guild_sync_frequency";
const GUILD_LAST_SYNCED_KEY = "guild_last_synced_at";
const CHARACTER_SYNC_FREQUENCY_KEY = "character_sync_frequency";
const CHARACTER_LAST_SYNCED_KEY = "character_sync_last_synced_at";
const RELIGION_MEMBER_SYNC_FREQUENCY_KEY = "religion_member_sync_frequency";
const RELIGION_MEMBER_LAST_SYNCED_KEY = "religion_member_sync_last_synced_at";

async function getSyncFrequency(key: string): Promise<SyncFrequency> {
  const value = await getAppSettingValue(key);
  return (value as SyncFrequency | null) ?? "weekly";
}

async function setSyncFrequency(
  key: string,
  frequency: SyncFrequency,
): Promise<void> {
  const { error } = await supabase.from("app_settings").upsert({
    key,
    value: frequency,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export function getGuildSyncFrequency(): Promise<GuildSyncFrequency> {
  return getSyncFrequency(GUILD_SYNC_FREQUENCY_KEY);
}

export function setGuildSyncFrequency(
  frequency: GuildSyncFrequency,
): Promise<void> {
  return setSyncFrequency(GUILD_SYNC_FREQUENCY_KEY, frequency);
}

export function getCharacterSyncFrequency(): Promise<SyncFrequency> {
  return getSyncFrequency(CHARACTER_SYNC_FREQUENCY_KEY);
}

export function setCharacterSyncFrequency(
  frequency: SyncFrequency,
): Promise<void> {
  return setSyncFrequency(CHARACTER_SYNC_FREQUENCY_KEY, frequency);
}

export function getReligionMemberSyncFrequency(): Promise<SyncFrequency> {
  return getSyncFrequency(RELIGION_MEMBER_SYNC_FREQUENCY_KEY);
}

export function setReligionMemberSyncFrequency(
  frequency: SyncFrequency,
): Promise<void> {
  return setSyncFrequency(RELIGION_MEMBER_SYNC_FREQUENCY_KEY, frequency);
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
