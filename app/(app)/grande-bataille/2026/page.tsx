"use client";

import ModuleHub from "@/components/module-hub";
import { GRANDE_BATAILLE_ITEMS } from "@/lib/hub-items";

export default function GrandeBataille2026Page() {
  return (
    <ModuleHub
      title="Grande Bataille 2026"
      orderColumn="grande_bataille_order"
      items={GRANDE_BATAILLE_ITEMS}
    />
  );
}
