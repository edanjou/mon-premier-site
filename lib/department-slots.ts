import { supabase } from "@/lib/supabase";

export type DepartmentSlot = {
  id: string;
  coordination_key: string;
  year: number;
  department_id: string;
  label: string;
  hours: number;
  position: number;
};

const SLOT_SELECT =
  "id, coordination_key, year, department_id, label, hours, position";

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
  input: { label: string; hours: number },
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
