import { supabase } from "@/lib/supabase";

export type DepartmentSlot = {
  id: string;
  coordination_key: string;
  year: number;
  department_id: string;
  label: string;
  hours: number;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  needed_volunteers: number | null;
  position: number;
};

const SLOT_SELECT =
  "id, coordination_key, year, department_id, label, hours, date, start_time, end_time, needed_volunteers, position";

export async function listAllDepartmentSlots(
  coordinationKey: string,
  year: number,
): Promise<DepartmentSlot[]> {
  const { data, error } = await supabase
    .from("department_slots")
    .select(SLOT_SELECT)
    .eq("coordination_key", coordinationKey)
    .eq("year", year)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DepartmentSlot[];
}

export async function createDepartmentSlot(input: {
  coordination_key: string;
  year: number;
  department_id: string;
  label: string;
  hours: number;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  needed_volunteers: number | null;
  position: number;
}): Promise<DepartmentSlot> {
  const { data, error } = await supabase
    .from("department_slots")
    .insert(input)
    .select(SLOT_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function updateDepartmentSlot(
  id: string,
  input: {
    label: string;
    hours: number;
    date: string | null;
    start_time: string | null;
    end_time: string | null;
    needed_volunteers: number | null;
  },
): Promise<void> {
  const { error } = await supabase
    .from("department_slots")
    .update(input)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteDepartmentSlot(id: string): Promise<void> {
  const { error } = await supabase
    .from("department_slots")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function reorderDepartmentSlots(
  updates: { id: string; position: number }[],
): Promise<void> {
  await Promise.all(
    updates.map(async ({ id, position }) => {
      const { error } = await supabase
        .from("department_slots")
        .update({ position })
        .eq("id", id);
      if (error) throw error;
    }),
  );
}
