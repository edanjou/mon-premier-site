"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import ChecklistTab from "@/components/checklist-tab";
import RequireFeature from "@/components/require-feature";
import { getModuleAccessLevels } from "@/lib/features";
import { getOwnProfile } from "@/lib/profile";

function TournoisChosesAFaireContent() {
  const [canWrite, setCanWrite] = useState(true);

  useEffect(() => {
    getOwnProfile().then((profile) => {
      if (!profile) return;
      getModuleAccessLevels(profile).then((levels) => {
        setCanWrite(levels["tournois"] === "ecriture");
      });
    });
  }, []);

  return (
    <div>
      <Link
        href="/grande-bataille/2026/tournois"
        className="flex items-center gap-1.5 text-sm text-foreground/60 transition-colors hover:text-foreground"
      >
        <ArrowLeft size={14} />
        Tournois
      </Link>
      <h1 className={`${glofters.className} mt-2 text-3xl text-foreground`}>
        Choses à faire
      </h1>
      <Breadcrumb />
      <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
        <ChecklistTab listKey="tournois" canWrite={canWrite} />
      </div>
    </div>
  );
}

export default function TournoisChosesAFairePage() {
  return (
    <RequireFeature feature="tournois">
      <TournoisChosesAFaireContent />
    </RequireFeature>
  );
}
