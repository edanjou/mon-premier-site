import { supabase } from "@/lib/supabase";

export const CHECKLIST_ASSIGNEES = [
  "Éric",
  "Marie-Ève",
  "Vincent",
  "Roxanne",
  "Simon",
] as const;

export type ChecklistAssignee = (typeof CHECKLIST_ASSIGNEES)[number];

export const CHECKLIST_ASSIGNEE_STYLES: Record<ChecklistAssignee, string> = {
  Éric: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  "Marie-Ève":
    "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  Vincent:
    "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  Roxanne: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300",
  Simon:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
};

export const CHECKLIST_ASSIGNEE_UNSET_STYLE =
  "bg-white text-foreground dark:bg-zinc-800";

export const CHECKLIST_TYPES = ["Suivi", "Achat"] as const;

export type ChecklistType = (typeof CHECKLIST_TYPES)[number];

export const CHECKLIST_TYPE_STYLES: Record<ChecklistType, string> = {
  Suivi: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
  Achat:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
};

export const CHECKLIST_TYPE_UNSET_STYLE =
  "bg-white text-foreground dark:bg-zinc-800";

export type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  position: number;
  assigned_to: string | null;
  task_type: string | null;
  list_key: string;
  prompt: string | null;
};

const CHECKLIST_ITEM_SELECT =
  "id, label, done, position, assigned_to, task_type, list_key, prompt";

export async function listChecklistItems(
  listKey: string,
): Promise<ChecklistItem[]> {
  const { data, error } = await supabase
    .from("grandes_batailles_checklist")
    .select(CHECKLIST_ITEM_SELECT)
    .eq("list_key", listKey)
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createChecklistItem(
  listKey: string,
  label: string,
): Promise<ChecklistItem> {
  const { count } = await supabase
    .from("grandes_batailles_checklist")
    .select("id", { count: "exact", head: true })
    .eq("list_key", listKey);

  const { data, error } = await supabase
    .from("grandes_batailles_checklist")
    .insert({ list_key: listKey, label, position: count ?? 0 })
    .select(CHECKLIST_ITEM_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function updateChecklistItem(
  id: string,
  input: {
    label?: string;
    done?: boolean;
    assigned_to?: string | null;
    task_type?: string | null;
    prompt?: string | null;
  },
): Promise<void> {
  const { error } = await supabase
    .from("grandes_batailles_checklist")
    .update(input)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteChecklistItem(id: string): Promise<void> {
  const { error } = await supabase
    .from("grandes_batailles_checklist")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function reorderChecklistItems(
  updates: { id: string; position: number }[],
): Promise<void> {
  await Promise.all(
    updates.map(async ({ id, position }) => {
      const { error } = await supabase
        .from("grandes_batailles_checklist")
        .update({ position })
        .eq("id", id);
      if (error) throw error;
    }),
  );
}

export async function deleteCompletedChecklistItems(
  listKey: string,
): Promise<void> {
  const { error } = await supabase
    .from("grandes_batailles_checklist")
    .delete()
    .eq("list_key", listKey)
    .eq("done", true);
  if (error) throw error;
}
