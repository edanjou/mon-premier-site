import { supabase } from "@/lib/supabase";

export type EventCoordination = {
  id: string;
  name: string;
};

export async function listEventCoordinations(): Promise<EventCoordination[]> {
  const { data, error } = await supabase
    .from("event_coordinations")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createEventCoordination(
  name: string,
): Promise<EventCoordination> {
  const { data, error } = await supabase
    .from("event_coordinations")
    .insert({ name })
    .select("id, name")
    .single();

  if (error) throw error;
  return data;
}

export async function renameEventCoordination(
  id: string,
  name: string,
): Promise<void> {
  const { error } = await supabase
    .from("event_coordinations")
    .update({ name })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteEventCoordination(id: string): Promise<void> {
  const { error } = await supabase
    .from("event_coordinations")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
