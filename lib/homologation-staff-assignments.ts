import { supabase } from "@/lib/supabase";

export type HomologationStation =
  | "kiosque_haute_ville"
  | "kiosque_vieille_ville"
  | "mobile";

export const HOMOLOGATION_STATIONS: {
  key: HomologationStation;
  label: string;
}[] = [
  { key: "kiosque_haute_ville", label: "Haute-ville" },
  { key: "kiosque_vieille_ville", label: "Vieille-ville" },
  { key: "mobile", label: "Mobile" },
];

export function homologationStationLabel(station: HomologationStation): string {
  return HOMOLOGATION_STATIONS.find((s) => s.key === station)?.label ?? station;
}

export type HomologationStaffAssignment = {
  id: string;
  slot_id: string;
  volunteer_id: string;
  station: HomologationStation;
};

const SELECT = "id, slot_id, volunteer_id, station";

export async function listStaffAssignmentsForSlots(
  slotIds: string[],
): Promise<HomologationStaffAssignment[]> {
  if (slotIds.length === 0) return [];
  const { data, error } = await supabase
    .from("homologation_staff_assignments")
    .select(SELECT)
    .in("slot_id", slotIds);
  if (error) throw error;
  return data ?? [];
}

export async function setStaffStation(
  slotId: string,
  volunteerId: string,
  station: HomologationStation,
): Promise<void> {
  const { error } = await supabase.from("homologation_staff_assignments").upsert(
    { slot_id: slotId, volunteer_id: volunteerId, station },
    { onConflict: "slot_id,volunteer_id" },
  );
  if (error) throw error;
}

export async function clearStaffStation(
  slotId: string,
  volunteerId: string,
): Promise<void> {
  const { error } = await supabase
    .from("homologation_staff_assignments")
    .delete()
    .eq("slot_id", slotId)
    .eq("volunteer_id", volunteerId);
  if (error) throw error;
}
