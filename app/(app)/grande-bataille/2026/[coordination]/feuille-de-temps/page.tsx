"use client";

import { useParams } from "next/navigation";
import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import RequireFeature from "@/components/require-feature";
import Timesheet from "@/components/timesheet";
import { coordinationLabel } from "@/lib/hub-items";

export default function CoordinationFeuilleDeTempsPage() {
  const { coordination } = useParams<{ coordination: string }>();

  return (
    <RequireFeature feature={coordination}>
      <div>
        <h1 className={`${glofters.className} text-3xl text-foreground`}>
          Feuille de temps — {coordinationLabel(coordination)}
        </h1>
        <Breadcrumb />
        <div className="mt-8">
          <Timesheet
            coordinationKey={coordination}
            moduleKey={coordination}
            year={2026}
          />
        </div>
      </div>
    </RequireFeature>
  );
}
