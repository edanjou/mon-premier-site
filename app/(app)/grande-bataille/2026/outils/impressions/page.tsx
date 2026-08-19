"use client";

import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import PrintRequestsPanel from "@/components/print-requests-panel";
import RequireFeature from "@/components/require-feature";

export default function OutilsImpressionsPage() {
  return (
    <RequireFeature feature="impressions">
      <div>
        <h1 className={`${glofters.className} text-3xl text-foreground`}>
          Impressions
        </h1>
        <Breadcrumb />
        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
          <PrintRequestsPanel coordinationKey="outils" moduleKey="impressions" />
        </div>
      </div>
    </RequireFeature>
  );
}
