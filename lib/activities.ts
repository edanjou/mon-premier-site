export const ACTIVITY_CATEGORIES = [
  "Campagne militaire",
  "Campagne d'aventure",
  "Scénario spécial",
  "Escarmouche",
  "Grande Bataille",
] as const;

export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

export type Activity = {
  id: string;
  name: string;
  date: string;
  category: ActivityCategory;
  number_of_fronts: number;
  participants_per_front: number;
  created_at: string;
};

export type ActivityInput = {
  name: string;
  date: string;
  category: ActivityCategory;
  number_of_fronts: number;
  participants_per_front: number;
};
