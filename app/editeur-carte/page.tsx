"use client";

import dynamic from "next/dynamic";

const MapEditor = dynamic(() => import("@/components/map-editor"), {
  ssr: false,
});

export default function EditeurCartePage() {
  return <MapEditor />;
}
