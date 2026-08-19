import type { Profile } from "@/lib/profile";
import { supabase } from "@/lib/supabase";

export type ModuleAccessLevel = "none" | "lecture" | "ecriture";

export type ModuleDefinition = {
  key: string;
  label: string;
};

export const MODULES: ModuleDefinition[] = [
  { key: "editeur-carte", label: "Création de carte" },
  { key: "activites", label: "Campagnes militaires" },
  { key: "grandes-batailles", label: "Grandes Batailles" },
  { key: "benevoles", label: "Gestion des volontaires" },
  { key: "bilan", label: "Bilan" },
  { key: "escarmouches", label: "Escarmouches" },
  { key: "scenarios", label: "Scénarios" },
  { key: "jeu", label: "Jeu" },
  { key: "homologation", label: "Homologation" },
  { key: "marechaux", label: "Maréchaux" },
  { key: "pnj", label: "Liste PNJ" },
  { key: "tournois", label: "Tournois" },
  { key: "documents", label: "Gestion documentaire" },
  { key: "feuille-de-temps", label: "Feuille de temps" },
  { key: "generale", label: "Générale" },
  { key: "jeu-gb", label: "Jeu (Grande Bataille)" },
  { key: "securite", label: "Sécurité" },
  { key: "accueil", label: "Accueil" },
  { key: "vie-du-duche", label: "Vie du Duché" },
  { key: "operations", label: "Opérations" },
  { key: "administration", label: "Administration" },
  { key: "plateaux", label: "Réservation des plateaux" },
  { key: "volontaires-centralise", label: "Gestion des volontaires (centralisée)" },
  { key: "radios", label: "Radios" },
  { key: "cles", label: "Clés" },
  { key: "impressions", label: "Impressions" },
  { key: "inventaire-combat", label: "Inventaire matériel (Combat)" },
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
    label: "Activités",
    children: [
      { type: "leaf", module: moduleByKey("marechaux") },
      { type: "leaf", module: moduleByKey("pnj") },
      { type: "leaf", module: moduleByKey("activites") },
      { type: "leaf", module: moduleByKey("documents") },
      { type: "leaf", module: moduleByKey("scenarios") },
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
          { type: "leaf", module: moduleByKey("benevoles") },
          { type: "leaf", module: moduleByKey("feuille-de-temps") },
          { type: "leaf", module: moduleByKey("bilan") },
          { type: "leaf", module: moduleByKey("inventaire-combat") },
        ],
      },
      { type: "leaf", module: moduleByKey("generale") },
      { type: "leaf", module: moduleByKey("jeu-gb") },
      { type: "leaf", module: moduleByKey("securite") },
      { type: "leaf", module: moduleByKey("accueil") },
      { type: "leaf", module: moduleByKey("vie-du-duche") },
      { type: "leaf", module: moduleByKey("operations") },
      { type: "leaf", module: moduleByKey("administration") },
    ],
  },
  { type: "leaf", module: moduleByKey("jeu") },
  {
    type: "group",
    label: "Outils",
    children: [
      { type: "leaf", module: moduleByKey("plateaux") },
      { type: "leaf", module: moduleByKey("volontaires-centralise") },
      { type: "leaf", module: moduleByKey("radios") },
      { type: "leaf", module: moduleByKey("cles") },
      { type: "leaf", module: moduleByKey("impressions") },
    ],
  },
];

export function collectModules(node: PermissionTreeNode): ModuleDefinition[] {
  return node.type === "leaf"
    ? [node.module]
    : node.children.flatMap(collectModules);
}

export function ecritureKey(moduleKey: string): string {
  return `${moduleKey}-ecriture`;
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
  if (granted.has(ecritureKey(mod.key))) return "ecriture";
  if (granted.has(mod.key)) return "lecture";
  return "none";
}

export async function getModuleAccessLevels(
  profile: Profile,
): Promise<Record<string, ModuleAccessLevel>> {
  if (profile.role === "admin") {
    return Object.fromEntries(MODULES.map((m) => [m.key, "ecriture"]));
  }
  const granted = await getGrantedFeatures(profile.id);
  return Object.fromEntries(
    MODULES.map((m) => [m.key, moduleAccessLevel(m, granted)]),
  );
}
