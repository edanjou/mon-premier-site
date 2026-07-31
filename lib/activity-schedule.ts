import { supabase } from "@/lib/supabase";

export type ScheduleBlock = {
  id: string;
  activity_id: string;
  label: string;
  start_time: string | null;
  duration: string | null;
  position: number;
};

export type ScheduleBlockInput = {
  label: string;
  start_time: string | null;
  duration: string | null;
  position: number;
};

export async function listScheduleBlocks(
  activityId: string,
): Promise<ScheduleBlock[]> {
  const { data, error } = await supabase
    .from("activity_schedule_blocks")
    .select("*")
    .eq("activity_id", activityId)
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function saveScheduleBlocks(
  activityId: string,
  blocks: ScheduleBlockInput[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("activity_schedule_blocks")
    .delete()
    .eq("activity_id", activityId);
  if (deleteError) throw deleteError;

  if (blocks.length === 0) return;

  const { error } = await supabase.from("activity_schedule_blocks").insert(
    blocks.map((b) => ({
      activity_id: activityId,
      label: b.label,
      start_time: b.start_time,
      duration: b.duration,
      position: b.position,
    })),
  );
  if (error) throw error;
}
