import { NextResponse } from "next/server";
import { syncCharacters } from "@/lib/bicolline-characters-sync";
import { requireAdmin } from "@/lib/require-admin";

export const maxDuration = 300;

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    const result = await syncCharacters();
    return NextResponse.json({ status: "ok", ...result });
  } catch (err) {
    console.error("sync-characters failed:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Échec de la synchronisation.",
      },
      { status: 500 },
    );
  }
}
