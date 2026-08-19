import { supabase } from "@/lib/supabase";

export type HomologationSchedule = {
  id: string;
  name: string;
  date: string;
  created_at: string;
};

export type HomologationScheduleInput = {
  name: string;
  date: string;
};

export async function listHomologationSchedules(): Promise<
  HomologationSchedule[]
> {
  const { data, error } = await supabase
    .from("homologation_schedules")
    .select("*")
    .order("date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createHomologationSchedule(
  input: HomologationScheduleInput,
): Promise<HomologationSchedule> {
  const { data, error } = await supabase
    .from("homologation_schedules")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateHomologationSchedule(
  id: string,
  input: HomologationScheduleInput,
): Promise<void> {
  const { error } = await supabase
    .from("homologation_schedules")
    .update(input)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteHomologationSchedule(id: string): Promise<void> {
  const { error } = await supabase
    .from("homologation_schedules")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export type HomologationSlot = {
  id: string;
  quartier_id: string;
  start_time: string | null;
  end_time: string | null;
  capacity: number;
  position: number;
};

export type HomologationSlotInput = {
  quartier_id: string;
  start_time: string | null;
  end_time: string | null;
  capacity: number;
  position: number;
};

export async function listHomologationSlots(
  scheduleId: string,
): Promise<HomologationSlot[]> {
  const { data, error } = await supabase
    .from("homologation_schedule_slots")
    .select("id, quartier_id, start_time, end_time, capacity, position")
    .eq("schedule_id", scheduleId)
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function saveHomologationSlots(
  scheduleId: string,
  slots: HomologationSlotInput[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("homologation_schedule_slots")
    .delete()
    .eq("schedule_id", scheduleId);
  if (deleteError) throw deleteError;

  if (slots.length === 0) return;

  const { error } = await supabase.from("homologation_schedule_slots").insert(
    slots.map((slot, index) => ({
      schedule_id: scheduleId,
      quartier_id: slot.quartier_id,
      start_time: slot.start_time,
      end_time: slot.end_time,
      capacity: slot.capacity,
      position: index,
    })),
  );
  if (error) throw error;
}

export type HomologationRegistration = {
  id: string;
  slot_id: string;
  character_name: string;
  created_at: string;
};

export async function listRegistrationsForSlots(
  slotIds: string[],
): Promise<HomologationRegistration[]> {
  if (slotIds.length === 0) return [];
  const { data, error } = await supabase
    .from("homologation_registrations")
    .select("id, slot_id, character_name, created_at")
    .in("slot_id", slotIds)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function deleteRegistration(id: string): Promise<void> {
  const { error } = await supabase
    .from("homologation_registrations")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
