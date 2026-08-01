import type { ActivityChapter } from "@/lib/activity-chapters";
import { supabase } from "@/lib/supabase";

export type DocumentBlockType =
  | "game_text"
  | "details_registration"
  | "details_schedule"
  | "details_game_elements"
  | "details_contact"
  | "chapter"
  | "custom_text";

export type DocumentBlock = {
  id: string;
  block_type: DocumentBlockType;
  chapter_id: string | null;
  label: string | null;
  content: string | null;
  position: number;
};

export const DOCUMENT_BLOCK_LABELS: Record<
  Exclude<DocumentBlockType, "chapter" | "custom_text">,
  string
> = {
  game_text: "Texte jeu",
  details_registration: "Inscription",
  details_schedule: "Horaire",
  details_game_elements: "Éléments jeux",
  details_contact: "Nous joindre",
};

export type StandardDocumentBlockType = Exclude<
  DocumentBlockType,
  "chapter" | "custom_text"
>;

export const STANDARD_BLOCK_ORDER: StandardDocumentBlockType[] = [
  "game_text",
  "details_registration",
  "details_schedule",
  "details_game_elements",
  "details_contact",
];

export async function listDocumentBlocks(
  activityId: string,
): Promise<DocumentBlock[]> {
  const { data, error } = await supabase
    .from("activity_document_blocks")
    .select("*")
    .eq("activity_id", activityId)
    .order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function saveDocumentBlocks(
  activityId: string,
  blocks: DocumentBlock[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("activity_document_blocks")
    .delete()
    .eq("activity_id", activityId);
  if (deleteError) throw deleteError;

  if (blocks.length === 0) return;

  const { error } = await supabase.from("activity_document_blocks").insert(
    blocks.map((block, index) => ({
      id: block.id,
      activity_id: activityId,
      block_type: block.block_type,
      chapter_id: block.chapter_id,
      label: block.label,
      content: block.content,
      position: index,
    })),
  );
  if (error) throw error;
}

export function buildDefaultBlocks(
  chapters: ActivityChapter[],
): DocumentBlock[] {
  const standardBlocks: DocumentBlock[] = STANDARD_BLOCK_ORDER.map(
    (block_type, index) => ({
      id: crypto.randomUUID(),
      block_type,
      chapter_id: null,
      label: null,
      content: null,
      position: index,
    }),
  );

  const chapterBlocks: DocumentBlock[] = chapters.map((chapter, index) => ({
    id: crypto.randomUUID(),
    block_type: "chapter",
    chapter_id: chapter.id,
    label: null,
    content: null,
    position: standardBlocks.length + index,
  }));

  return [...standardBlocks, ...chapterBlocks];
}
