import {
  Archive,
  Award,
  Axe,
  BadgeCheck,
  Briefcase,
  ChessKnight,
  ChessPawn,
  Clock,
  ClipboardList,
  Drama,
  Hammer,
  Home,
  IdCard,
  Info,
  ListChecks,
  MapPinned,
  PocketKnife,
  ScrollText,
  Shield,
  ShieldAlert,
  ShieldUser,
  Swords,
  Theater,
  Trophy,
  Users,
  VenetianMask,
} from "lucide-react";
import type { HubItem, OrderColumn } from "@/components/module-hub";
import BicollineIcon from "@/components/bicolline-icon";

export const COMBAT_ITEMS: HubItem[] = [
  {
    href: "/grande-bataille/combat/choses-a-faire",
    label: "Choses à faire",
    icon: ListChecks,
    moduleKey: "grandes-batailles",
  },
  {
    href: "/grande-bataille/combat/escarmouches",
    label: "Escarmouches",
    icon: Axe,
  },
  {
    href: "/grande-bataille/combat/homologation",
    label: "Homologation",
    icon: BadgeCheck,
  },
  {
    href: "/grande-bataille/combat/volontaires",
    label: "Gestion des volontaires",
    icon: Users,
    moduleKey: "benevoles",
  },
  {
    href: "/grande-bataille/combat/feuille-de-temps",
    label: "Feuille de temps",
    icon: Clock,
    moduleKey: "feuille-de-temps",
  },
  {
    href: "/grande-bataille/combat/grandes-batailles",
    label: "Grandes Batailles",
    icon: Shield,
    moduleKey: "grandes-batailles",
  },
];

export const GRANDE_BATAILLE_ITEMS: HubItem[] = [
  {
    href: "/grande-bataille/combat",
    label: "Combat",
    icon: Swords,
    noGate: true,
    childItems: COMBAT_ITEMS,
  },
  {
    href: "/grande-bataille/tournois",
    label: "Tournois",
    icon: Trophy,
    moduleKey: "tournois",
  },
  { href: "#generale", label: "Générale", icon: Info, disabled: true },
  { href: "#jeu-gb", label: "Jeu", icon: ChessPawn, disabled: true },
  {
    href: "#securite",
    label: "Sécurité",
    icon: ShieldAlert,
    disabled: true,
  },
  { href: "#accueil", label: "Accueil", icon: Home, disabled: true },
  {
    href: "#vie-du-duche",
    label: "Vie du Duché",
    icon: Theater,
    disabled: true,
  },
  {
    href: "#operations",
    label: "Opérations",
    icon: ClipboardList,
    disabled: true,
  },
  {
    href: "#administration",
    label: "Administration",
    icon: Briefcase,
    disabled: true,
  },
];

export const CAMPAGNES_ITEMS: HubItem[] = [
  { href: "/campagnes/marechaux", label: "Liste maréchaux", icon: PocketKnife },
  {
    href: "/campagnes/liste-pnj",
    label: "Liste PNJ",
    icon: VenetianMask,
    moduleKey: "pnj",
  },
  {
    href: "/campagnes/activites",
    label: "Campagnes militaires",
    icon: Swords,
    moduleKey: "activites",
  },
  {
    href: "/campagnes/documents",
    label: "Gestion documentaire",
    icon: Archive,
    moduleKey: "documents",
  },
  {
    href: "/campagnes/scenarios",
    label: "Scénarios spéciaux",
    icon: ScrollText,
    moduleKey: "scenarios",
  },
];

export const DASHBOARD_ITEMS: HubItem[] = [
  {
    href: "/campagnes",
    label: "Activités",
    icon: Swords,
    noGate: true,
    childItems: CAMPAGNES_ITEMS,
  },
  {
    href: "/grande-bataille",
    label: "Grande Bataille",
    icon: BicollineIcon,
    noGate: true,
    childItems: GRANDE_BATAILLE_ITEMS,
  },
  { href: "/jeu", label: "Jeu", icon: ChessKnight, moduleKey: "jeu" },
  {
    href: "#tournoi-des-nations",
    label: "Tournoi des nations",
    icon: Award,
    disabled: true,
  },
  {
    href: "#bal-pourpre",
    label: "Bal pourpre",
    icon: Drama,
    disabled: true,
  },
  {
    href: "/editeur-carte",
    label: "Création de carte",
    icon: MapPinned,
    moduleKey: "editeur-carte",
  },
  { href: "/utilisateurs", label: "Utilisateurs", icon: IdCard, pinned: true },
];

// Rendered next to the dark mode toggle (top-right, visible on every
// authenticated page) instead of the per-section sidebar, since Paramètres/
// Mon compte are global and not tied to any hub context.
export const TOP_BAR_ITEMS: HubItem[] = [
  { href: "/choses-a-faire", label: "Choses à faire", icon: ListChecks },
  { href: "/parametres", label: "Paramètres", icon: Hammer },
  {
    href: "/mon-compte",
    label: "Mon compte",
    icon: ShieldUser,
    noGate: true,
  },
];

const BREADCRUMB_LABELS: Record<string, string> = Object.fromEntries(
  [
    ...DASHBOARD_ITEMS,
    ...CAMPAGNES_ITEMS,
    ...GRANDE_BATAILLE_ITEMS,
    ...COMBAT_ITEMS,
    ...TOP_BAR_ITEMS,
  ]
    .filter((item) => !item.disabled && item.href.startsWith("/"))
    .map((item) => [item.href, item.label]),
);
BREADCRUMB_LABELS["/grande-bataille/tournois/feuille-de-temps"] =
  "Feuille de temps";

export function breadcrumbFor(
  pathname: string,
): { href: string; label: string }[] {
  if (pathname === "/tableau-de-bord") return [];
  const crumbs: { href: string; label: string }[] = [];
  const segments = pathname.split("/").filter(Boolean);
  let acc = "";
  for (const segment of segments) {
    acc += `/${segment}`;
    const label = BREADCRUMB_LABELS[acc];
    if (label) crumbs.push({ href: acc, label });
  }
  return crumbs;
}

export function hubContextFor(pathname: string): {
  items: HubItem[];
  orderColumn: OrderColumn;
} {
  if (pathname.startsWith("/grande-bataille/combat")) {
    return { items: COMBAT_ITEMS, orderColumn: "combat_order" };
  }
  if (pathname.startsWith("/grande-bataille")) {
    return { items: GRANDE_BATAILLE_ITEMS, orderColumn: "grande_bataille_order" };
  }
  if (pathname.startsWith("/campagnes")) {
    return { items: CAMPAGNES_ITEMS, orderColumn: "campagnes_order" };
  }
  return { items: DASHBOARD_ITEMS, orderColumn: "dashboard_order" };
}
