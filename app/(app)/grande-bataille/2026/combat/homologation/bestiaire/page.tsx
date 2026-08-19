"use client";

import { glofters } from "@/app/fonts/glofters";
import BestiaryPanel from "@/components/bestiary-panel";
import Breadcrumb from "@/components/breadcrumb";
import RequireFeature from "@/components/require-feature";

export default function HomologationBestiaryPage() {
  return (
    <RequireFeature feature="homologation">
      <div>
        <h1 className={`${glofters.className} text-3xl text-foreground`}>
          Bestiaire — Homologation
        </h1>
        <Breadcrumb />
        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
          <BestiaryPanel moduleKey="homologation" />
        </div>
      </div>
    </RequireFeature>
  );
}
