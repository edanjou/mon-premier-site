"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import RequireFeature from "@/components/require-feature";
import VolunteersPanel from "@/components/volunteers-panel";

export default function TournoisVolontairesPage() {
  return (
    <RequireFeature feature="tournois">
      <div>
        <Link
          href="/grande-bataille/2026/tournois"
          className="flex items-center gap-1.5 text-sm text-foreground/60 transition-colors hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Tournois
        </Link>
        <h1 className={`${glofters.className} mt-2 text-3xl text-foreground`}>
          Gestion des volontaires
        </h1>
        <Breadcrumb />
        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
          <VolunteersPanel
            coordinationKey="tournois"
            moduleKey="tournois"
            year={2026}
          />
        </div>
      </div>
    </RequireFeature>
  );
}
