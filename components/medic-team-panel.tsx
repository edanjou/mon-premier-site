"use client";

import { Star } from "lucide-react";
import { useEffect, useState } from "react";
import {
  listMedicActivityStatuses,
  setMedicActivityStatus,
  type Medic,
} from "@/lib/medics";
import { marechalDisplayName } from "@/lib/marechaux";

type ActivityLike = {
  id: string;
  name: string;
  healer_count: number | null;
};

const pillClassName = (active: boolean) =>
  `rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
    active
      ? "border-primary bg-primary text-white"
      : "border-black/[.08] text-foreground/70 hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
  }`;

export default function MedicTeamPanel({
  activity,
  medics,
  canWrite,
}: {
  activity: ActivityLike;
  medics: Medic[];
  canWrite: boolean;
}) {
  const [statuses, setStatuses] = useState<
    Record<string, { is_available: boolean; is_assigned: boolean }>
  >({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    listMedicActivityStatuses(activity.id)
      .then((rows) => {
        const map: Record<
          string,
          { is_available: boolean; is_assigned: boolean }
        > = {};
        rows.forEach((r) => {
          map[r.medic_id] = {
            is_available: r.is_available,
            is_assigned: r.is_assigned,
          };
        });
        setStatuses(map);
      })
      .finally(() => setIsLoading(false));
  }, [activity.id]);

  const toggle = async (
    medicId: string,
    field: "is_available" | "is_assigned",
  ) => {
    if (!canWrite) return;
    const current = statuses[medicId] ?? {
      is_available: false,
      is_assigned: false,
    };
    const next = { ...current, [field]: !current[field] };

    if (
      field === "is_assigned" &&
      next.is_assigned &&
      activity.healer_count
    ) {
      const assignedCount = Object.values(statuses).filter(
        (s) => s.is_assigned,
      ).length;
      if (assignedCount >= activity.healer_count) {
        alert(
          `Le nombre de médics assignés (${activity.healer_count}) prévu pour cette campagne est déjà atteint.`,
        );
        return;
      }
    }

    setStatuses((prev) => ({ ...prev, [medicId]: next }));
    try {
      await setMedicActivityStatus(medicId, activity.id, {
        [field]: next[field],
      });
    } catch {
      setStatuses((prev) => ({ ...prev, [medicId]: current }));
      alert("Échec de la mise à jour.");
    }
  };

  if (isLoading) {
    return <p className="text-sm text-foreground/60">Chargement…</p>;
  }

  if (medics.length === 0) {
    return (
      <p className="text-sm text-foreground/60">
        Aucun médic — ajoutes-en depuis l&apos;onglet Médics.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {[...medics]
        .sort((a, b) =>
          marechalDisplayName(a).localeCompare(marechalDisplayName(b), "fr"),
        )
        .map((m) => {
          const status = statuses[m.id] ?? {
            is_available: false,
            is_assigned: false,
          };
          return (
            <div
              key={m.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-black/[.08] p-2 dark:border-white/[.145]"
            >
              <span className="flex items-center gap-1.5 text-sm text-foreground">
                {m.is_responsable && (
                  <Star
                    size={14}
                    className="text-amber-500"
                    fill="currentColor"
                  />
                )}
                {marechalDisplayName(m)}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggle(m.id, "is_available")}
                  disabled={!canWrite}
                  className={`${pillClassName(status.is_available)} disabled:cursor-default`}
                >
                  Disponible
                </button>
                <button
                  type="button"
                  onClick={() => toggle(m.id, "is_assigned")}
                  disabled={!canWrite}
                  className={`${pillClassName(status.is_assigned)} disabled:cursor-default`}
                >
                  Assigné
                </button>
              </div>
            </div>
          );
        })}
    </div>
  );
}
