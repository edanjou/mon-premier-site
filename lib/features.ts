export const FEATURES = [
  { key: "editeur-carte", label: "Éditeur de carte" },
  { key: "activites", label: "Activités" },
] as const;

export type FeatureKey = (typeof FEATURES)[number]["key"];
