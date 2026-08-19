"use client";

import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import PlateauxPanel from "@/components/plateaux-panel";
import RequireFeature from "@/components/require-feature";

export default function OutilsReservationPlateauxPage() {
  return (
    <RequireFeature feature="plateaux">
      <div>
        <h1 className={`${glofters.className} text-3xl text-foreground`}>
          Réservation des plateaux
        </h1>
        <Breadcrumb />
        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
          <PlateauxPanel coordinationKey="outils" moduleKey="plateaux" />
        </div>
      </div>
    </RequireFeature>
  );
}
