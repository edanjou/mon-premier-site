import { supabase } from "@/lib/supabase";

export type MarechalTask = {
  id: string;
  chapter_id: string;
  chapter_title: string;
  activity_id: string;
  activity_name: string;
  label: string;
  assigned_marechal_id: string | null;
  task_type_id: string | null;
  task_type_name: string | null;
  is_ramassage: boolean;
  done: boolean;
  position: number;
};

type RawActivityJoin = { id: string; name: string } | { id: string; name: string }[] | null;

type RawChapterJoin =
  | { title: string; activities: RawActivityJoin }
  | { title: string; activities: RawActivityJoin }[]
  | null;

type RawTaskTypeJoin = { name: string } | { name: string }[] | null;

type RawMarechalTask = {
  id: string;
  chapter_id: string;
  label: string;
  assigned_marechal_id: string | null;
  task_type_id: string | null;
  is_ramassage: boolean;
  done: boolean;
  position: number;
  activity_chapters: RawChapterJoin;
  task_types: RawTaskTypeJoin;
};

function normalizeTask(row: RawMarechalTask): MarechalTask {
  const chapter = Array.isArray(row.activity_chapters)
    ? (row.activity_chapters[0] ?? null)
    : row.activity_chapters;
  const activity = chapter
    ? Array.isArray(chapter.activities)
      ? (chapter.activities[0] ?? null)
      : chapter.activities
    : null;
  const taskType = Array.isArray(row.task_types)
    ? (row.task_types[0] ?? null)
    : row.task_types;
  return {
    id: row.id,
    chapter_id: row.chapter_id,
    chapter_title: chapter?.title ?? "",
    activity_id: activity?.id ?? "",
    activity_name: activity?.name ?? "",
    label: row.label,
    assigned_marechal_id: row.assigned_marechal_id,
    task_type_id: row.task_type_id,
    task_type_name: taskType?.name ?? null,
    is_ramassage: row.is_ramassage,
    done: row.done,
    position: row.position,
  };
}

const TASK_SELECT =
  "id, chapter_id, label, assigned_marechal_id, task_type_id, is_ramassage, done, position, activity_chapters(title, activities(id, name)), task_types(name)";

export async function listAllMarechalTasks(): Promise<MarechalTask[]> {
  const { data, error } = await supabase
    .from("marechal_tasks")
    .select(TASK_SELECT)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => normalizeTask(row as RawMarechalTask));
}

export async function listMarechalTasksByChapter(
  chapterId: string,
): Promise<MarechalTask[]> {
  const { data, error } = await supabase
    .from("marechal_tasks")
    .select(TASK_SELECT)
    .eq("chapter_id", chapterId)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => normalizeTask(row as RawMarechalTask));
}

export async function createMarechalTask(input: {
  chapter_id: string;
  label: string;
  task_type_id: string | null;
  is_ramassage: boolean;
  assigned_marechal_id?: string | null;
}): Promise<MarechalTask> {
  const { data: lowest } = await supabase
    .from("marechal_tasks")
    .select("position")
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("marechal_tasks")
    .insert({ ...input, position: (lowest?.position ?? 0) - 1 })
    .select(TASK_SELECT)
    .single();
  if (error) throw error;
  return normalizeTask(data as RawMarechalTask);
}

export async function updateMarechalTask(
  id: string,
  input: {
    label?: string;
    assigned_marechal_id?: string | null;
    task_type_id?: string | null;
    is_ramassage?: boolean;
    done?: boolean;
  },
): Promise<void> {
  const { error } = await supabase
    .from("marechal_tasks")
    .update(input)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteMarechalTask(id: string): Promise<void> {
  const { error } = await supabase.from("marechal_tasks").delete().eq("id", id);
  if (error) throw error;
}
