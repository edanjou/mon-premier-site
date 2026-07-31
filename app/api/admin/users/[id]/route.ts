import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request);
  if (!auth) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }
  const { admin, adminUserId } = auth;
  const { id } = await params;

  if (id === adminUserId) {
    return NextResponse.json(
      { error: "Tu ne peux pas supprimer ton propre compte." },
      { status: 400 },
    );
  }

  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
