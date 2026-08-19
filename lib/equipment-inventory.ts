import { supabase } from "@/lib/supabase";

export type EquipmentCondition = "Bon" | "Endommagé" | "À réparer" | "Perdu";

export const EQUIPMENT_CONDITIONS: EquipmentCondition[] = [
  "Bon",
  "Endommagé",
  "À réparer",
  "Perdu",
];

export type EquipmentItem = {
  id: string;
  coordination_key: string;
  name: string;
  quantity: number;
  condition: EquipmentCondition;
  notes: string | null;
};

const EQUIPMENT_SELECT =
  "id, coordination_key, name, quantity, condition, notes";

export async function listEquipmentItems(
  coordinationKey: string,
): Promise<EquipmentItem[]> {
  const { data, error } = await supabase
    .from("equipment_inventory")
    .select(EQUIPMENT_SELECT)
    .eq("coordination_key", coordinationKey)
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export type EquipmentItemInput = {
  name: string;
  quantity: number;
  condition: EquipmentCondition;
  notes: string | null;
};

export async function createEquipmentItem(
  coordinationKey: string,
  input: EquipmentItemInput,
): Promise<EquipmentItem> {
  const { data, error } = await supabase
    .from("equipment_inventory")
    .insert({ coordination_key: coordinationKey, ...input })
    .select(EQUIPMENT_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function updateEquipmentItem(
  id: string,
  input: EquipmentItemInput,
): Promise<void> {
  const { error } = await supabase
    .from("equipment_inventory")
    .update(input)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteEquipmentItem(id: string): Promise<void> {
  const { error } = await supabase
    .from("equipment_inventory")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
