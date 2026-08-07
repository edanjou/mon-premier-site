import { supabase } from "@/lib/supabase";

export type TimesheetEntry = {
  id: string;
  date: string;
  category_id: string | null;
  category_name: string | null;
  description: string | null;
  hours: Record<string, number>;
};

export type TimesheetEntryInput = {
  date: string;
  category_id: string | null;
  description: string | null;
  hours: Record<string, number>;
};

type RawCategoryJoin = { name: string } | { name: string }[] | null;

type RawHourRow = { person_id: string; hours: number };

type RawTimesheetEntry = {
  id: string;
  date: string;
  category_id: string | null;
  description: string | null;
  timesheet_categories: RawCategoryJoin;
  timesheet_entry_hours: RawHourRow[];
};

function normalizeEntry(row: RawTimesheetEntry): TimesheetEntry {
  const category = Array.isArray(row.timesheet_categories)
    ? (row.timesheet_categories[0] ?? null)
    : row.timesheet_categories;
  const hours: Record<string, number> = {};
  for (const h of row.timesheet_entry_hours ?? []) {
    hours[h.person_id] = h.hours;
  }
  return {
    id: row.id,
    date: row.date,
    category_id: row.category_id,
    category_name: category?.name ?? null,
    description: row.description,
    hours,
  };
}

const ENTRY_SELECT =
  "id, date, category_id, description, timesheet_categories(name), timesheet_entry_hours(person_id, hours)";

export async function listTimesheetEntries(
  coordinationKey: string,
  year: number,
): Promise<TimesheetEntry[]> {
  const { data, error } = await supabase
    .from("timesheet_entries")
    .select(ENTRY_SELECT)
    .eq("coordination_key", coordinationKey)
    .eq("year", year)
    .order("date", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => normalizeEntry(row as RawTimesheetEntry));
}

async function saveHours(
  entryId: string,
  hours: Record<string, number>,
): Promise<void> {
  const rows = Object.entries(hours)
    .filter(([, value]) => value > 0)
    .map(([person_id, value]) => ({
      entry_id: entryId,
      person_id,
      hours: value,
    }));
  if (rows.length === 0) return;
  const { error } = await supabase.from("timesheet_entry_hours").insert(rows);
  if (error) throw error;
}

export async function createTimesheetEntry(
  coordinationKey: string,
  year: number,
  input: TimesheetEntryInput,
): Promise<string> {
  const { hours, ...rest } = input;
  const { data, error } = await supabase
    .from("timesheet_entries")
    .insert({ ...rest, coordination_key: coordinationKey, year })
    .select("id")
    .single();
  if (error) throw error;
  await saveHours(data.id, hours);
  return data.id;
}

export async function updateTimesheetEntry(
  id: string,
  input: TimesheetEntryInput,
): Promise<void> {
  const { hours, ...rest } = input;
  const { error } = await supabase
    .from("timesheet_entries")
    .update(rest)
    .eq("id", id);
  if (error) throw error;

  const { error: deleteError } = await supabase
    .from("timesheet_entry_hours")
    .delete()
    .eq("entry_id", id);
  if (deleteError) throw deleteError;

  await saveHours(id, hours);
}

export async function deleteTimesheetEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from("timesheet_entries")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
