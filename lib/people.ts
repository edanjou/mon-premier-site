import { supabase } from "@/lib/supabase";

export type Person = {
  id: string;
  name: string;
};

export async function listPeople(coordinationKey: string): Promise<Person[]> {
  const { data, error } = await supabase
    .from("people")
    .select("id, name")
    .eq("coordination_key", coordinationKey)
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createPerson(
  coordinationKey: string,
  name: string,
): Promise<Person> {
  const { data, error } = await supabase
    .from("people")
    .insert({ coordination_key: coordinationKey, name })
    .select("id, name")
    .single();

  if (error) throw error;
  return data;
}

export async function renamePerson(id: string, name: string): Promise<void> {
  const { error } = await supabase.from("people").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function deletePerson(id: string): Promise<void> {
  const { error } = await supabase.from("people").delete().eq("id", id);
  if (error) throw error;
}
