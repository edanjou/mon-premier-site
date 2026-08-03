import "server-only";
import { isSyncDue } from "@/lib/app-settings";
import {
  BICOLLINE_BASE_URL,
  cookieHeader,
  decodeHtmlEntities,
  loginToBicollineAdmin,
  type CookieJar,
} from "@/lib/bicolline-client";
import { createAdminClient } from "@/lib/supabase-admin";

const CURSOR_KEY = "religion_member_sync_cursor";
const LAST_SYNCED_KEY = "religion_member_sync_last_synced_at";
const FREQUENCY_KEY = "religion_member_sync_frequency";
const TIME_BUDGET_MS = 250_000;
const PAGE_SIZE = 20;

type ScrapedReligionMember = {
  external_id: number;
  religion_name: string;
  character_id: number | null;
  character_name: string | null;
  cleric_name: string | null;
  is_grand_priest: boolean;
  is_priest: boolean;
};

const ROW_PATTERN =
  /<tr><th class="field-religion nowrap"><a href="\/admin\/Bicolline\/religionmember\/(\d+)\/change\/[^"]*">([^<]*)<\/a><\/th>([\s\S]*?)<\/tr>/g;

function parseReligionMembersFromHtml(html: string): ScrapedReligionMember[] {
  const rows: ScrapedReligionMember[] = [];

  for (const match of html.matchAll(ROW_PATTERN)) {
    const rest = match[3];

    const characterMatch = rest.match(
      /field-character_link">(?:<a href="\/admin\/Bicolline\/character\/(\d+)\/change\/[^"]*">([^<]*)<\/a>|([^<]*))<\/td>/,
    );
    const clericMatch = rest.match(/field-cleric nowrap">([^<]*)<\/td>/);
    const grandPriestMatch = rest.match(
      /field-grand_priest"><img[^>]*alt="(True|False)"/,
    );
    const priestMatch = rest.match(/field-priest"><img[^>]*alt="(True|False)"/);

    rows.push({
      external_id: parseInt(match[1], 10),
      religion_name: decodeHtmlEntities(match[2].trim()),
      character_id: characterMatch?.[1]
        ? parseInt(characterMatch[1], 10)
        : null,
      character_name:
        decodeHtmlEntities(
          (characterMatch?.[2] ?? characterMatch?.[3] ?? "").trim(),
        ) || null,
      cleric_name: decodeHtmlEntities((clericMatch?.[1] ?? "").trim()) || null,
      is_grand_priest: grandPriestMatch?.[1] === "True",
      is_priest: priestMatch?.[1] === "True",
    });
  }

  return rows;
}

function extractTotalPages(html: string): number | null {
  const match = html.match(/(\d+)\s+[A-ZÀ-ÜÉ][^<]*<\/p>/);
  if (!match) return null;
  return Math.ceil(parseInt(match[1], 10) / PAGE_SIZE);
}

export async function syncReligionMembers(options?: {
  force?: boolean;
}): Promise<{
  skipped: boolean;
  done: boolean;
  pagesProcessed: number;
  membersSynced: number;
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
    .eq("key", CURSOR_KEY)
    .maybeSingle();
  let page = cursorRow ? parseInt(cursorRow.value, 10) + 1 : 1;

  if (page === 1 && !options?.force) {
    const { data: settingsRows } = await admin
      .from("app_settings")
      .select("key, value")
      .in("key", [FREQUENCY_KEY, LAST_SYNCED_KEY]);
    const frequency =
      settingsRows?.find((r) => r.key === FREQUENCY_KEY)?.value ?? "weekly";
    const lastSyncedAt = settingsRows?.find(
      (r) => r.key === LAST_SYNCED_KEY,
    )?.value;
    if (!isSyncDue(lastSyncedAt, frequency)) {
      return { skipped: true, done: true, pagesProcessed: 0, membersSynced: 0 };
    }
  }

  const jar: CookieJar = await loginToBicollineAdmin(email, password);

  let pagesProcessed = 0;
  let membersSynced = 0;
  let done = false;
  let totalPages: number | null = null;

  while (Date.now() - startedAt < TIME_BUDGET_MS) {
    if (totalPages !== null && page > totalPages) {
      done = true;
      break;
    }

    const res = await fetch(
      `${BICOLLINE_BASE_URL}/admin/Bicolline/religionmember/?p=${page}`,
      { headers: { cookie: cookieHeader(jar) } },
    );
    if (!res.ok) break;
    const html = await res.text();

    if (totalPages === null) {
      totalPages = extractTotalPages(html);
    }

    const pageRows = parseReligionMembersFromHtml(html);
    if (pageRows.length === 0) {
      done = true;
      break;
    }

    const { error } = await admin.from("religion_members").upsert(
      pageRows.map((r) => ({ ...r, synced_at: new Date().toISOString() })),
      { onConflict: "external_id" },
    );
    if (error) throw error;

    membersSynced += pageRows.length;
    pagesProcessed += 1;

    await admin.from("app_settings").upsert({
      key: CURSOR_KEY,
      value: String(page),
      updated_at: new Date().toISOString(),
    });

    page += 1;
  }

  if (done) {
    await admin.from("app_settings").upsert([
      {
        key: CURSOR_KEY,
        value: "0",
        updated_at: new Date().toISOString(),
      },
      {
        key: LAST_SYNCED_KEY,
        value: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
  }

  return { skipped: false, done, pagesProcessed, membersSynced };
}
