import { NextResponse } from "next/server";
import { syncGuilds } from "@/lib/bicolline-sync";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 401 });
  }

  try {
    const result = await syncGuilds();
    return NextResponse.json({ status: "ok", ...result });
  } catch (err) {
    console.error("sync-guilds failed:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Échec de la synchronisation.",
      },
      { status: 500 },
    );
  }
}
