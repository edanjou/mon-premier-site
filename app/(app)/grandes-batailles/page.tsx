"use client";

import { glofters } from "@/app/fonts/glofters";
import RequireFeature from "@/components/require-feature";

const GRANDES_BATAILLES_FEATURES = [
  "grandes-batailles",
  "grandes-batailles-scenariste",
] as const;

export default function GrandesBataillesPage() {
  return (
    <RequireFeature feature={GRANDES_BATAILLES_FEATURES}>
      <div>
        <h1 className={`${glofters.className} text-3xl text-foreground`}>
          Grandes Batailles
        </h1>
      </div>
    </RequireFeature>
  );
}
