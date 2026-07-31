import { supabase } from "@/lib/supabase";

export const ACTIVITY_CATEGORIES = [
  "Campagne militaire",
  "Campagne d'aventure",
  "Scénario spécial",
  "Escarmouche",
  "Grande Bataille",
] as const;

export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

export const ACTIVITY_CATEGORY_STYLES: Record<ActivityCategory, string> = {
  "Campagne militaire":
    "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  "Campagne d'aventure":
    "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  "Scénario spécial":
    "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  Escarmouche:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  "Grande Bataille":
    "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

export type ActivityDetails = {
  registration_participants_pricing: string | null;
  registration_participants_howto: string | null;
  registration_non_participants_pricing: string | null;
  registration_non_participants_howto: string | null;
  schedule_intro: string | null;
  schedule_outro: string | null;
  game_security: string | null;
  game_staff: string | null;
  game_rewards: string | null;
  game_rules: string | null;
  game_death_healing: string | null;
  game_varia: string | null;
  contact_info: string | null;
};

export type ActivityStaffing = {
  non_participants_enabled: boolean;
  non_participants_max: number | null;
  marshal_count: number | null;
  healer_count: number | null;
  campaign_team_count: number | null;
  reception_count: number | null;
  weapon_master_count: number | null;
  radio_count: number | null;
};

export type ActivityVariables = {
  bonus_participants: string | null;
  bonus2_participants: string | null;
};

export type ActivityGameText = {
  game_text: string | null;
};

export type Activity = {
  id: string;
  name: string;
  date: string;
  category: ActivityCategory;
  number_of_fronts: number;
  participants_per_front: number;
  created_at: string;
} & ActivityDetails &
  ActivityStaffing &
  ActivityVariables &
  ActivityGameText;

export type ActivityInput = {
  name: string;
  date: string;
  category: ActivityCategory;
  number_of_fronts: number;
  participants_per_front: number;
} & ActivityStaffing;

export async function updateActivityDetails(
  activityId: string,
  details: ActivityDetails,
): Promise<void> {
  const { error } = await supabase
    .from("activities")
    .update(details)
    .eq("id", activityId);
  if (error) throw error;
}

export async function updateActivityVariables(
  activityId: string,
  variables: ActivityVariables,
): Promise<void> {
  const { error } = await supabase
    .from("activities")
    .update(variables)
    .eq("id", activityId);
  if (error) throw error;
}

export async function updateActivityGameText(
  activityId: string,
  gameText: ActivityGameText,
): Promise<void> {
  const { error } = await supabase
    .from("activities")
    .update(gameText)
    .eq("id", activityId);
  if (error) throw error;
}

export async function getActivityDetailTemplate(): Promise<ActivityDetails> {
  const { data, error } = await supabase
    .from("activity_detail_templates")
    .select("*")
    .eq("id", "default")
    .single();
  if (error) throw error;
  return data;
}

export async function saveActivityDetailTemplate(
  details: ActivityDetails,
): Promise<void> {
  const { error } = await supabase
    .from("activity_detail_templates")
    .update(details)
    .eq("id", "default");
  if (error) throw error;
}
