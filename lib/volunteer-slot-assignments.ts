import { supabase } from "@/lib/supabase";

export type VolunteerSlotAssignment = {
  volunteer_id: string;
  slot_id: string;
  absent: boolean;
};

export async function listAssignmentsForVolunteers(
  volunteerIds: string[],
): Promise<VolunteerSlotAssignment[]> {
  if (volunteerIds.length === 0) return [];
  const { data, error } = await supabase
    .from("volunteer_slot_assignments")
    .select("volunteer_id, slot_id, absent")
    .in("volunteer_id", volunteerIds);
  if (error) throw error;
  return data ?? [];
}

export async function assignVolunteerToSlot(
  volunteerId: string,
  slotId: string,
): Promise<void> {
  const { error } = await supabase
    .from("volunteer_slot_assignments")
    .insert({ volunteer_id: volunteerId, slot_id: slotId });
  if (error) throw error;
}

export async function unassignVolunteerFromSlot(
  volunteerId: string,
  slotId: string,
): Promise<void> {
  const { error } = await supabase
    .from("volunteer_slot_assignments")
    .delete()
    .eq("volunteer_id", volunteerId)
    .eq("slot_id", slotId);
  if (error) throw error;
}

export async function setSlotAbsence(
  volunteerId: string,
  slotId: string,
  absent: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("volunteer_slot_assignments")
    .update({ absent })
    .eq("volunteer_id", volunteerId)
    .eq("slot_id", slotId);
  if (error) throw error;
}
