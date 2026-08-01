import { supabase } from "@/lib/supabase";

export type TaskType = {
  id: string;
  name: string;
};

export async function listTaskTypes(): Promise<TaskType[]> {
  const { data, error } = await supabase
    .from("task_types")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createTaskType(name: string): Promise<TaskType> {
  const { data, error } = await supabase
    .from("task_types")
    .insert({ name })
    .select("id, name")
    .single();

  if (error) throw error;
  return data;
}

export async function renameTaskType(id: string, name: string): Promise<void> {
  const { error } = await supabase
    .from("task_types")
    .update({ name })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTaskType(id: string): Promise<void> {
  const { error } = await supabase.from("task_types").delete().eq("id", id);
  if (error) throw error;
}
