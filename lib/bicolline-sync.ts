import "server-only";
import { createAdminClient } from "@/lib/supabase-admin";

const BASE_URL = "https://bicolline.online";
const MAX_PAGES = 50;

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

type ScrapedGuild = {
  external_id: number;
  name: string;
  member_count: number | null;
  presence_count: number | null;
  is_faction: boolean;
};

const ROW_PATTERN =
  /<tr><th class="field-name"><a href="\/admin\/Bicolline\/guild\/(\d+)\/change\/[^"]*">([^<]+)<\/a><\/th>[\s\S]*?<td class="field-member_count">(\d*)<\/td><td class="field-presence_count">(\d*)<\/td><td class="field-is_faction"><img[^>]*alt="(True|False)"/g;

function parseGuildsFromHtml(html: string): ScrapedGuild[] {
  const guilds: ScrapedGuild[] = [];
  for (const match of html.matchAll(ROW_PATTERN)) {
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

async function fetchAllGuilds(jar: CookieJar): Promise<ScrapedGuild[]> {
  const all: ScrapedGuild[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetch(`${BASE_URL}/admin/Bicolline/guild/?p=${page}`, {
      headers: { cookie: cookieHeader(jar) },
    });
    if (!res.ok) break;
    const html = await res.text();
    const pageGuilds = parseGuildsFromHtml(html);
    if (pageGuilds.length === 0) break;
    all.push(...pageGuilds);
  }

  return all;
}

export async function syncGuilds(): Promise<{ synced: number }> {
  const email = process.env.BICOLLINE_ADMIN_EMAIL;
  const password = process.env.BICOLLINE_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "BICOLLINE_ADMIN_EMAIL / BICOLLINE_ADMIN_PASSWORD ne sont pas configurés.",
    );
  }

  const jar = await loginToBicollineAdmin(email, password);
  const scraped = await fetchAllGuilds(jar);
  if (scraped.length === 0) {
    throw new Error(
      "Aucune guilde trouvée — la structure de la page a peut-être changé.",
    );
  }

  const byExternalId = new Map(scraped.map((g) => [g.external_id, g]));
  const guilds = [...byExternalId.values()];

  const admin = createAdminClient();
  const { error } = await admin.from("guilds").upsert(
    guilds.map((g) => ({ ...g, synced_at: new Date().toISOString() })),
    { onConflict: "external_id" },
  );
  if (error) throw error;

  return { synced: guilds.length };
}
