import { supabase } from "@/lib/supabase";

export type KeyType = {
  id: string;
  coordination_key: string;
  name: string;
};

export async function listKeyTypes(
  coordinationKey: string,
): Promise<KeyType[]> {
  const { data, error } = await supabase
    .from("key_types")
    .select("id, coordination_key, name")
    .eq("coordination_key", coordinationKey)
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createKeyType(
  coordinationKey: string,
  name: string,
): Promise<KeyType> {
  const { data, error } = await supabase
    .from("key_types")
    .insert({ coordination_key: coordinationKey, name })
    .select("id, coordination_key, name")
    .single();
  if (error) throw error;
  return data;
}

export async function renameKeyType(id: string, name: string): Promise<void> {
  const { error } = await supabase
    .from("key_types")
    .update({ name })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteKeyType(id: string): Promise<void> {
  const { error } = await supabase.from("key_types").delete().eq("id", id);
  if (error) throw error;
}
