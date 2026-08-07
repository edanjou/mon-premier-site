import { supabase } from "@/lib/supabase";

export type Person = {
  id: string;
  name: string;
};

export async function listPeople(
  coordinationKey: string,
  year: number,
): Promise<Person[]> {
  const { data, error } = await supabase
    .from("people")
    .select("id, name")
    .eq("coordination_key", coordinationKey)
    .eq("year", year)
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createPerson(
  coordinationKey: string,
  year: number,
  name: string,
): Promise<Person> {
  const { data, error } = await supabase
    .from("people")
    .insert({ coordination_key: coordinationKey, year, name })
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
