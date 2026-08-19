"use client";

import { Package, Tags } from "lucide-react";
import { useState } from "react";
import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import EquipmentConsumablesPanel from "@/components/equipment-consumables-panel";
import EquipmentInventoryPanel from "@/components/equipment-inventory-panel";
import RequireFeature from "@/components/require-feature";

type Tab = "kiosques" | "consommables";

const TABS: { key: Tab; label: string; icon: typeof Package }[] = [
  { key: "kiosques", label: "Matériel des kiosques", icon: Package },
  { key: "consommables", label: "Consommables", icon: Tags },
];

export default function HomologationInventairePage() {
  const [tab, setTab] = useState<Tab>("kiosques");

  return (
    <RequireFeature feature="homologation">
      <div>
        <h1 className={`${glofters.className} text-3xl text-foreground`}>
          Inventaire matériel — Homologation
        </h1>
        <Breadcrumb />

        <div className="mt-6 flex gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.key
                  ? "border-primary bg-primary text-white"
                  : "border-black/[.08] bg-white text-foreground hover:bg-black/[.04] dark:border-white/[.145] dark:bg-zinc-900 dark:hover:bg-white/[.08]"
              }`}
            >
              <t.icon size={16} />
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
          {tab === "kiosques" ? (
            <EquipmentInventoryPanel
              coordinationKey="homologation"
              moduleKey="homologation"
            />
          ) : (
            <EquipmentConsumablesPanel
              coordinationKey="homologation"
              moduleKey="homologation"
            />
          )}
        </div>
      </div>
    </RequireFeature>
  );
}
