import "server-only";
import { createAdminClient } from "@/lib/supabase-admin";

const BASE_URL = "https://bicolline.online";
const MAX_PAGES = 50;

const GUILD_SYNC_FREQUENCY_KEY = "guild_sync_frequency";
const GUILD_LAST_SYNCED_KEY = "guild_last_synced_at";

const FREQUENCY_INTERVAL_MS: Record<string, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  biweekly: 14 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
};

type CookieJar = Map<string, string>;

function cookieHeader(jar: CookieJar): string {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

function storeCookies(jar: CookieJar, res: Response) {
  for (const raw of res.headers.getSetCookie()) {
    const [pair] = raw.split(";");
    const separatorIndex = pair.indexOf("=");
    if (separatorIndex === -1) continue;
    jar.set(
      pair.slice(0, separatorIndex).trim(),
      pair.slice(separatorIndex + 1).trim(),
    );
  }
}

async function loginToBicollineAdmin(
  email: string,
  password: string,
): Promise<CookieJar> {
  const jar: CookieJar = new Map();

  const loginPageRes = await fetch(`${BASE_URL}/admin/login/`, {
    headers: { cookie: cookieHeader(jar) },
  });
  storeCookies(jar, loginPageRes);
  const loginPageHtml = await loginPageRes.text();

  const csrfMatch = loginPageHtml.match(
    /name="csrfmiddlewaretoken" value="([^"]+)"/,
  );
  if (!csrfMatch) {
    throw new Error(
      "Impossible de trouver le jeton CSRF sur la page de connexion.",
    );
  }

  const body = new URLSearchParams({
    csrfmiddlewaretoken: csrfMatch[1],
    username: email,
    password,
    next: "/admin/",
  });

  const loginRes = await fetch(`${BASE_URL}/admin/login/`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      referer: `${BASE_URL}/admin/login/`,
      cookie: cookieHeader(jar),
    },
    body: body.toString(),
  });
  storeCookies(jar, loginRes);

  if (loginRes.status !== 302) {
    throw new Error(
      `Échec de la connexion à l'admin Bicolline (statut ${loginRes.status}).`,
    );
  }

  return jar;
}

async function fetchAllPages<T>(
  jar: CookieJar,
  path: string,
  parse: (html: string) => T[],
): Promise<T[]> {
  const all: T[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetch(`${BASE_URL}${path}?p=${page}`, {
      headers: { cookie: cookieHeader(jar) },
    });
    if (!res.ok) break;
    const html = await res.text();
    const pageItems = parse(html);
    if (pageItems.length === 0) break;
    all.push(...pageItems);
  }

  return all;
}

type ScrapedGuild = {
  external_id: number;
  name: string;
  member_count: number | null;
  presence_count: number | null;
  is_faction: boolean;
};

const GUILD_ROW_PATTERN =
  /<tr><th class="field-name"><a href="\/admin\/Bicolline\/guild\/(\d+)\/change\/[^"]*">([^<]+)<\/a><\/th>[\s\S]*?<td class="field-member_count">(\d*)<\/td><td class="field-presence_count">(\d*)<\/td><td class="field-is_faction"><img[^>]*alt="(True|False)"/g;

function parseGuildsFromHtml(html: string): ScrapedGuild[] {
  const guilds: ScrapedGuild[] = [];
  for (const match of html.matchAll(GUILD_ROW_PATTERN)) {
    guilds.push({
      external_id: parseInt(match[1], 10),
      name: match[2],
      member_count: match[3] ? parseInt(match[3], 10) : null,
      presence_count: match[4] ? parseInt(match[4], 10) : null,
      is_faction: match[5] === "True",
    });
  }
  return guilds;
}

type ScrapedGuildSeal = {
  external_id: number;
  guildName: string;
  seal_type: string;
  status: string;
};

const GUILD_SEAL_ROW_PATTERN =
  /<tr><th class="field-name"><a href="\/admin\/Bicolline\/guildseal\/(\d+)\/change\/[^"]*">[^<]*<\/a><\/th><td class="field-guild nowrap">([^<]+)<\/td><td class="field-seal nowrap">([^<]+)<\/td><td class="field-status nowrap">([^<]+)<\/td><\/tr>/g;

function parseGuildSealsFromHtml(html: string): ScrapedGuildSeal[] {
  const seals: ScrapedGuildSeal[] = [];
  for (const match of html.matchAll(GUILD_SEAL_ROW_PATTERN)) {
    seals.push({
      external_id: parseInt(match[1], 10),
      guildName: match[2],
      seal_type: match[3],
      status: match[4],
    });
  }
  return seals;
}

function dedupeByExternalId<T extends { external_id: number }>(
  items: T[],
): T[] {
  return [...new Map(items.map((item) => [item.external_id, item])).values()];
}

export async function syncGuilds(options?: { force?: boolean }): Promise<{
  skipped: boolean;
  guildsSynced: number;
  sealsSynced: number;
  sealsSkipped: number;
}> {
  const email = process.env.BICOLLINE_ADMIN_EMAIL;
  const password = process.env.BICOLLINE_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "BICOLLINE_ADMIN_EMAIL / BICOLLINE_ADMIN_PASSWORD ne sont pas configurés.",
    );
  }

  const admin = createAdminClient();

  if (!options?.force) {
    const { data: settingsRows } = await admin
      .from("app_settings")
      .select("key, value")
      .in("key", [GUILD_SYNC_FREQUENCY_KEY, GUILD_LAST_SYNCED_KEY]);

    const frequency =
      settingsRows?.find((r) => r.key === GUILD_SYNC_FREQUENCY_KEY)?.value ??
      "weekly";
    const lastSyncedAt = settingsRows?.find(
      (r) => r.key === GUILD_LAST_SYNCED_KEY,
    )?.value;
    const intervalMs =
      FREQUENCY_INTERVAL_MS[frequency] ?? FREQUENCY_INTERVAL_MS.weekly;

    if (lastSyncedAt) {
      const elapsed = Date.now() - new Date(lastSyncedAt).getTime();
      if (elapsed < intervalMs) {
        return {
          skipped: true,
          guildsSynced: 0,
          sealsSynced: 0,
          sealsSkipped: 0,
        };
      }
    }
  }

  const jar = await loginToBicollineAdmin(email, password);

  const scrapedGuilds = await fetchAllPages(
    jar,
    "/admin/Bicolline/guild/",
    parseGuildsFromHtml,
  );
  if (scrapedGuilds.length === 0) {
    throw new Error(
      "Aucune guilde trouvée — la structure de la page a peut-être changé.",
    );
  }
  const guilds = dedupeByExternalId(scrapedGuilds);

  const { error: guildsError } = await admin.from("guilds").upsert(
    guilds.map((g) => ({ ...g, synced_at: new Date().toISOString() })),
    { onConflict: "external_id" },
  );
  if (guildsError) throw guildsError;

  const guildIdByName = new Map(guilds.map((g) => [g.name, g.external_id]));

  const scrapedSeals = await fetchAllPages(
    jar,
    "/admin/Bicolline/guildseal/",
    parseGuildSealsFromHtml,
  );
  const seals = dedupeByExternalId(scrapedSeals);

  const sealRows: {
    external_id: number;
    guild_id: number;
    seal_type: string;
    status: string;
    synced_at: string;
  }[] = [];
  let sealsSkipped = 0;

  for (const seal of seals) {
    const guildId = guildIdByName.get(seal.guildName);
    if (guildId === undefined) {
      sealsSkipped += 1;
      continue;
    }
    sealRows.push({
      external_id: seal.external_id,
      guild_id: guildId,
      seal_type: seal.seal_type,
      status: seal.status,
      synced_at: new Date().toISOString(),
    });
  }

  if (sealRows.length > 0) {
    const { error: sealsError } = await admin
      .from("guild_seals")
      .upsert(sealRows, { onConflict: "external_id" });
    if (sealsError) throw sealsError;
  }

  await admin.from("app_settings").upsert({
    key: GUILD_LAST_SYNCED_KEY,
    value: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  return {
    skipped: false,
    guildsSynced: guilds.length,
    sealsSynced: sealRows.length,
    sealsSkipped,
  };
}
