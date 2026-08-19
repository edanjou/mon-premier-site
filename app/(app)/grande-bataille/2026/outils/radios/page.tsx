"use client";

import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import RadiosPanel from "@/components/radios-panel";
import RequireFeature from "@/components/require-feature";

export default function OutilsRadiosPage() {
  return (
    <RequireFeature feature="radios">
      <div>
        <h1 className={`${glofters.className} text-3xl text-foreground`}>
          Radios
        </h1>
        <Breadcrumb />
        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
          <RadiosPanel coordinationKey="outils" moduleKey="radios" />
        </div>
      </div>
    </RequireFeature>
  );
}
