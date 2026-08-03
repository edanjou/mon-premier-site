"use client";

import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import RequireFeature from "@/components/require-feature";
import Timesheet from "@/components/timesheet";

export default function FeuilleDeTempsPage() {
  return (
    <RequireFeature feature="feuille-de-temps">
      <div>
        <h1 className={`${glofters.className} text-3xl text-foreground`}>
          Feuille de temps
        </h1>
        <Breadcrumb />
        <div className="mt-8">
          <Timesheet coordinationKey="combat" moduleKey="feuille-de-temps" />
        </div>
      </div>
    </RequireFeature>
  );
}
