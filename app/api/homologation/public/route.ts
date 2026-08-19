import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET() {
  const admin = createAdminClient();

  const [quartiersRes, schedulesRes, slotsRes, registrationsRes] =
    await Promise.all([
      admin.from("quartiers").select("id, name").order("name"),
      admin
        .from("homologation_schedules")
        .select("id, name, date")
        .order("date", { ascending: true }),
      admin
        .from("homologation_schedule_slots")
        .select("id, schedule_id, quartier_id, start_time, end_time, capacity")
        .order("start_time", { ascending: true }),
      admin.from("homologation_registrations").select("slot_id"),
    ]);

  if (quartiersRes.error || schedulesRes.error || slotsRes.error || registrationsRes.error) {
    return NextResponse.json(
      { error: "Impossible de charger les créneaux." },
      { status: 500 },
    );
  }

  const countBySlot = new Map<string, number>();
  for (const r of registrationsRes.data ?? []) {
    countBySlot.set(r.slot_id, (countBySlot.get(r.slot_id) ?? 0) + 1);
  }

  const slots = (slotsRes.data ?? []).map((s) => ({
    ...s,
    registered_count: countBySlot.get(s.id) ?? 0,
  }));

  return NextResponse.json({
    quartiers: quartiersRes.data ?? [],
    schedules: schedulesRes.data ?? [],
    slots,
  });
}
