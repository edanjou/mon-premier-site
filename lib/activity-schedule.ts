import { supabase } from "@/lib/supabase";

export type ScheduleBlock = {
  id: string;
  activity_id: string;
  label: string;
  start_time: string | null;
  end_time: string | null;
  position: number;
};

export type ScheduleBlockInput = {
  label: string;
  start_time: string | null;
  end_time: string | null;
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
      end_time: b.end_time,
      position: b.position,
    })),
  );
  if (error) throw error;
}

export type ScheduleRow = {
  key: string;
  label: string;
  startTime: string;
  endTime: string;
  isChapter: boolean;
  position: number;
  hasConflict: boolean;
};

function parseTimeToMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return null;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

function formatMinutesToTime(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Comprend les durées prédéfinies des chapitres (ex. "2 heures 30") ainsi que
// des durées libres au format similaire (ex. "45 minutes"). Retourne null si
// non reconnu (ex. "Toute la journée" ou un texte personnalisé quelconque) —
// ce chapitre est alors simplement exclu de la détection de conflits.
function parseChapterDurationToMinutes(duration: string): number | null {
  const hours = /^(\d+)\s*heures?(?:\s+(\d+))?$/.exec(duration.trim());
  if (hours) {
    return (
      parseInt(hours[1], 10) * 60 + (hours[2] ? parseInt(hours[2], 10) : 0)
    );
  }
  const minutes = /^(\d+)\s*minutes?$/.exec(duration.trim());
  if (minutes) return parseInt(minutes[1], 10);
  return null;
}

export function computeChapterEndTime(
  startTime: string | null,
  duration: string | null,
): string {
  const startMin = startTime ? parseTimeToMinutes(startTime) : null;
  const durationMin = duration ? parseChapterDurationToMinutes(duration) : null;
  if (startMin == null || durationMin == null) return "";
  return formatMinutesToTime(startMin + durationMin);
}

export function buildScheduleRows(
  chapters: {
    id: string;
    title: string;
    start_time: string | null;
    duration: string | null;
    position: number;
  }[],
  blocks: {
    key: string;
    label: string;
    startTime: string;
    endTime: string;
    position: number;
  }[],
): ScheduleRow[] {
  const rows: Omit<ScheduleRow, "hasConflict">[] = [
    ...chapters.map((c) => ({
      key: c.id,
      label: c.title,
      startTime: c.start_time ?? "",
      endTime: computeChapterEndTime(c.start_time, c.duration),
      isChapter: true,
      position: c.position,
    })),
    ...blocks.map((b) => ({
      key: b.key,
      label: b.label,
      startTime: b.startTime,
      endTime: b.endTime,
      isChapter: false,
      position: b.position,
    })),
  ].sort((a, b) => a.position - b.position);

  const intervals = rows
    .map((row, index) => {
      const start = parseTimeToMinutes(row.startTime);
      const end = parseTimeToMinutes(row.endTime);
      return start != null && end != null && end > start
        ? { index, start, end }
        : null;
    })
    .filter((v): v is { index: number; start: number; end: number } =>
      Boolean(v),
    );

  const conflicting = new Set<number>();
  for (let i = 0; i < intervals.length; i++) {
    for (let j = i + 1; j < intervals.length; j++) {
      if (
        intervals[i].start < intervals[j].end &&
        intervals[j].start < intervals[i].end
      ) {
        conflicting.add(intervals[i].index);
        conflicting.add(intervals[j].index);
      }
    }
  }

  return rows.map((row, index) => ({
    ...row,
    hasConflict: conflicting.has(index),
  }));
}
