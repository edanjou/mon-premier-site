"use client";

import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import { titleSizeClass } from "@/components/module-hub";

const YEARS = [
  { year: "2026", href: "/grande-bataille/2026", disabled: false },
  { year: "2027", href: null, disabled: true },
];

export default function GrandeBatailleHubPage() {
  return (
    <div>
      <h1 className={`${glofters.className} text-3xl text-foreground`}>
        Grande Bataille
      </h1>
      <Breadcrumb />
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {YEARS.map((y) =>
          y.disabled ? (
            <div
              key={y.year}
              className="flex items-center gap-3 rounded-2xl bg-white p-5 opacity-50 shadow-sm dark:border dark:border-white/60 dark:bg-zinc-900"
            >
              <span className="flex h-[55px] w-[55px] flex-shrink-0 items-center justify-center rounded-full bg-foreground/20 text-foreground/60">
                <CalendarDays size={25} />
              </span>
              <div className="flex flex-col gap-1">
                <h2
                  className={`${glofters.className} ${titleSizeClass(y.year)} leading-[0.9] text-foreground`}
                >
                  {y.year}
                </h2>
                <span className="w-fit rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-foreground/50">
                  Bientôt
                </span>
              </div>
            </div>
          ) : (
            <Link
              key={y.year}
              href={y.href!}
              className="group flex items-center gap-3 rounded-2xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border dark:border-white/60 dark:bg-zinc-900"
            >
              <span className="icon-badge-hover flex h-[55px] w-[55px] flex-shrink-0 items-center justify-center rounded-full bg-primary text-white">
                <CalendarDays size={25} className="group-hover:animate-wiggle" />
              </span>
              <h2
                className={`${glofters.className} ${titleSizeClass(y.year)} leading-[0.9] text-foreground`}
              >
                {y.year}
              </h2>
            </Link>
          ),
        )}
      </div>
    </div>
  );
}
