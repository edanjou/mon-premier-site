"use client";

import ModuleHub from "@/components/module-hub";
import { CAMPAGNES_ITEMS } from "@/lib/hub-items";

export default function CampagnesHubPage() {
  return (
    <ModuleHub
      title="Campagnes"
      orderColumn="campagnes_order"
      items={CAMPAGNES_ITEMS}
    />
  );
}
