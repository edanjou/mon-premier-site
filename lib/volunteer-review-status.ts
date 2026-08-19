import { supabase } from "@/lib/supabase";

export type VolunteerStatus = "Fait" | "Erratum" | "À modifier";

export const VOLUNTEER_STATUSES: VolunteerStatus[] = [
  "Fait",
  "Erratum",
  "À modifier",
];

export type EarlyArrival = "Vendredi" | "Samedi";

export const EARLY_ARRIVALS: EarlyArrival[] = ["Vendredi", "Samedi"];

export type VolunteerReviewStatus = {
  character_id: number;
  status: VolunteerStatus | null;
  notes: string | null;
  early_arrival: EarlyArrival | null;
};

const REVIEW_STATUS_SELECT = "character_id, status, notes, early_arrival";

export async function listVolunteerReviewStatuses(): Promise<
  VolunteerReviewStatus[]
> {
  const { data, error } = await supabase
    .from("volunteer_review_status")
    .select(REVIEW_STATUS_SELECT);
  if (error) throw error;
  return data ?? [];
}

export type VolunteerReviewStatusInput = {
  status: VolunteerStatus | null;
  notes: string | null;
  early_arrival: EarlyArrival | null;
};

export async function upsertVolunteerReviewStatus(
  characterId: number,
  input: VolunteerReviewStatusInput,
): Promise<void> {
  const { error } = await supabase
    .from("volunteer_review_status")
    .upsert(
      { character_id: characterId, ...input },
      { onConflict: "character_id" },
    );
  if (error) throw error;
}
