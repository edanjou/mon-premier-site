"use client";

import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import RequireFeature from "@/components/require-feature";
import WarMachinesPanel from "@/components/war-machines-panel";

export default function HomologationWarMachinesPage() {
  return (
    <RequireFeature feature="homologation">
      <div>
        <h1 className={`${glofters.className} text-3xl text-foreground`}>
          Machines de guerre — Homologation
        </h1>
        <Breadcrumb />
        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
          <WarMachinesPanel moduleKey="homologation" />
        </div>
      </div>
    </RequireFeature>
  );
}
