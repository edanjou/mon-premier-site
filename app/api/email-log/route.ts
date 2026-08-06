import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const body = await request.json();
  const { to, subject, status, error } = body as {
    to?: string;
    subject?: string;
    status?: "sent" | "failed";
    error?: string | null;
  };

  if (!to || !subject || !status) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error: dbError } = await admin.from("email_log").insert({
    to_email: to,
    subject,
    status,
    error: error ?? null,
  });

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ status: "ok" });
}
