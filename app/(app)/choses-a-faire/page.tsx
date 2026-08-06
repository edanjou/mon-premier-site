"use client";

import { useEffect, useState } from "react";
import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import ChecklistTab from "@/components/checklist-tab";
import { getOwnProfile } from "@/lib/profile";

export default function ChosesAFairePage() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    getOwnProfile().then((profile) => setIsAdmin(profile?.role === "admin"));
  }, []);

  return (
    <div>
      <h1 className={`${glofters.className} text-3xl text-foreground`}>
        Choses à faire
      </h1>
      <Breadcrumb />

      {isAdmin && (
        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
          <ChecklistTab
            listKey="systeme"
            canWrite={isAdmin}
            showMeta={false}
            showPrompt
          />
        </div>
      )}
    </div>
  );
}
