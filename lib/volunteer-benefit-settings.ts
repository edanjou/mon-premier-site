import { supabase } from "@/lib/supabase";

export type VolunteerBenefitSettings = {
  discountMinHours: number;
  discountRatePerHour: number;
  discountFreeHours: number;
  parkingHours: number;
  giftHours: number;
  hoursPerMeal: number;
  hoursPerShower: number;
};

const DEFAULTS: VolunteerBenefitSettings = {
  discountMinHours: 8,
  discountRatePerHour: 5,
  discountFreeHours: 45,
  parkingHours: 20,
  giftHours: 16,
  hoursPerMeal: 4,
  hoursPerShower: 16,
};

const KEYS: Record<keyof VolunteerBenefitSettings, string> = {
  discountMinHours: "volunteer_discount_min_hours",
  discountRatePerHour: "volunteer_discount_rate_per_hour",
  discountFreeHours: "volunteer_discount_free_hours",
  parkingHours: "volunteer_parking_hours",
  giftHours: "volunteer_gift_hours",
  hoursPerMeal: "volunteer_hours_per_meal",
  hoursPerShower: "volunteer_hours_per_shower",
};

export async function getVolunteerBenefitSettings(): Promise<VolunteerBenefitSettings> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", Object.values(KEYS));
  if (error) throw error;
  const byKey = new Map((data ?? []).map((r) => [r.key, r.value]));
  const result = { ...DEFAULTS };
  for (const field of Object.keys(KEYS) as (keyof VolunteerBenefitSettings)[]) {
    const raw = byKey.get(KEYS[field]);
    if (raw !== undefined) {
      const num = Number(raw);
      if (!Number.isNaN(num)) result[field] = num;
    }
  }
  return result;
}

export async function setVolunteerBenefitSetting(
  field: keyof VolunteerBenefitSettings,
  value: number,
): Promise<void> {
  const { error } = await supabase.from("app_settings").upsert({
    key: KEYS[field],
    value: String(value),
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export function computeDiscountLabel(
  totalHours: number,
  settings: VolunteerBenefitSettings,
): string {
  if (totalHours >= settings.discountFreeHours) return "Gratuit";
  if (totalHours < settings.discountMinHours) return "0$";
  return `${totalHours * settings.discountRatePerHour}$`;
}

export function computeMealsCount(
  totalHours: number,
  settings: VolunteerBenefitSettings,
): number {
  return settings.hoursPerMeal > 0
    ? Math.floor(totalHours / settings.hoursPerMeal)
    : 0;
}

export function computeShowersCount(
  totalHours: number,
  settings: VolunteerBenefitSettings,
): number {
  return settings.hoursPerShower > 0
    ? Math.floor(totalHours / settings.hoursPerShower)
    : 0;
}

export function computeGiftEligible(
  totalHours: number,
  settings: VolunteerBenefitSettings,
): boolean {
  return totalHours >= settings.giftHours;
}

export function computeParkingAccess(
  totalHours: number,
  settings: VolunteerBenefitSettings,
): boolean {
  return totalHours >= settings.parkingHours;
}
