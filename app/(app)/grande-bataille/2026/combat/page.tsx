"use client";

import ModuleHub from "@/components/module-hub";
import { COMBAT_ITEMS } from "@/lib/hub-items";

export default function CombatHubPage() {
  return (
    <ModuleHub
      title="Combat"
      orderColumn="combat_order"
      items={COMBAT_ITEMS}
    />
  );
}
