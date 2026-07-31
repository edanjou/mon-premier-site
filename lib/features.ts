export const FEATURES = [
  { key: "editeur-carte", label: "Éditeur de carte" },
  { key: "activites", label: "Activités" },
  {
    key: "activites-scenariste",
    label: "Scénariste (fronts, chapitres, détails)",
  },
  { key: "jeu", label: "Jeu" },
] as const;

export type FeatureKey = (typeof FEATURES)[number]["key"];
