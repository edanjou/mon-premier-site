"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import ChecklistTab from "@/components/checklist-tab";
import RequireFeature from "@/components/require-feature";
import { getModuleAccessLevels } from "@/lib/features";
import { coordinationLabel } from "@/lib/hub-items";
import { getOwnProfile } from "@/lib/profile";

function CoordinationChosesAFaireContent({
  coordination,
}: {
  coordination: string;
}) {
  const [canWrite, setCanWrite] = useState(true);

  useEffect(() => {
    getOwnProfile().then((profile) => {
      if (!profile) return;
      getModuleAccessLevels(profile).then((levels) => {
        setCanWrite(levels[coordination] === "ecriture");
      });
    });
  }, [coordination]);

  return (
    <div>
      <h1 className={`${glofters.className} text-3xl text-foreground`}>
        Choses à faire — {coordinationLabel(coordination)}
      </h1>
      <Breadcrumb />
      <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
        <ChecklistTab listKey={coordination} canWrite={canWrite} />
      </div>
    </div>
  );
}

export default function CoordinationChosesAFairePage() {
  const { coordination } = useParams<{ coordination: string }>();

  return (
    <RequireFeature feature={coordination}>
      <CoordinationChosesAFaireContent coordination={coordination} />
    </RequireFeature>
  );
}
