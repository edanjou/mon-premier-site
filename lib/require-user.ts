import "server-only";
import { createAdminClient } from "@/lib/supabase-admin";

export async function requireUser(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return null;

  const admin = createAdminClient();
  const { data: userData, error } = await admin.auth.getUser(token);
  if (error || !userData.user) return null;

  return { admin, userId: userData.user.id };
}
