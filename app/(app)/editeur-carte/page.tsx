"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import RequireFeature from "@/components/require-feature";
import { getModuleAccessLevels } from "@/lib/features";
import { getOwnProfile } from "@/lib/profile";

const MapEditor = dynamic(() => import("@/components/map-editor"), {
  ssr: false,
});

export default function EditeurCartePage() {
  const [canWrite, setCanWrite] = useState(true);

  useEffect(() => {
    getOwnProfile().then((profile) => {
      if (!profile) return;
      getModuleAccessLevels(profile).then((levels) => {
        setCanWrite(levels["editeur-carte"] === "ecriture");
      });
    });
  }, []);

  return (
    <RequireFeature feature="editeur-carte">
      <MapEditor canWrite={canWrite} />
    </RequireFeature>
  );
}
