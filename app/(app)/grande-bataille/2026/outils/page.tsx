"use client";

import ModuleHub from "@/components/module-hub";
import { OUTILS_ITEMS } from "@/lib/hub-items";

export default function OutilsPage() {
  return (
    <ModuleHub title="Outils" orderColumn="outils_order" items={OUTILS_ITEMS} />
  );
}
