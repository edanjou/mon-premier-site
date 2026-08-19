"use client";

import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import CentralizedVolunteersPanel from "@/components/centralized-volunteers-panel";
import RequireFeature from "@/components/require-feature";

export default function OutilsVolontairesPage() {
  return (
    <RequireFeature feature="volontaires-centralise">
      <div>
        <h1 className={`${glofters.className} text-3xl text-foreground`}>
          Gestion des volontaires — vue centralisée
        </h1>
        <Breadcrumb />
        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
          <CentralizedVolunteersPanel year={2026} />
        </div>
      </div>
    </RequireFeature>
  );
}
