import { supabase } from "@/lib/supabase";

export const VOLUNTEER_DEPARTMENTS = [
  "Escarmouches",
  "Homologation",
  "Grandes Batailles",
] as const;

export type VolunteerDepartment = (typeof VOLUNTEER_DEPARTMENTS)[number];

export type DepartmentSlot = {
  id: string;
  coordination_key: string;
  department: VolunteerDepartment;
  label: string;
  hours: number;
  position: number;
};

const SLOT_SELECT = "id, coordination_key, department, label, hours, position";

export async function listDepartmentSlots(
  coordinationKey: string,
  department: VolunteerDepartment,
): Promise<DepartmentSlot[]> {
  const { data, error } = await supabase
    .from("department_slots")
    .select(SLOT_SELECT)
    .eq("coordination_key", coordinationKey)
    .eq("department", department)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DepartmentSlot[];
}

export async function listAllDepartmentSlots(
  coordinationKey: string,
): Promise<DepartmentSlot[]> {
  const { data, error } = await supabase
    .from("department_slots")
    .select(SLOT_SELECT)
    .eq("coordination_key", coordinationKey)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DepartmentSlot[];
}

export async function createDepartmentSlot(input: {
  coordination_key: string;
  department: VolunteerDepartment;
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
