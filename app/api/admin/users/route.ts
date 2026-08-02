import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";

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
  const { email, password, firstName, lastName } = body as {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
  };

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email et mot de passe requis." },
      { status: 400 },
    );
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
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
    .update({ first_name: firstName ?? null, last_name: lastName ?? null })
    .eq("id", data.user.id);

  return NextResponse.json({
    user: { id: data.user.id, email: data.user.email },
  });
}
