import { supabase } from "@/lib/supabase";

export type PaperColor = "Blanc" | "Crème";

export const PAPER_COLORS: PaperColor[] = ["Blanc", "Crème"];

export type PrintRequest = {
  id: string;
  coordination_key: string;
  title: string | null;
  link: string | null;
  copies: number | null;
  format_85x11: boolean;
  format_85x14: boolean;
  format_11x17: boolean;
  finish_stapled: boolean;
  finish_laminated: boolean;
  paper_color: PaperColor;
  print_bw: boolean;
  print_color: boolean;
  print_single_sided: boolean;
  print_double_sided: boolean;
  event_coordination_id: string | null;
  added_by: string | null;
  done: boolean;
  notes: string | null;
};

const PRINT_REQUEST_SELECT =
  "id, coordination_key, title, link, copies, format_85x11, format_85x14, format_11x17, finish_stapled, finish_laminated, paper_color, print_bw, print_color, print_single_sided, print_double_sided, event_coordination_id, added_by, done, notes";

export async function listPrintRequests(
  coordinationKey: string,
): Promise<PrintRequest[]> {
  const { data, error } = await supabase
    .from("print_requests")
    .select(PRINT_REQUEST_SELECT)
    .eq("coordination_key", coordinationKey)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export type PrintRequestInput = {
  title: string | null;
  link: string | null;
  copies: number | null;
  format_85x11: boolean;
  format_85x14: boolean;
  format_11x17: boolean;
  finish_stapled: boolean;
  finish_laminated: boolean;
  paper_color: PaperColor;
  print_bw: boolean;
  print_color: boolean;
  print_single_sided: boolean;
  print_double_sided: boolean;
  event_coordination_id: string | null;
  added_by: string | null;
  done: boolean;
  notes: string | null;
};

export async function createPrintRequest(
  coordinationKey: string,
  input: PrintRequestInput,
): Promise<PrintRequest> {
  const { data, error } = await supabase
    .from("print_requests")
    .insert({ coordination_key: coordinationKey, ...input })
    .select(PRINT_REQUEST_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function updatePrintRequest(
  id: string,
  input: PrintRequestInput,
): Promise<void> {
  const { error } = await supabase
    .from("print_requests")
    .update(input)
    .eq("id", id);
  if (error) throw error;
}

export async function deletePrintRequest(id: string): Promise<void> {
  const { error } = await supabase
    .from("print_requests")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
