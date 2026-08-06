"use client";

import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import RequireFeature from "@/components/require-feature";
import VolunteersPanel from "@/components/volunteers-panel";

export default function VolontairesPage() {
  return (
    <RequireFeature feature="benevoles">
      <div>
        <h1 className={`${glofters.className} text-3xl text-foreground`}>
          Gestion des volontaires
        </h1>
        <Breadcrumb />
        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
          <VolunteersPanel coordinationKey="combat" moduleKey="benevoles" />
        </div>
      </div>
    </RequireFeature>
  );
}
