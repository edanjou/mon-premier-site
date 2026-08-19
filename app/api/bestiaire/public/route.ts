import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET() {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("bestiary_creatures")
    .select("id, name, description, danger_level, special_rules")
    .eq("status", "approuve")
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Impossible de charger le bestiaire." },
      { status: 500 },
    );
  }

  return NextResponse.json({ creatures: data ?? [] });
}
