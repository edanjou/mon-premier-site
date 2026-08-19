import { supabase } from "@/lib/supabase";

export type EquipmentConsumable = {
  id: string;
  coordination_key: string;
  name: string;
  color: string;
  notes: string | null;
};

const CONSUMABLE_SELECT = "id, coordination_key, name, color, notes";

export async function listConsumables(
  coordinationKey: string,
): Promise<EquipmentConsumable[]> {
  const { data, error } = await supabase
    .from("equipment_consumables")
    .select(CONSUMABLE_SELECT)
    .eq("coordination_key", coordinationKey)
    .order("name", { ascending: true })
    .order("color", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export type EquipmentConsumableInput = {
  name: string;
  color: string;
  notes: string | null;
};

export async function createConsumable(
  coordinationKey: string,
  input: EquipmentConsumableInput,
): Promise<EquipmentConsumable> {
  const { data, error } = await supabase
    .from("equipment_consumables")
    .insert({ coordination_key: coordinationKey, ...input })
    .select(CONSUMABLE_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function updateConsumable(
  id: string,
  input: EquipmentConsumableInput,
): Promise<void> {
  const { error } = await supabase
    .from("equipment_consumables")
    .update(input)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteConsumable(id: string): Promise<void> {
  const { error } = await supabase
    .from("equipment_consumables")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export type EquipmentConsumableCount = {
  id: string;
  consumable_id: string;
  date: string;
  quantity: number;
};

const COUNT_SELECT = "id, consumable_id, date, quantity";

export async function listCountsForConsumables(
  consumableIds: string[],
): Promise<EquipmentConsumableCount[]> {
  if (consumableIds.length === 0) return [];
  const { data, error } = await supabase
    .from("equipment_consumable_counts")
    .select(COUNT_SELECT)
    .in("consumable_id", consumableIds)
    .order("date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addConsumableCount(
  consumableId: string,
  input: { date: string; quantity: number },
): Promise<EquipmentConsumableCount> {
  const { data, error } = await supabase
    .from("equipment_consumable_counts")
    .insert({ consumable_id: consumableId, ...input })
    .select(COUNT_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteConsumableCount(id: string): Promise<void> {
  const { error } = await supabase
    .from("equipment_consumable_counts")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
