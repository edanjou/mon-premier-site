import { supabase } from "@/lib/supabase";
import type { HomologationStation } from "@/lib/homologation-staff-assignments";

export type HomologationStationNeed = {
  id: string;
  slot_id: string;
  station: HomologationStation;
  needed_count: number;
};

const SELECT = "id, slot_id, station, needed_count";

export async function listStationNeedsForSlots(
  slotIds: string[],
): Promise<HomologationStationNeed[]> {
  if (slotIds.length === 0) return [];
  const { data, error } = await supabase
    .from("homologation_station_needs")
    .select(SELECT)
    .in("slot_id", slotIds);
  if (error) throw error;
  return data ?? [];
}

export async function setStationNeed(
  slotId: string,
  station: HomologationStation,
  neededCount: number,
): Promise<void> {
  const { error } = await supabase.from("homologation_station_needs").upsert(
    { slot_id: slotId, station, needed_count: neededCount },
    { onConflict: "slot_id,station" },
  );
  if (error) throw error;
}
