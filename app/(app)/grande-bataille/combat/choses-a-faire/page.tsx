"use client";

import { ClipboardCheck, ListChecks } from "lucide-react";
import { useEffect, useState } from "react";
import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import ChecklistTab from "@/components/checklist-tab";
import RequireFeature from "@/components/require-feature";
import { getModuleAccessLevels } from "@/lib/features";
import { getOwnProfile } from "@/lib/profile";

type Tab = "choses-a-faire" | "preparation-gb-eric";

const TABS: { key: Tab; label: string; icon: typeof ListChecks }[] = [
  { key: "choses-a-faire", label: "Choses à faire", icon: ListChecks },
  {
    key: "preparation-gb-eric",
    label: "Préparation GB Éric",
    icon: ClipboardCheck,
  },
];

function GrandesBataillesContent() {
  const [tab, setTab] = useState<Tab>("choses-a-faire");
  const [canWrite, setCanWrite] = useState(true);

  useEffect(() => {
    getOwnProfile().then((profile) => {
      if (!profile) return;
      getModuleAccessLevels(profile).then((levels) => {
        setCanWrite(levels["grandes-batailles"] === "ecriture");
      });
    });
  }, []);

  return (
    <div>
      <h1 className={`${glofters.className} text-3xl text-foreground`}>
        Grandes Batailles
      </h1>
      <Breadcrumb />

      <div className="mt-6 flex gap-2 border-b border-black/[.08] dark:border-white/[.08]">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.key
                  ? "border-b-2 border-primary text-primary"
                  : "text-foreground/60 hover:text-foreground"
              }`}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
        {tab === "choses-a-faire" && (
          <ChecklistTab listKey="choses-a-faire" canWrite={canWrite} />
        )}
        {tab === "preparation-gb-eric" && (
          <ChecklistTab
            listKey="preparation-gb-eric"
            canWrite={canWrite}
            showMeta={false}
          />
        )}
      </div>
    </div>
  );
}

export default function GrandesBataillesPage() {
  return (
    <RequireFeature feature="grandes-batailles">
      <GrandesBataillesContent />
    </RequireFeature>
  );
}
