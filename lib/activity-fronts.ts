import { supabase } from "@/lib/supabase";
import { decodeHtmlEntities } from "@/lib/text";

export const FRONT_COLORS = [
  "Jaune",
  "Bleu",
  "Vert",
  "Mauve",
  "Rouge",
  "Blanc",
] as const;

export type FrontColor = (typeof FRONT_COLORS)[number];

export const FRONT_COLOR_STYLES: Record<FrontColor, string> = {
  Jaune:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  Bleu: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  Vert: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  Mauve:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  Rouge: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  Blanc:
    "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border border-black/[.08] dark:border-white/[.145]",
};

export type FrontGuild = {
  external_id: number;
  name: string;
};

export type FrontOrganizer = {
  character_id: number | null;
  name: string;
  email: string | null;
};

export type FrontData = {
  guilds: FrontGuild[];
  organizers: FrontOrganizer[];
};

export type FrontAssignments = Record<FrontColor, FrontData>;

export function maxOrganizersFor(guildCount: number): number {
  return guildCount * 3;
}

function emptyAssignments(): FrontAssignments {
  return {
    Jaune: { guilds: [], organizers: [] },
    Bleu: { guilds: [], organizers: [] },
    Vert: { guilds: [], organizers: [] },
    Mauve: { guilds: [], organizers: [] },
    Rouge: { guilds: [], organizers: [] },
    Blanc: { guilds: [], organizers: [] },
  };
}

export async function getActivityFrontAssignments(
  activityId: string,
): Promise<FrontAssignments> {
  const { data, error } = await supabase
    .from("activity_fronts")
    .select(
      "color, activity_front_guilds(guilds(external_id, name)), activity_front_organizers(character_id, name, email)",
    )
    .eq("activity_id", activityId);

  if (error) throw error;

  const assignments = emptyAssignments();
  for (const front of data ?? []) {
    const color = front.color as FrontColor;
    const guilds = (front.activity_front_guilds ?? [])
      .map((fg: { guilds: FrontGuild | FrontGuild[] | null }) =>
        Array.isArray(fg.guilds) ? (fg.guilds[0] ?? null) : fg.guilds,
      )
      .filter((g: FrontGuild | null): g is FrontGuild => Boolean(g))
      .map((g: FrontGuild) => ({ ...g, name: decodeHtmlEntities(g.name) }));
    const organizers = (front.activity_front_organizers ?? []).map(
      (o: FrontOrganizer) => ({
        character_id: o.character_id,
        name: decodeHtmlEntities(o.name),
        email: o.email,
      }),
    );
    assignments[color] = { guilds, organizers };
  }
  return assignments;
}

export async function saveActivityFrontAssignments(
  activityId: string,
  assignments: FrontAssignments,
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("activity_fronts")
    .delete()
    .eq("activity_id", activityId);
  if (deleteError) throw deleteError;

  const colorsToInsert = FRONT_COLORS.filter(
    (color) =>
      assignments[color].guilds.length > 0 ||
      assignments[color].organizers.length > 0,
  );
  if (colorsToInsert.length === 0) return;

  const { data: insertedFronts, error: insertError } = await supabase
    .from("activity_fronts")
    .insert(colorsToInsert.map((color) => ({ activity_id: activityId, color })))
    .select("id, color");
  if (insertError) throw insertError;

  const guildRows = (insertedFronts ?? []).flatMap((front) =>
    assignments[front.color as FrontColor].guilds.map((guild) => ({
      front_id: front.id,
      guild_id: guild.external_id,
    })),
  );
  if (guildRows.length > 0) {
    const { error } = await supabase
      .from("activity_front_guilds")
      .insert(guildRows);
    if (error) throw error;
  }

  const organizerRows = (insertedFronts ?? []).flatMap((front) =>
    assignments[front.color as FrontColor].organizers.map((o) => ({
      front_id: front.id,
      character_id: o.character_id,
      name: o.name,
      email: o.email,
    })),
  );
  if (organizerRows.length > 0) {
    const { error } = await supabase
      .from("activity_front_organizers")
      .insert(organizerRows);
    if (error) throw error;
  }
}
