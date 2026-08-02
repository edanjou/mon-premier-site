"use client";

import ModuleHub from "@/components/module-hub";
import { GRANDE_BATAILLE_ITEMS } from "@/lib/hub-items";

export default function GrandeBatailleHubPage() {
  return (
    <ModuleHub
      title="Grande Bataille"
      orderColumn="grande_bataille_order"
      items={GRANDE_BATAILLE_ITEMS}
    />
  );
}
