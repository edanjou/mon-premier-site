"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FeatureKey } from "@/lib/features";
import { getOwnProfile } from "@/lib/profile";
import { supabase } from "@/lib/supabase";

export default function RequireFeature({
  feature,
  children,
}: {
  feature: FeatureKey;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "allowed" | "denied">(
    "checking",
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const profile = await getOwnProfile();
      if (!profile) {
        if (!cancelled) router.replace("/");
        return;
      }
      if (profile.role === "admin") {
        if (!cancelled) setStatus("allowed");
        return;
      }
      const { data } = await supabase
        .from("permissions")
        .select("granted")
        .eq("user_id", profile.id)
        .eq("feature", feature)
        .maybeSingle();
      if (!cancelled) setStatus(data?.granted ? "allowed" : "denied");
    })();
    return () => {
      cancelled = true;
    };
  }, [feature, router]);

  if (status === "checking") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-foreground/60">Chargement…</p>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <p className="text-lg font-semibold text-foreground">Accès refusé</p>
        <p className="text-sm text-foreground/60">
          Tu n&apos;as pas la permission d&apos;accéder à cette fonctionnalité.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
