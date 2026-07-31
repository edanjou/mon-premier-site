import "server-only";
import { createAdminClient } from "@/lib/supabase-admin";

export async function requireAdmin(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return null;

  const admin = createAdminClient();
  const { data: userData, error } = await admin.auth.getUser(token);
  if (error || !userData.user) return null;

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (profile?.role !== "admin") return null;
  return { admin, adminUserId: userData.user.id };
}
