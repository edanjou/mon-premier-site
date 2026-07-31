export const ACTIVITY_CATEGORIES = [
  "Campagne militaire",
  "Campagne d'aventure",
  "Scénario spécial",
  "Escarmouche",
  "Grande Bataille",
] as const;

export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

export const ACTIVITY_CATEGORY_STYLES: Record<ActivityCategory, string> = {
  "Campagne militaire":
    "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  "Campagne d'aventure":
    "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  "Scénario spécial":
    "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  Escarmouche:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  "Grande Bataille":
    "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

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
