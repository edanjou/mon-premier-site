"use client";

import { glofters } from "@/app/fonts/glofters";
import RequireFeature from "@/components/require-feature";

const ESCARMOUCHES_FEATURES = [
  "escarmouches",
  "escarmouches-scenariste",
] as const;

export default function EscarmouchesPage() {
  return (
    <RequireFeature feature={ESCARMOUCHES_FEATURES}>
      <div>
        <h1 className={`${glofters.className} text-3xl text-foreground`}>
          Escarmouches
        </h1>
      </div>
    </RequireFeature>
  );
}
