import { supabase } from "@/lib/supabase";

export type WeaponMaster = {
  id: string;
  character_id: number;
  created_at: string;
  name: string;
  player_name: string | null;
};

type RawCharacterJoin = {
  name: string;
  player_name: string | null;
} | null;

type RawWeaponMaster = {
  id: string;
  character_id: number;
  created_at: string;
  characters: RawCharacterJoin | RawCharacterJoin[];
};

function normalizeWeaponMaster(row: RawWeaponMaster): WeaponMaster {
  const character = Array.isArray(row.characters)
    ? (row.characters[0] ?? null)
    : row.characters;
  return {
    id: row.id,
    character_id: row.character_id,
    created_at: row.created_at,
    name: character?.name ?? "",
    player_name: character?.player_name ?? null,
  };
}

const WEAPON_MASTER_SELECT =
  "id, character_id, created_at, characters(name, player_name)";

export async function listWeaponMasters(): Promise<WeaponMaster[]> {
  const { data, error } = await supabase
    .from("weapon_masters")
    .select(WEAPON_MASTER_SELECT)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => normalizeWeaponMaster(row as RawWeaponMaster));
}

export async function addWeaponMaster(
  characterId: number,
): Promise<WeaponMaster> {
  const { data, error } = await supabase
    .from("weapon_masters")
    .insert({ character_id: characterId })
    .select(WEAPON_MASTER_SELECT)
    .single();
  if (error) throw error;
  return normalizeWeaponMaster(data as RawWeaponMaster);
}

export async function removeWeaponMaster(id: string): Promise<void> {
  const { error } = await supabase
    .from("weapon_masters")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export type WeaponMasterActivityStatus = {
  weapon_master_id: string;
  activity_id: string;
  is_available: boolean;
  is_assigned: boolean;
  front_color: string | null;
};

export async function listWeaponMasterActivityStatuses(
  activityId: string,
): Promise<WeaponMasterActivityStatus[]> {
  const { data, error } = await supabase
    .from("weapon_master_activity_status")
    .select("weapon_master_id, activity_id, is_available, is_assigned, front_color")
    .eq("activity_id", activityId);
  if (error) throw error;
  return data ?? [];
}

export async function setWeaponMasterActivityStatus(
  weaponMasterId: string,
  activityId: string,
  input: {
    is_available?: boolean;
    is_assigned?: boolean;
    front_color?: string | null;
  },
): Promise<void> {
  const { data: existing } = await supabase
    .from("weapon_master_activity_status")
    .select("is_available, is_assigned, front_color")
    .eq("weapon_master_id", weaponMasterId)
    .eq("activity_id", activityId)
    .maybeSingle();

  const { error } = await supabase.from("weapon_master_activity_status").upsert(
    {
      weapon_master_id: weaponMasterId,
      activity_id: activityId,
      is_available: input.is_available ?? existing?.is_available ?? false,
      is_assigned: input.is_assigned ?? existing?.is_assigned ?? false,
      front_color:
        input.front_color !== undefined
          ? input.front_color
          : (existing?.front_color ?? null),
    },
    { onConflict: "weapon_master_id,activity_id" },
  );
  if (error) throw error;
}

export async function listWeaponMasterActivityStatusCounts(): Promise<
  Record<string, { available: number; assigned: number }>
> {
  const { data, error } = await supabase
    .from("weapon_master_activity_status")
    .select("activity_id, is_available, is_assigned");
  if (error) throw error;
  const counts: Record<string, { available: number; assigned: number }> = {};
  (data ?? []).forEach((row) => {
    const entry = counts[row.activity_id] ?? { available: 0, assigned: 0 };
    if (row.is_available) entry.available += 1;
    if (row.is_assigned) entry.assigned += 1;
    counts[row.activity_id] = entry;
  });
  return counts;
}
