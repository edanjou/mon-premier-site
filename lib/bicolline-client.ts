import "server-only";

export const BICOLLINE_BASE_URL = "https://bicolline.online";

export type CookieJar = Map<string, string>;

export function cookieHeader(jar: CookieJar): string {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

export function storeCookies(jar: CookieJar, res: Response) {
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

export async function loginToBicollineAdmin(
  email: string,
  password: string,
): Promise<CookieJar> {
  const jar: CookieJar = new Map();

  const loginPageRes = await fetch(`${BICOLLINE_BASE_URL}/admin/login/`, {
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

  const loginRes = await fetch(`${BICOLLINE_BASE_URL}/admin/login/`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      referer: `${BICOLLINE_BASE_URL}/admin/login/`,
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

export async function fetchAllPages<T>(
  jar: CookieJar,
  path: string,
  parse: (html: string) => T[],
  maxPages = 50,
): Promise<T[]> {
  const all: T[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const res = await fetch(`${BICOLLINE_BASE_URL}${path}?p=${page}`, {
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

export function dedupeByExternalId<T extends { external_id: number }>(
  items: T[],
): T[] {
  return [...new Map(items.map((item) => [item.external_id, item])).values()];
}

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#x27;": "'",
  "&#39;": "'",
  "&#x2F;": "/",
};

export function decodeHtmlEntities(text: string): string {
  return text.replace(
    /&(?:amp|lt|gt|quot|#x27|#39|#x2F);/g,
    (entity) => HTML_ENTITIES[entity] ?? entity,
  );
}
