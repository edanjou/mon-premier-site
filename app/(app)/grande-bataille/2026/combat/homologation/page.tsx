"use client";

import {
  CalendarClock,
  ClipboardList,
  Crosshair,
  Package,
  Skull,
} from "lucide-react";
import Link from "next/link";
import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import { titleSizeClass } from "@/components/module-hub";
import RequireFeature from "@/components/require-feature";

const MODULES = [
  {
    slug: "inventaire",
    label: "Inventaire matériel",
    icon: Package,
  },
  { slug: "horaires", label: "Horaires", icon: CalendarClock },
  {
    slug: "inscriptions",
    label: "Inscription mobile",
    icon: ClipboardList,
  },
  {
    slug: "machines-de-guerre",
    label: "Machines de guerre",
    icon: Crosshair,
  },
  { slug: "bestiaire", label: "Bestiaire", icon: Skull },
];

function HomologationHubContent() {
  return (
    <div>
      <h1 className={`${glofters.className} text-3xl text-foreground`}>
        Homologation
      </h1>
      <Breadcrumb />
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => (
          <Link
            key={m.slug}
            href={`/grande-bataille/2026/combat/homologation/${m.slug}`}
            className="group flex items-center gap-3 rounded-2xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border dark:border-white/60 dark:bg-zinc-900"
          >
            <span className="icon-badge-hover flex h-[55px] w-[55px] flex-shrink-0 items-center justify-center rounded-full bg-primary text-white">
              <m.icon size={25} className="group-hover:animate-wiggle" />
            </span>
            <h2
              className={`${glofters.className} ${titleSizeClass(m.label)} line-clamp-2 min-w-0 break-words leading-[0.9] text-foreground`}
            >
              {m.label}
            </h2>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function HomologationPage() {
  return (
    <RequireFeature feature="homologation">
      <HomologationHubContent />
    </RequireFeature>
  );
}
