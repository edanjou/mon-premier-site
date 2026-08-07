"use client";

import { useParams } from "next/navigation";
import CoordinationHub from "@/components/coordination-hub";
import RequireFeature from "@/components/require-feature";
import { coordinationLabel } from "@/lib/hub-items";

export default function CoordinationPage() {
  const { coordination } = useParams<{ coordination: string }>();

  return (
    <RequireFeature feature={coordination}>
      <CoordinationHub
        title={coordinationLabel(coordination)}
        basePath={`/grande-bataille/2026/${coordination}`}
      />
    </RequireFeature>
  );
}
