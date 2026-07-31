import { NextResponse } from "next/server";
import { syncGuilds } from "@/lib/bicolline-sync";
import { requireAdmin } from "@/lib/require-admin";

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  try {
    const result = await syncGuilds({ force: true });
    return NextResponse.json({ status: "ok", ...result });
  } catch (err) {
    console.error("manual sync-guilds failed:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Échec de la synchronisation.",
      },
      { status: 500 },
    );
  }
}
