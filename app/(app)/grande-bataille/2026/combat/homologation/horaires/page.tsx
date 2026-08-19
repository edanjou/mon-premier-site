"use client";

import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import HomologationStaffSchedule from "@/components/homologation-staff-schedule";
import RequireFeature from "@/components/require-feature";

function HomologationHorairesContent() {
  return (
    <div>
      <h1 className={`${glofters.className} text-3xl text-foreground`}>
        Horaires — Homologation
      </h1>
      <Breadcrumb />

      <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
        <HomologationStaffSchedule />
      </div>
    </div>
  );
}

export default function HomologationHorairesPage() {
  return (
    <RequireFeature feature="homologation">
      <HomologationHorairesContent />
    </RequireFeature>
  );
}
