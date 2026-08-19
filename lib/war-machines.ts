import { supabase } from "@/lib/supabase";

export type WarMachineStatus = "en_attente" | "approuve";

export const WAR_MACHINE_STATUSES: {
  key: WarMachineStatus;
  label: string;
}[] = [
  { key: "en_attente", label: "En attente" },
  { key: "approuve", label: "Approuvé" },
];

export type MachineType = "Canon" | "Baliste";

export const MACHINE_TYPES: MachineType[] = ["Canon", "Baliste"];

export type WarMachine = {
  id: string;
  name: string;
  machine_type: MachineType;
  owner: string;
  description: string | null;
  status: WarMachineStatus;
  created_at: string;
};

const SELECT =
  "id, name, machine_type, owner, description, status, created_at";

export async function listWarMachines(): Promise<WarMachine[]> {
  const { data, error } = await supabase
    .from("war_machines")
    .select(SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export type WarMachineInput = {
  name: string;
  machine_type: MachineType;
  owner: string;
  description: string | null;
};

export async function createWarMachine(
  input: WarMachineInput,
): Promise<WarMachine> {
  const { data, error } = await supabase
    .from("war_machines")
    .insert({ ...input, status: "en_attente" })
    .select(SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function updateWarMachine(
  id: string,
  input: WarMachineInput,
): Promise<void> {
  const { error } = await supabase
    .from("war_machines")
    .update(input)
    .eq("id", id);
  if (error) throw error;
}

export async function setWarMachineStatus(
  id: string,
  status: WarMachineStatus,
): Promise<void> {
  const { error } = await supabase
    .from("war_machines")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteWarMachine(id: string): Promise<void> {
  const { error } = await supabase.from("war_machines").delete().eq("id", id);
  if (error) throw error;
}
