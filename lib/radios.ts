import { supabase } from "@/lib/supabase";

export type RadioEntry = {
  id: string;
  coordination_key: string;
  number: number;
  headset_dure: boolean;
  headset_p2t: boolean;
  headset_agent: boolean;
  channel_prive: boolean;
  channel_batt_spare: boolean;
  event_coordination_id: string | null;
  last_name: string;
  first_name: string;
  notes: string | null;
};

const RADIO_SELECT =
  "id, coordination_key, number, headset_dure, headset_p2t, headset_agent, channel_prive, channel_batt_spare, event_coordination_id, last_name, first_name, notes";

export async function listRadios(
  coordinationKey: string,
): Promise<RadioEntry[]> {
  const { data, error } = await supabase
    .from("radios")
    .select(RADIO_SELECT)
    .eq("coordination_key", coordinationKey)
    .order("number", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export type RadioInput = {
  number: number;
  headset_dure: boolean;
  headset_p2t: boolean;
  headset_agent: boolean;
  channel_prive: boolean;
  channel_batt_spare: boolean;
  event_coordination_id: string | null;
  last_name: string;
  first_name: string;
  notes: string | null;
};

export async function createRadio(
  coordinationKey: string,
  input: RadioInput,
): Promise<RadioEntry> {
  const { data, error } = await supabase
    .from("radios")
    .insert({ coordination_key: coordinationKey, ...input })
    .select(RADIO_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function updateRadio(
  id: string,
  input: RadioInput,
): Promise<void> {
  const { error } = await supabase.from("radios").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteRadio(id: string): Promise<void> {
  const { error } = await supabase.from("radios").delete().eq("id", id);
  if (error) throw error;
}
