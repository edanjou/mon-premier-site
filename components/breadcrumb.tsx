"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { breadcrumbFor } from "@/lib/hub-items";

export default function Breadcrumb() {
  const pathname = usePathname();
  const crumbs = breadcrumbFor(pathname);

  if (crumbs.length <= 1) return null;

  return (
    <nav
      aria-label="Fil d'Ariane"
      className="mb-6 flex flex-wrap items-center gap-1 text-sm text-foreground/50"
    >
      {crumbs.map((crumb, index) => (
        <span key={crumb.href} className="flex items-center gap-1">
          {index > 0 && (
            <ChevronRight size={14} className="text-foreground/30" />
          )}
          {index === crumbs.length - 1 ? (
            <span className="text-foreground/70">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-foreground hover:underline">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
