import "server-only";
import {
  BICOLLINE_BASE_URL,
  cookieHeader,
  decodeHtmlEntities,
  loginToBicollineAdmin,
  type CookieJar,
} from "@/lib/bicolline-client";
import { createAdminClient } from "@/lib/supabase-admin";

const CHARACTER_CURSOR_KEY = "character_sync_cursor";
const CHARACTER_LAST_SYNCED_KEY = "character_sync_last_synced_at";
const TIME_BUDGET_MS = 250_000;
const PAGE_SIZE = 20;

type ScrapedCharacter = {
  external_id: number;
  name: string;
  guild_id: number | null;
  religion_name: string | null;
  is_npc: boolean;
  player_name: string | null;
  player_email: string | null;
};

const CHARACTER_ROW_PATTERN =
  /<tr><th class="field-name"><a href="\/admin\/Bicolline\/character\/(\d+)\/change\/[^"]*">([^<]*)<\/a><\/th>([\s\S]*?)<\/tr>/g;

function parseUserCell(text: string): {
  playerName: string | null;
  playerEmail: string | null;
} {
  const decoded = decodeHtmlEntities(text);
  const match = decoded.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  if (!match) return { playerName: decoded.trim() || null, playerEmail: null };
  return {
    playerName: match[1].trim() || null,
    playerEmail: match[2].trim() || null,
  };
}

function parseCharactersFromHtml(html: string): ScrapedCharacter[] {
  const characters: ScrapedCharacter[] = [];

  for (const match of html.matchAll(CHARACTER_ROW_PATTERN)) {
    const rest = match[3];

    const userMatch = rest.match(
      /field-user_link">(?:<a[^>]*>([^<]*)<\/a>|([^<]*))<\/td>/,
    );
    const guildMatch = rest.match(
      /field-guild_link"><a href="\/admin\/Bicolline\/guild\/(\d+)\/change\//,
    );
    const religionMatch = rest.match(
      /field-religion_link">(?:<a[^>]*>([^<]*)<\/a>|([^<]*))<\/td>/,
    );
    const npcMatch = rest.match(/field-is_npc"><img[^>]*alt="(True|False)"/);

    const { playerName, playerEmail } = parseUserCell(
      userMatch?.[1] ?? userMatch?.[2] ?? "",
    );

    characters.push({
      external_id: parseInt(match[1], 10),
      name: decodeHtmlEntities(match[2].trim()),
      guild_id: guildMatch ? parseInt(guildMatch[1], 10) : null,
      religion_name:
        decodeHtmlEntities(
          (religionMatch?.[1] ?? religionMatch?.[2] ?? "").trim(),
        ) || null,
      is_npc: npcMatch?.[1] === "True",
      player_name: playerName,
      player_email: playerEmail,
    });
  }

  return characters;
}

function extractTotalPages(html: string): number | null {
  const match = html.match(/(\d+)\s+[A-ZÀ-ÜÉ][^<]*<\/p>/);
  if (!match) return null;
  return Math.ceil(parseInt(match[1], 10) / PAGE_SIZE);
}

export async function syncCharacters(): Promise<{
  done: boolean;
  pagesProcessed: number;
  charactersSynced: number;
}> {
  const email = process.env.BICOLLINE_ADMIN_EMAIL;
  const password = process.env.BICOLLINE_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "BICOLLINE_ADMIN_EMAIL / BICOLLINE_ADMIN_PASSWORD ne sont pas configurés.",
    );
  }

  const admin = createAdminClient();
  const startedAt = Date.now();

  const { data: cursorRow } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", CHARACTER_CURSOR_KEY)
    .maybeSingle();
  let page = cursorRow ? parseInt(cursorRow.value, 10) + 1 : 1;

  const jar: CookieJar = await loginToBicollineAdmin(email, password);

  let pagesProcessed = 0;
  let charactersSynced = 0;
  let done = false;
  let totalPages: number | null = null;

  while (Date.now() - startedAt < TIME_BUDGET_MS) {
    if (totalPages !== null && page > totalPages) {
      done = true;
      break;
    }

    const res = await fetch(
      `${BICOLLINE_BASE_URL}/admin/Bicolline/character/?p=${page}`,
      { headers: { cookie: cookieHeader(jar) } },
    );
    if (!res.ok) break;
    const html = await res.text();

    if (totalPages === null) {
      totalPages = extractTotalPages(html);
    }

    const pageCharacters = parseCharactersFromHtml(html);
    if (pageCharacters.length === 0) {
      done = true;
      break;
    }

    const { error } = await admin.from("characters").upsert(
      pageCharacters.map((c) => ({
        ...c,
        synced_at: new Date().toISOString(),
      })),
      { onConflict: "external_id" },
    );
    if (error) throw error;

    charactersSynced += pageCharacters.length;
    pagesProcessed += 1;

    await admin.from("app_settings").upsert({
      key: CHARACTER_CURSOR_KEY,
      value: String(page),
      updated_at: new Date().toISOString(),
    });

    page += 1;
  }

  if (done) {
    await admin.from("app_settings").upsert([
      {
        key: CHARACTER_CURSOR_KEY,
        value: "0",
        updated_at: new Date().toISOString(),
      },
      {
        key: CHARACTER_LAST_SYNCED_KEY,
        value: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
  }

  return { done, pagesProcessed, charactersSynced };
}
