"use client";

import { glofters } from "@/app/fonts/glofters";
import RequireFeature from "@/components/require-feature";

const SCENARIOS_FEATURES = ["scenarios", "scenarios-scenariste"] as const;

export default function ScenariosPage() {
  return (
    <RequireFeature feature={SCENARIOS_FEATURES}>
      <div>
        <h1 className={`${glofters.className} text-3xl text-foreground`}>
          Scénarios
        </h1>
      </div>
    </RequireFeature>
  );
}
