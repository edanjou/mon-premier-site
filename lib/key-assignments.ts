import { supabase } from "@/lib/supabase";

export type KeyAssignment = {
  id: string;
  coordination_key: string;
  key_type_id: string;
  event_coordination_id: string | null;
  last_name: string;
  first_name: string;
  given: boolean;
  notes: string | null;
};

const KEY_ASSIGNMENT_SELECT =
  "id, coordination_key, key_type_id, event_coordination_id, last_name, first_name, given, notes";

export async function listKeyAssignments(
  coordinationKey: string,
): Promise<KeyAssignment[]> {
  const { data, error } = await supabase
    .from("key_assignments")
    .select(KEY_ASSIGNMENT_SELECT)
    .eq("coordination_key", coordinationKey);
  if (error) throw error;
  return data ?? [];
}

export type KeyAssignmentInput = {
  key_type_id: string;
  event_coordination_id: string | null;
  last_name: string;
  first_name: string;
  given: boolean;
  notes: string | null;
};

export async function createKeyAssignment(
  coordinationKey: string,
  input: KeyAssignmentInput,
): Promise<KeyAssignment> {
  const { data, error } = await supabase
    .from("key_assignments")
    .insert({ coordination_key: coordinationKey, ...input })
    .select(KEY_ASSIGNMENT_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function updateKeyAssignment(
  id: string,
  input: KeyAssignmentInput,
): Promise<void> {
  const { error } = await supabase
    .from("key_assignments")
    .update(input)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteKeyAssignment(id: string): Promise<void> {
  const { error } = await supabase
    .from("key_assignments")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
