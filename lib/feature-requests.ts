import { supabase } from "@/lib/supabase";

export const FEATURE_REQUEST_TYPES = [
  "Module",
  "Fonctionnalité",
  "Ajustement",
  "Autre",
] as const;

export type FeatureRequestType = (typeof FEATURE_REQUEST_TYPES)[number];

export type FeatureRequest = {
  id: string;
  user_id: string;
  type: string;
  description: string;
  done: boolean;
  created_at: string;
  requester_name: string | null;
};

type RawProfileJoin =
  | { first_name: string | null; last_name: string | null }
  | { first_name: string | null; last_name: string | null }[]
  | null;

type RawFeatureRequest = {
  id: string;
  user_id: string;
  type: string;
  description: string;
  done: boolean;
  created_at: string;
  profiles: RawProfileJoin;
};

function normalize(row: RawFeatureRequest): FeatureRequest {
  const profile = Array.isArray(row.profiles)
    ? (row.profiles[0] ?? null)
    : row.profiles;
  const name = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(" ")
    : "";
  return {
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    description: row.description,
    done: row.done,
    created_at: row.created_at,
    requester_name: name || null,
  };
}

const FEATURE_REQUEST_SELECT =
  "id, user_id, type, description, done, created_at, profiles(first_name, last_name)";

export async function listFeatureRequests(): Promise<FeatureRequest[]> {
  const { data, error } = await supabase
    .from("feature_requests")
    .select(FEATURE_REQUEST_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => normalize(row as RawFeatureRequest));
}

export async function createFeatureRequest(
  userId: string,
  type: string,
  description: string,
): Promise<void> {
  const { error } = await supabase
    .from("feature_requests")
    .insert({ user_id: userId, type, description });
  if (error) throw error;
}

export async function setFeatureRequestDone(
  id: string,
  done: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("feature_requests")
    .update({ done })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteFeatureRequest(id: string): Promise<void> {
  const { error } = await supabase
    .from("feature_requests")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
