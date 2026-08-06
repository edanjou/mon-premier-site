import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { data, error } = await auth.admin
    .from("email_log")
    .select("id, to_email, subject, status, error, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entries: data ?? [] });
}
