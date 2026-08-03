import { supabase } from "@/lib/supabase";

export type TimesheetCategory = {
  id: string;
  name: string;
};

export async function listTimesheetCategories(
  coordinationKey: string,
): Promise<TimesheetCategory[]> {
  const { data, error } = await supabase
    .from("timesheet_categories")
    .select("id, name")
    .eq("coordination_key", coordinationKey)
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createTimesheetCategory(
  coordinationKey: string,
  name: string,
): Promise<TimesheetCategory> {
  const { data, error } = await supabase
    .from("timesheet_categories")
    .insert({ coordination_key: coordinationKey, name })
    .select("id, name")
    .single();

  if (error) throw error;
  return data;
}

export async function renameTimesheetCategory(
  id: string,
  name: string,
): Promise<void> {
  const { error } = await supabase
    .from("timesheet_categories")
    .update({ name })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTimesheetCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from("timesheet_categories")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
