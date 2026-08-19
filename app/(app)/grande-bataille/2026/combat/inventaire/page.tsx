"use client";

import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import EquipmentInventoryPanel from "@/components/equipment-inventory-panel";
import RequireFeature from "@/components/require-feature";

export default function CombatInventairePage() {
  return (
    <RequireFeature feature="inventaire-combat">
      <div>
        <h1 className={`${glofters.className} text-3xl text-foreground`}>
          Inventaire matériel
        </h1>
        <Breadcrumb />
        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
          <EquipmentInventoryPanel
            coordinationKey="combat"
            moduleKey="inventaire-combat"
          />
        </div>
      </div>
    </RequireFeature>
  );
}
