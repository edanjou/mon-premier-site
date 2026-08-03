import type { Battlefield } from "@/lib/battlefields";
import { supabase } from "@/lib/supabase";

export { CHAPTER_HEALING_MODES } from "@/lib/activity-chapters";

export type ChapterObjective = {
  id: string;
  description: string | null;
  rewards_detail: string | null;
  percentage: number;
  position: number;
};

export type ChapterObjectiveInput = {
  description: string | null;
  rewards_detail: string | null;
  percentage: number;
  position: number;
};

export type EscarmoucheChapter = {
  id: string;
  escarmouche_id: string;
  title: string;
  game_text: string | null;
  terrain_limits: string | null;
  duration: string | null;
  start_time: string | null;
  healing_mode: string[] | null;
  healing_mode_details: string | null;
  map_url: string | null;
  special_rules: string | null;
  special_elements: string | null;
  monsters_war_machines: string | null;
  position: number;
  created_at: string;
  battlefields: Battlefield[];
  objectives: ChapterObjective[];
};

export type EscarmoucheChapterWithEscarmouche = EscarmoucheChapter & {
  escarmouche_name: string;
};

export type EscarmoucheChapterInput = {
  escarmouche_id: string;
  title: string;
  game_text: string | null;
  terrain_limits: string | null;
  duration: string | null;
  start_time: string | null;
  healing_mode: string[] | null;
  healing_mode_details: string | null;
  map_url: string | null;
  special_rules: string | null;
  special_elements: string | null;
  monsters_war_machines: string | null;
  position: number;
  battlefield_ids: string[];
  objective_inputs: ChapterObjectiveInput[];
};

type RawChapterBattlefield = {
  battlefields: Battlefield | Battlefield[] | null;
};

function normalizeBattlefields(
  links: RawChapterBattlefield[] | null,
): Battlefield[] {
  return (links ?? [])
    .map((link) =>
      Array.isArray(link.battlefields)
        ? (link.battlefields[0] ?? null)
        : link.battlefields,
    )
    .filter((b): b is Battlefield => Boolean(b));
}

function normalizeObjectives(
  objectives: ChapterObjective[] | null,
): ChapterObjective[] {
  return [...(objectives ?? [])].sort((a, b) => a.position - b.position);
}

const CHAPTER_SELECT =
  "*, escarmouche_chapter_battlefields(battlefields(id, name)), escarmouche_chapter_objectives(id, description, rewards_detail, percentage, position)";

export async function listEscarmoucheChapters(
  escarmoucheId: string,
): Promise<EscarmoucheChapter[]> {
  const { data, error } = await supabase
    .from("escarmouche_chapters")
    .select(CHAPTER_SELECT)
    .eq("escarmouche_id", escarmoucheId)
    .order("position", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    battlefields: normalizeBattlefields(row.escarmouche_chapter_battlefields),
    objectives: normalizeObjectives(row.escarmouche_chapter_objectives),
  }));
}

export async function listAllEscarmoucheChapters(): Promise<
  EscarmoucheChapterWithEscarmouche[]
> {
  const { data, error } = await supabase
    .from("escarmouche_chapters")
    .select(`${CHAPTER_SELECT}, escarmouches(name)`)
    .order("title", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => {
    const escarmouches = row.escarmouches as
      | { name: string }
      | { name: string }[]
      | null;
    const escarmouche_name = Array.isArray(escarmouches)
      ? (escarmouches[0]?.name ?? "")
      : (escarmouches?.name ?? "");
    return {
      ...row,
      escarmouche_name,
      battlefields: normalizeBattlefields(row.escarmouche_chapter_battlefields),
      objectives: normalizeObjectives(row.escarmouche_chapter_objectives),
    };
  });
}

async function linkBattlefields(
  chapterId: string,
  battlefieldIds: string[],
): Promise<void> {
  if (battlefieldIds.length === 0) return;
  const { error } = await supabase
    .from("escarmouche_chapter_battlefields")
    .insert(
      battlefieldIds.map((battlefield_id) => ({
        chapter_id: chapterId,
        battlefield_id,
      })),
    );
  if (error) throw error;
}

async function saveObjectives(
  chapterId: string,
  objectives: ChapterObjectiveInput[],
): Promise<void> {
  if (objectives.length === 0) return;
  const { error } = await supabase.from("escarmouche_chapter_objectives").insert(
    objectives.map((o) => ({
      chapter_id: chapterId,
      description: o.description,
      rewards_detail: o.rewards_detail,
      percentage: o.percentage,
      position: o.position,
    })),
  );
  if (error) throw error;
}

export async function createEscarmoucheChapter(
  input: EscarmoucheChapterInput,
): Promise<string> {
  const { battlefield_ids, objective_inputs, ...rest } = input;
  const { data, error } = await supabase
    .from("escarmouche_chapters")
    .insert(rest)
    .select("id")
    .single();
  if (error) throw error;

  await linkBattlefields(data.id, battlefield_ids);
  await saveObjectives(data.id, objective_inputs);
  return data.id;
}

export async function updateEscarmoucheChapter(
  id: string,
  input: EscarmoucheChapterInput,
): Promise<void> {
  const { battlefield_ids, objective_inputs, ...rest } = input;
  const { error } = await supabase
    .from("escarmouche_chapters")
    .update(rest)
    .eq("id", id);
  if (error) throw error;

  const { error: deleteLinksError } = await supabase
    .from("escarmouche_chapter_battlefields")
    .delete()
    .eq("chapter_id", id);
  if (deleteLinksError) throw deleteLinksError;

  const { error: deleteObjectivesError } = await supabase
    .from("escarmouche_chapter_objectives")
    .delete()
    .eq("chapter_id", id);
  if (deleteObjectivesError) throw deleteObjectivesError;

  await linkBattlefields(id, battlefield_ids);
  await saveObjectives(id, objective_inputs);
}

export async function deleteEscarmoucheChapter(id: string): Promise<void> {
  const { error } = await supabase
    .from("escarmouche_chapters")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function updateChapterPositions(
  updates: { id: string; position: number }[],
): Promise<void> {
  await Promise.all(
    updates.map(async ({ id, position }) => {
      const { error } = await supabase
        .from("escarmouche_chapters")
        .update({ position })
        .eq("id", id);
      if (error) throw error;
    }),
  );
}
