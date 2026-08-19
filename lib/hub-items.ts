import {
  Archive,
  Award,
  Axe,
  Brain,
  BriefcaseMedical,
  CalendarClock,
  Castle,
  ChessKnight,
  ChessPawn,
  CircleDollarSign,
  Clock,
  ClipboardList,
  Drama,
  Hammer,
  Home,
  IdCard,
  Inbox,
  KeyRound,
  ListChecks,
  MapPinned,
  MessageSquarePlus,
  NotebookPen,
  Package,
  PencilRuler,
  PocketKnife,
  Printer,
  Radio,
  ScrollText,
  ShieldCheck,
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
    href: "/grande-bataille/2026/combat/choses-a-faire",
    label: "Choses à faire",
    icon: ListChecks,
    moduleKey: "grandes-batailles",
  },
  {
    href: "/grande-bataille/2026/combat/escarmouches",
    label: "Escarmouches",
    icon: Axe,
  },
  {
    href: "/grande-bataille/2026/combat/homologation",
    label: "Homologation",
    icon: ShieldCheck,
  },
  {
    href: "/grande-bataille/2026/combat/volontaires",
    label: "Gestion des volontaires",
    icon: Users,
    moduleKey: "benevoles",
  },
  {
    href: "/grande-bataille/2026/combat/feuille-de-temps",
    label: "Feuille de temps",
    icon: Clock,
    moduleKey: "feuille-de-temps",
  },
  {
    href: "/grande-bataille/2026/combat/grandes-batailles",
    label: "Grandes Batailles",
    icon: Castle,
    moduleKey: "grandes-batailles",
  },
  {
    href: "/grande-bataille/2026/combat/bilan",
    label: "Bilan",
    icon: NotebookPen,
    moduleKey: "bilan",
  },
  {
    href: "/grande-bataille/2026/combat/inventaire",
    label: "Inventaire matériel",
    icon: Package,
    moduleKey: "inventaire-combat",
  },
];

export const OUTILS_ITEMS: HubItem[] = [
  {
    href: "/grande-bataille/2026/outils/reservation-plateaux",
    label: "Réservation des plateaux",
    icon: CalendarClock,
    moduleKey: "plateaux",
  },
  {
    href: "/grande-bataille/2026/outils/volontaires",
    label: "Gestion des volontaires",
    icon: Users,
    moduleKey: "volontaires-centralise",
  },
  {
    href: "/grande-bataille/2026/outils/radios",
    label: "Radios",
    icon: Radio,
    moduleKey: "radios",
  },
  {
    href: "/grande-bataille/2026/outils/cles",
    label: "Clés",
    icon: KeyRound,
    moduleKey: "cles",
  },
  {
    href: "/grande-bataille/2026/outils/impressions",
    label: "Impressions",
    icon: Printer,
    moduleKey: "impressions",
  },
];

export const GRANDE_BATAILLE_ITEMS: HubItem[] = [
  {
    href: "/grande-bataille/2026/combat",
    label: "Combat",
    icon: Swords,
    noGate: true,
    childItems: COMBAT_ITEMS,
  },
  {
    href: "/grande-bataille/2026/outils",
    label: "Outils",
    icon: PencilRuler,
    noGate: true,
    childItems: OUTILS_ITEMS,
  },
  {
    href: "/grande-bataille/2026/tournois",
    label: "Tournois",
    icon: Trophy,
    moduleKey: "tournois",
  },
  { href: "/grande-bataille/2026/generale", label: "Générale", icon: Brain, moduleKey: "generale" },
  { href: "/grande-bataille/2026/jeu-gb", label: "Jeu", icon: ChessPawn, moduleKey: "jeu-gb" },
  {
    href: "/grande-bataille/2026/securite",
    label: "Sécurité",
    icon: BriefcaseMedical,
    moduleKey: "securite",
  },
  {
    href: "/grande-bataille/2026/accueil",
    label: "Accueil",
    icon: Home,
    moduleKey: "accueil",
  },
  {
    href: "/grande-bataille/2026/vie-du-duche",
    label: "Vie du Duché",
    icon: Theater,
    moduleKey: "vie-du-duche",
  },
  {
    href: "/grande-bataille/2026/operations",
    label: "Opérations",
    icon: ClipboardList,
    moduleKey: "operations",
  },
  {
    href: "/grande-bataille/2026/administration",
    label: "Administration",
    icon: CircleDollarSign,
    moduleKey: "administration",
  },
];

// Coordinations with only the 4 generic modules (Volontaires, Feuille de
// temps, Bilan, Choses à faire) — served by the [coordination] dynamic
// route, unlike Combat/Tournois which have their own static folders and
// extra, coordination-specific pages.
export const EXTRA_COORDINATIONS: { key: string; label: string }[] = [
  { key: "generale", label: "Générale" },
  { key: "jeu-gb", label: "Jeu" },
  { key: "securite", label: "Sécurité" },
  { key: "accueil", label: "Accueil" },
  { key: "vie-du-duche", label: "Vie du Duché" },
  { key: "operations", label: "Opérations" },
  { key: "administration", label: "Administration" },
];

export function coordinationLabel(key: string): string {
  return EXTRA_COORDINATIONS.find((c) => c.key === key)?.label ?? key;
}

// All 9 coordinations (the 2 with their own static folders + the 7 simple
// ones), for cross-coordination tools like the centralized volunteer view
// and the plateau booking board.
export const ALL_COORDINATIONS: { key: string; label: string }[] = [
  { key: "combat", label: "Combat" },
  { key: "tournois", label: "Tournois" },
  ...EXTRA_COORDINATIONS,
];

export function allCoordinationLabel(key: string): string {
  return ALL_COORDINATIONS.find((c) => c.key === key)?.label ?? key;
}

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
  { href: "/demandes", label: "Demandes", icon: Inbox },
  {
    href: "/demandes/nouvelle",
    label: "Faire une demande",
    icon: MessageSquarePlus,
    noGate: true,
    hideForAdmin: true,
  },
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
    ...OUTILS_ITEMS,
    ...TOP_BAR_ITEMS,
  ]
    .filter((item) => !item.disabled && item.href.startsWith("/"))
    .map((item) => [item.href, item.label]),
);
BREADCRUMB_LABELS["/grande-bataille/2026"] = "2026";
BREADCRUMB_LABELS["/grande-bataille/2026/tournois/feuille-de-temps"] =
  "Feuille de temps";
BREADCRUMB_LABELS["/grande-bataille/2026/tournois/volontaires"] =
  "Gestion des volontaires";
BREADCRUMB_LABELS["/grande-bataille/2026/tournois/bilan"] = "Bilan";
BREADCRUMB_LABELS["/grande-bataille/2026/tournois/choses-a-faire"] =
  "Choses à faire";
BREADCRUMB_LABELS["/grande-bataille/2026/combat/homologation/horaires"] =
  "Horaires";
BREADCRUMB_LABELS["/grande-bataille/2026/combat/homologation/inventaire"] =
  "Inventaire matériel";
BREADCRUMB_LABELS["/grande-bataille/2026/combat/homologation/inscriptions"] =
  "Inscription mobile";
BREADCRUMB_LABELS[
  "/grande-bataille/2026/combat/homologation/machines-de-guerre"
] = "Machines de guerre";
BREADCRUMB_LABELS["/grande-bataille/2026/combat/homologation/bestiaire"] =
  "Bestiaire";
for (const c of EXTRA_COORDINATIONS) {
  BREADCRUMB_LABELS[`/grande-bataille/2026/${c.key}/volontaires`] =
    "Gestion des volontaires";
  BREADCRUMB_LABELS[`/grande-bataille/2026/${c.key}/feuille-de-temps`] =
    "Feuille de temps";
  BREADCRUMB_LABELS[`/grande-bataille/2026/${c.key}/bilan`] = "Bilan";
  BREADCRUMB_LABELS[`/grande-bataille/2026/${c.key}/choses-a-faire`] =
    "Choses à faire";
}

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
  if (pathname.startsWith("/grande-bataille/2026/combat")) {
    return { items: COMBAT_ITEMS, orderColumn: "combat_order" };
  }
  if (pathname.startsWith("/grande-bataille/2026/outils")) {
    return { items: OUTILS_ITEMS, orderColumn: "outils_order" };
  }
  if (pathname.startsWith("/grande-bataille/2026")) {
    return { items: GRANDE_BATAILLE_ITEMS, orderColumn: "grande_bataille_order" };
  }
  if (pathname.startsWith("/campagnes")) {
    return { items: CAMPAGNES_ITEMS, orderColumn: "campagnes_order" };
  }
  return { items: DASHBOARD_ITEMS, orderColumn: "dashboard_order" };
}
