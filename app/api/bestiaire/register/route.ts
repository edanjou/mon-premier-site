import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

const DANGER_LEVELS = ["Faible", "Modéré", "Élevé", "Mortel"];

export async function POST(request: Request) {
  let body: {
    name?: unknown;
    description?: unknown;
    danger_level?: unknown;
    special_rules?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 200) : "";
  const description =
    typeof body.description === "string"
      ? body.description.trim().slice(0, 2000) || null
      : null;
  const dangerLevel =
    typeof body.danger_level === "string" &&
    DANGER_LEVELS.includes(body.danger_level)
      ? body.danger_level
      : null;
  const specialRules =
    typeof body.special_rules === "string"
      ? body.special_rules.trim().slice(0, 2000) || null
      : null;

  if (!name || !dangerLevel) {
    return NextResponse.json(
      { error: "Nom et niveau de danger sont requis." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.from("bestiary_creatures").insert({
    name,
    description,
    danger_level: dangerLevel,
    special_rules: specialRules,
    notes: null,
    status: "en_attente",
  });

  if (error) {
    return NextResponse.json(
      { error: "Échec de l'enregistrement." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
