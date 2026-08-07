import { supabase } from "@/lib/supabase";

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
  meal_lunch_price: string | null;
  meal_dinner_price: string | null;
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
  number_of_fronts: number;
  participants_per_front: number;
} & ActivityStaffing;

export type ActivitySummary = {
  id: string;
  name: string;
  date: string;
};

export async function listActivities(): Promise<ActivitySummary[]> {
  const { data, error } = await supabase
    .from("activities")
    .select("id, name, date")
    .order("date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

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
