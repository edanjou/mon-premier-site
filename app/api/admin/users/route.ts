import { randomInt } from "crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";

const PASSWORD_LOWER = "abcdefghijkmnopqrstuvwxyz";
const PASSWORD_UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const PASSWORD_DIGITS = "23456789";
const PASSWORD_SPECIAL = "!@#$%^&*-_=+?";
const PASSWORD_ALL =
  PASSWORD_LOWER + PASSWORD_UPPER + PASSWORD_DIGITS + PASSWORD_SPECIAL;

function pickChar(chars: string): string {
  return chars[randomInt(chars.length)];
}

// Génère un mot de passe temporaire répondant aux critères de sécurité
// (lib/features.ts n'exporte pas ces règles ; dupliqué depuis
// app/(app)/mon-compte/page.tsx car ce fichier tourne côté serveur et ce
// mot de passe n'est de toute façon jamais montré ni utilisé par
// personne — l'utilisateur définit le sien via le lien reçu par courriel.
function generateSecurePassword(length = 16): string {
  const required = [
    pickChar(PASSWORD_LOWER),
    pickChar(PASSWORD_UPPER),
    pickChar(PASSWORD_DIGITS),
    pickChar(PASSWORD_SPECIAL),
  ];
  const rest = Array.from({ length: length - required.length }, () =>
    pickChar(PASSWORD_ALL),
  );
  const combined = [...required, ...rest];
  for (let i = combined.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }
  return combined.join("");
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }
  const { admin } = auth;

  const { data: usersData, error } = await admin.auth.admin.listUsers();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, first_name, last_name, title, role");

  const { data: permissions } = await admin
    .from("permissions")
    .select("user_id, feature, granted");

  const users = usersData.users.map((u) => {
    const profile = profiles?.find((p) => p.id === u.id);
    const userPermissions =
      permissions?.filter((p) => p.user_id === u.id) ?? [];
    return {
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      first_name: profile?.first_name ?? null,
      last_name: profile?.last_name ?? null,
      title: profile?.title ?? null,
      role: profile?.role ?? "user",
      permissions: userPermissions,
    };
  });

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }
  const { admin } = auth;

  const body = await request.json();
  const { email, firstName, lastName } = body as {
    email?: string;
    firstName?: string;
    lastName?: string;
  };

  if (!email) {
    return NextResponse.json({ error: "Email requis." }, { status: 400 });
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: generateSecurePassword(),
    email_confirm: true,
  });

  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message ?? "Échec de la création." },
      { status: 400 },
    );
  }

  await admin
    .from("profiles")
    .update({
      first_name: firstName ?? null,
      last_name: lastName ?? null,
      role: "user",
    })
    .eq("id", data.user.id);

  return NextResponse.json({
    user: { id: data.user.id, email: data.user.email },
  });
}
