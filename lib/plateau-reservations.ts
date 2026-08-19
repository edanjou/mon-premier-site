import { supabase } from "@/lib/supabase";

export type PlateauReservation = {
  id: string;
  coordination_key: string;
  plateau_id: string;
  title: string;
  event_coordination_id: string | null;
  date: string;
  setup_start: string | null;
  setup_end: string | null;
  start_time: string;
  end_time: string;
  teardown_start: string | null;
  teardown_end: string | null;
  notes: string | null;
  cancelled: boolean;
};

const RESERVATION_SELECT =
  "id, coordination_key, plateau_id, title, event_coordination_id, date, setup_start, setup_end, start_time, end_time, teardown_start, teardown_end, notes, cancelled";

export async function listReservations(
  coordinationKey: string,
): Promise<PlateauReservation[]> {
  const { data, error } = await supabase
    .from("plateau_reservations")
    .select(RESERVATION_SELECT)
    .eq("coordination_key", coordinationKey)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export type ReservationInput = {
  plateau_id: string;
  title: string;
  event_coordination_id: string | null;
  date: string;
  setup_start: string | null;
  setup_end: string | null;
  start_time: string;
  end_time: string;
  teardown_start: string | null;
  teardown_end: string | null;
  notes: string | null;
};

export async function createReservation(
  coordinationKey: string,
  input: ReservationInput,
): Promise<PlateauReservation> {
  const { data, error } = await supabase
    .from("plateau_reservations")
    .insert({ coordination_key: coordinationKey, ...input })
    .select(RESERVATION_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function updateReservation(
  id: string,
  input: ReservationInput,
): Promise<void> {
  const { error } = await supabase
    .from("plateau_reservations")
    .update(input)
    .eq("id", id);
  if (error) throw error;
}

export async function setReservationCancelled(
  id: string,
  cancelled: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("plateau_reservations")
    .update({ cancelled })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteReservation(id: string): Promise<void> {
  const { error } = await supabase
    .from("plateau_reservations")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

function effectiveWindow(r: PlateauReservation): { start: string; end: string } {
  return {
    start: r.setup_start ?? r.start_time,
    end: r.teardown_end ?? r.end_time,
  };
}

export function reservationsConflict(
  a: PlateauReservation,
  b: PlateauReservation,
): boolean {
  if (a.id === b.id || a.cancelled || b.cancelled) return false;
  if (a.plateau_id !== b.plateau_id || a.date !== b.date) return false;
  const wa = effectiveWindow(a);
  const wb = effectiveWindow(b);
  return wa.start < wb.end && wb.start < wa.end;
}
