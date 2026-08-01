import type { Activity } from "@/lib/activities";

export const TEMPLATE_TOKENS = [
  "NOMBREMAXFRONT",
  "NOMBREMAXNONPARTICIPANTS",
  "REPASDINER",
  "REPASSOUPER",
  "DATELIMITEREPAS",
  "DATELIMITEINSCRIPTION",
  "BONUSPARTICIPANTS",
  "BONUS2PARTICIPANTS",
] as const;

export type TemplateToken = (typeof TEMPLATE_TOKENS)[number];

function formatDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Retourne le jour de semaine (0 = dimanche ... 6 = samedi) précédant
// strictement dateStr, jamais le même jour.
function precedingWeekday(dateStr: string, targetDay: number): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const diff = (date.getDay() - targetDay + 7) % 7 || 7;
  date.setDate(date.getDate() - diff);
  return date;
}

export function buildTemplateVariables(
  activity: Pick<
    Activity,
    | "date"
    | "participants_per_front"
    | "non_participants_max"
    | "meal_lunch_price"
    | "meal_dinner_price"
    | "bonus_participants"
    | "bonus2_participants"
  >,
): Record<TemplateToken, string> {
  return {
    NOMBREMAXFRONT: String(activity.participants_per_front ?? ""),
    NOMBREMAXNONPARTICIPANTS:
      activity.non_participants_max != null
        ? String(activity.non_participants_max)
        : "",
    REPASDINER: activity.meal_lunch_price ?? "",
    REPASSOUPER: activity.meal_dinner_price ?? "",
    DATELIMITEREPAS: activity.date
      ? formatDate(precedingWeekday(activity.date, 1))
      : "",
    DATELIMITEINSCRIPTION: activity.date
      ? `${formatDate(precedingWeekday(activity.date, 5))} à 17h00`
      : "",
    BONUSPARTICIPANTS: activity.bonus_participants ?? "",
    BONUS2PARTICIPANTS: activity.bonus2_participants ?? "",
  };
}

export function applyTemplateVariables(
  html: string,
  variables: Record<TemplateToken, string>,
): string {
  return html.replace(/\[([A-Z0-9]+)\]/g, (match, token: string) =>
    token in variables ? variables[token as TemplateToken] || match : match,
  );
}
