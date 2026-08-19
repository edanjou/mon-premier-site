"use client";

import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import KeysPanel from "@/components/keys-panel";
import RequireFeature from "@/components/require-feature";

export default function OutilsClesPage() {
  return (
    <RequireFeature feature="cles">
      <div>
        <h1 className={`${glofters.className} text-3xl text-foreground`}>
          Clés
        </h1>
        <Breadcrumb />
        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
          <KeysPanel coordinationKey="outils" moduleKey="cles" />
        </div>
      </div>
    </RequireFeature>
  );
}
