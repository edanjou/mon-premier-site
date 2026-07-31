"use client";

import dynamic from "next/dynamic";
import RequireFeature from "@/components/require-feature";

const MapEditor = dynamic(() => import("@/components/map-editor"), {
  ssr: false,
});

export default function EditeurCartePage() {
  return (
    <RequireFeature feature="editeur-carte">
      <MapEditor />
    </RequireFeature>
  );
}
