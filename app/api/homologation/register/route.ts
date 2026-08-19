import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  let body: { slot_id?: unknown; character_name?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const slotId = typeof body.slot_id === "string" ? body.slot_id : null;
  const characterName =
    typeof body.character_name === "string"
      ? body.character_name.trim().slice(0, 100)
      : "";

  if (!slotId || !characterName) {
    return NextResponse.json(
      { error: "Clé ou nom de personnage manquant." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  const { data: slot, error: slotError } = await admin
    .from("homologation_schedule_slots")
    .select("id, capacity")
    .eq("id", slotId)
    .maybeSingle();

  if (slotError || !slot) {
    return NextResponse.json(
      { error: "Créneau introuvable." },
      { status: 404 },
    );
  }

  const { count, error: countError } = await admin
    .from("homologation_registrations")
    .select("id", { count: "exact", head: true })
    .eq("slot_id", slotId);

  if (countError) {
    return NextResponse.json(
      { error: "Échec de la vérification des places." },
      { status: 500 },
    );
  }

  if ((count ?? 0) >= slot.capacity) {
    return NextResponse.json({ error: "Ce créneau est complet." }, { status: 409 });
  }

  const { error: insertError } = await admin
    .from("homologation_registrations")
    .insert({ slot_id: slotId, character_name: characterName });

  if (insertError) {
    return NextResponse.json(
      { error: "Échec de l'inscription." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
