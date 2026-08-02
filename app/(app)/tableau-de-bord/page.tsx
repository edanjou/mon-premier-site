"use client";

import { useEffect, useState } from "react";
import ModuleHub from "@/components/module-hub";
import { DASHBOARD_ITEMS } from "@/lib/hub-items";
import { getOwnProfile } from "@/lib/profile";

export default function DashboardPage() {
  const [firstName, setFirstName] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);

  useEffect(() => {
    getOwnProfile().then((profile) => {
      setFirstName(profile?.first_name ?? null);
      setTitle(profile?.title ?? null);
    });
  }, []);

  return (
    <ModuleHub
      title={`Bonjour${firstName ? ` ${firstName}` : ""}`}
      subtitle={title}
      orderColumn="dashboard_order"
      items={DASHBOARD_ITEMS}
    />
  );
}
