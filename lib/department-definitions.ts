import { supabase } from "@/lib/supabase";

export type DepartmentDefinition = {
  id: string;
  coordination_key: string;
  year: number;
  name: string;
  position: number;
};

const DEPARTMENT_SELECT = "id, coordination_key, year, name, position";

export async function listDepartments(
  coordinationKey: string,
  year: number,
): Promise<DepartmentDefinition[]> {
  const { data, error } = await supabase
    .from("department_definitions")
    .select(DEPARTMENT_SELECT)
    .eq("coordination_key", coordinationKey)
    .eq("year", year)
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createDepartment(
  coordinationKey: string,
  year: number,
  name: string,
  position: number,
): Promise<DepartmentDefinition> {
  const { data, error } = await supabase
    .from("department_definitions")
    .insert({ coordination_key: coordinationKey, year, name, position })
    .select(DEPARTMENT_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function renameDepartment(
  id: string,
  name: string,
): Promise<void> {
  const { error } = await supabase
    .from("department_definitions")
    .update({ name })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteDepartment(id: string): Promise<void> {
  const { error } = await supabase
    .from("department_definitions")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
