import type { Profile } from "@/lib/profile";
import { supabase } from "@/lib/supabase";

export type ModuleAccessLevel = "none" | "gestionnaire" | "scenariste";

export type ModuleDefinition = {
  key: string;
  label: string;
  hasScenaristeTier: boolean;
};

export const MODULES: ModuleDefinition[] = [
  {
    key: "editeur-carte",
    label: "Éditeur de carte",
    hasScenaristeTier: false,
  },
  { key: "activites", label: "Campagnes", hasScenaristeTier: true },
  {
    key: "grandes-batailles",
    label: "Grandes Batailles",
    hasScenaristeTier: true,
  },
  { key: "escarmouches", label: "Escarmouches", hasScenaristeTier: true },
  { key: "scenarios", label: "Scénarios", hasScenaristeTier: true },
  { key: "jeu", label: "Jeu", hasScenaristeTier: false },
  { key: "homologation", label: "Homologation", hasScenaristeTier: false },
  { key: "marechaux", label: "Maréchaux", hasScenaristeTier: false },
];

export function scenaristeKey(moduleKey: string): string {
  return `${moduleKey}-scenariste`;
}

export function moduleFeatureKeys(mod: ModuleDefinition): string[] {
  return mod.hasScenaristeTier
    ? [mod.key, scenaristeKey(mod.key)]
    : [mod.key];
}

async function getGrantedFeatures(userId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from("permissions")
    .select("feature")
    .eq("user_id", userId)
    .eq("granted", true);
  return new Set((data ?? []).map((r) => r.feature));
}

export function moduleAccessLevel(
  mod: ModuleDefinition,
  granted: Set<string>,
): ModuleAccessLevel {
  if (granted.has(mod.key)) return "gestionnaire";
  if (mod.hasScenaristeTier && granted.has(scenaristeKey(mod.key))) {
    return "scenariste";
  }
  return "none";
}

export async function getModuleAccessLevels(
  profile: Profile,
): Promise<Record<string, ModuleAccessLevel>> {
  if (profile.role === "admin") {
    return Object.fromEntries(MODULES.map((m) => [m.key, "gestionnaire"]));
  }
  const granted = await getGrantedFeatures(profile.id);
  return Object.fromEntries(
    MODULES.map((m) => [m.key, moduleAccessLevel(m, granted)]),
  );
}
