import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

const MACHINE_TYPES = ["Canon", "Baliste"];

export async function POST(request: Request) {
  let body: {
    name?: unknown;
    machine_type?: unknown;
    owner?: unknown;
    description?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 200) : "";
  const machineType =
    typeof body.machine_type === "string" &&
    MACHINE_TYPES.includes(body.machine_type)
      ? body.machine_type
      : null;
  const owner =
    typeof body.owner === "string" ? body.owner.trim().slice(0, 200) : "";
  const description =
    typeof body.description === "string"
      ? body.description.trim().slice(0, 2000) || null
      : null;

  if (!name || !machineType || !owner) {
    return NextResponse.json(
      { error: "Nom, type et propriétaire sont requis." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.from("war_machines").insert({
    name,
    machine_type: machineType,
    owner,
    description,
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
