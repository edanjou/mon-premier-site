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
  { key: "activites", label: "Campagnes militaires", hasScenaristeTier: true },
  {
    key: "grandes-batailles",
    label: "Choses à faire",
    hasScenaristeTier: true,
  },
  { key: "escarmouches", label: "Escarmouches", hasScenaristeTier: true },
  { key: "scenarios", label: "Scénarios", hasScenaristeTier: true },
  { key: "jeu", label: "Jeu", hasScenaristeTier: false },
  { key: "homologation", label: "Homologation", hasScenaristeTier: false },
  { key: "marechaux", label: "Maréchaux", hasScenaristeTier: false },
  { key: "tournois", label: "Tournois", hasScenaristeTier: true },
  {
    key: "documents",
    label: "Gestion documentaire",
    hasScenaristeTier: false,
  },
];

function moduleByKey(key: string): ModuleDefinition {
  const mod = MODULES.find((m) => m.key === key);
  if (!mod) throw new Error(`Unknown module key: ${key}`);
  return mod;
}

export type PermissionTreeNode =
  | { type: "leaf"; module: ModuleDefinition }
  | { type: "group"; label: string; children: PermissionTreeNode[] };

// Mirrors the navigation hierarchy in lib/hub-items.ts (families → sub-sections →
// modules), but only includes nodes with a real page behind them — placeholder
// "Bientôt" sections have no permission to grant yet.
export const PERMISSION_TREE: PermissionTreeNode[] = [
  { type: "leaf", module: moduleByKey("editeur-carte") },
  {
    type: "group",
    label: "Campagnes",
    children: [
      { type: "leaf", module: moduleByKey("marechaux") },
      { type: "leaf", module: moduleByKey("activites") },
      { type: "leaf", module: moduleByKey("documents") },
    ],
  },
  {
    type: "group",
    label: "Grande Bataille",
    children: [
      { type: "leaf", module: moduleByKey("tournois") },
      {
        type: "group",
        label: "Combat",
        children: [
          { type: "leaf", module: moduleByKey("grandes-batailles") },
          { type: "leaf", module: moduleByKey("escarmouches") },
          { type: "leaf", module: moduleByKey("homologation") },
        ],
      },
    ],
  },
  { type: "leaf", module: moduleByKey("scenarios") },
  { type: "leaf", module: moduleByKey("jeu") },
];

export function collectModules(node: PermissionTreeNode): ModuleDefinition[] {
  return node.type === "leaf"
    ? [node.module]
    : node.children.flatMap(collectModules);
}

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
