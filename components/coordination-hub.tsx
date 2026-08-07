"use client";

import { Clock, ListChecks, NotebookPen, Users } from "lucide-react";
import Link from "next/link";
import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import { titleSizeClass } from "@/components/module-hub";

const MODULES = [
  { slug: "volontaires", label: "Gestion des volontaires", icon: Users },
  { slug: "feuille-de-temps", label: "Feuille de temps", icon: Clock },
  { slug: "bilan", label: "Bilan", icon: NotebookPen },
  { slug: "choses-a-faire", label: "Choses à faire", icon: ListChecks },
];

export default function CoordinationHub({
  title,
  basePath,
}: {
  title: string;
  basePath: string;
}) {
  return (
    <div>
      <h1 className={`${glofters.className} text-3xl text-foreground`}>
        {title}
      </h1>
      <Breadcrumb />
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {MODULES.map((m) => (
          <Link
            key={m.slug}
            href={`${basePath}/${m.slug}`}
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
