"use client";

import { useParams } from "next/navigation";
import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import RequireFeature from "@/components/require-feature";
import VolunteersPanel from "@/components/volunteers-panel";
import { coordinationLabel } from "@/lib/hub-items";

export default function CoordinationVolontairesPage() {
  const { coordination } = useParams<{ coordination: string }>();

  return (
    <RequireFeature feature={coordination}>
      <div>
        <h1 className={`${glofters.className} text-3xl text-foreground`}>
          Gestion des volontaires — {coordinationLabel(coordination)}
        </h1>
        <Breadcrumb />
        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
          <VolunteersPanel
            coordinationKey={coordination}
            moduleKey={coordination}
            year={2026}
          />
        </div>
      </div>
    </RequireFeature>
  );
}
