"use client";

import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import RequireFeature from "@/components/require-feature";

export default function ScenariosPage() {
  return (
    <RequireFeature feature="scenarios">
      <div>
        <h1 className={`${glofters.className} text-3xl text-foreground`}>
          Scénarios
        </h1>
        <Breadcrumb />
      </div>
    </RequireFeature>
  );
}
