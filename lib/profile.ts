import { supabase } from "@/lib/supabase";

export type Role = "admin" | "user";

export type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: Role;
  dashboard_order: string[] | null;
  sidebar_order: string[] | null;
};

export async function getOwnProfile(): Promise<Profile | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, role, dashboard_order, sidebar_order")
    .eq("id", userData.user.id)
    .single();

  if (error) return null;
  return data;
}
