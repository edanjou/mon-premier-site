import { supabase } from "@/lib/supabase";

export type Medic = {
  id: string;
  character_id: number;
  created_at: string;
  is_responsable: boolean;
  name: string;
  player_name: string | null;
  player_email: string | null;
};

type RawCharacterJoin = {
  name: string;
  player_name: string | null;
  player_email: string | null;
} | null;

type RawMedic = {
  id: string;
  character_id: number;
  created_at: string;
  is_responsable: boolean;
  characters: RawCharacterJoin | RawCharacterJoin[];
};

function normalizeMedic(row: RawMedic): Medic {
  const character = Array.isArray(row.characters)
    ? (row.characters[0] ?? null)
    : row.characters;
  return {
    id: row.id,
    character_id: row.character_id,
    created_at: row.created_at,
    is_responsable: row.is_responsable,
    name: character?.name ?? "",
    player_name: character?.player_name ?? null,
    player_email: character?.player_email ?? null,
  };
}

const MEDIC_SELECT =
  "id, character_id, created_at, is_responsable, characters(name, player_name, player_email)";

export async function listMedics(): Promise<Medic[]> {
  const { data, error } = await supabase
    .from("medics")
    .select(MEDIC_SELECT)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => normalizeMedic(row as RawMedic));
}

export async function addMedic(characterId: number): Promise<Medic> {
  const { data, error } = await supabase
    .from("medics")
    .insert({ character_id: characterId })
    .select(MEDIC_SELECT)
    .single();
  if (error) throw error;
  return normalizeMedic(data as RawMedic);
}

export async function removeMedic(id: string): Promise<void> {
  const { error } = await supabase.from("medics").delete().eq("id", id);
  if (error) throw error;
}

export async function setResponsableMedic(id: string | null): Promise<void> {
  const { error: clearError } = await supabase
    .from("medics")
    .update({ is_responsable: false })
    .eq("is_responsable", true);
  if (clearError) throw clearError;
  if (!id) return;
  const { error } = await supabase
    .from("medics")
    .update({ is_responsable: true })
    .eq("id", id);
  if (error) throw error;
}

export type MedicActivityStatus = {
  medic_id: string;
  activity_id: string;
  is_available: boolean;
  is_assigned: boolean;
  is_confirmed: boolean;
  is_registered: boolean;
};

export async function listMedicActivityStatuses(
  activityId: string,
): Promise<MedicActivityStatus[]> {
  const { data, error } = await supabase
    .from("medic_activity_status")
    .select(
      "medic_id, activity_id, is_available, is_assigned, is_confirmed, is_registered",
    )
    .eq("activity_id", activityId);
  if (error) throw error;
  return data ?? [];
}

export async function setMedicActivityStatus(
  medicId: string,
  activityId: string,
  input: {
    is_available?: boolean;
    is_assigned?: boolean;
    is_confirmed?: boolean;
    is_registered?: boolean;
  },
): Promise<void> {
  const { data: existing } = await supabase
    .from("medic_activity_status")
    .select("is_available, is_assigned, is_confirmed, is_registered")
    .eq("medic_id", medicId)
    .eq("activity_id", activityId)
    .maybeSingle();

  const { error } = await supabase.from("medic_activity_status").upsert(
    {
      medic_id: medicId,
      activity_id: activityId,
      is_available: input.is_available ?? existing?.is_available ?? false,
      is_assigned: input.is_assigned ?? existing?.is_assigned ?? false,
      is_confirmed: input.is_confirmed ?? existing?.is_confirmed ?? false,
      is_registered: input.is_registered ?? existing?.is_registered ?? false,
    },
    { onConflict: "medic_id,activity_id" },
  );
  if (error) throw error;
}

export async function listMedicActivityStatusCounts(): Promise<
  Record<string, { available: number; assigned: number }>
> {
  const { data, error } = await supabase
    .from("medic_activity_status")
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
