"use client";

import { Copy } from "lucide-react";
import { useEffect, useState } from "react";
import {
  FRONT_COLORS,
  FRONT_COLOR_STYLES,
  type FrontColor,
} from "@/lib/activity-fronts";
import { marechalDisplayName } from "@/lib/marechaux";
import {
  listWeaponMasterActivityStatuses,
  setWeaponMasterActivityStatus,
  type WeaponMaster,
} from "@/lib/weapon-masters";

type ActivityLike = {
  id: string;
  name: string;
  weapon_master_count: number | null;
};

const pillClassName = (active: boolean) =>
  `rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
    active
      ? "border-primary bg-primary text-white"
      : "border-black/[.08] text-foreground/70 hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
  }`;

export default function WeaponMasterTeamPanel({
  activity,
  weaponMasters,
  canWrite,
}: {
  activity: ActivityLike;
  weaponMasters: WeaponMaster[];
  canWrite: boolean;
}) {
  const [statuses, setStatuses] = useState<
    Record<
      string,
      {
        is_available: boolean;
        is_assigned: boolean;
        is_confirmed: boolean;
        is_registered: boolean;
        front_color: string | null;
      }
    >
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    listWeaponMasterActivityStatuses(activity.id)
      .then((rows) => {
        const map: Record<
          string,
          {
            is_available: boolean;
            is_assigned: boolean;
            is_confirmed: boolean;
            is_registered: boolean;
            front_color: string | null;
          }
        > = {};
        rows.forEach((r) => {
          map[r.weapon_master_id] = {
            is_available: r.is_available,
            is_assigned: r.is_assigned,
            is_confirmed: r.is_confirmed,
            is_registered: r.is_registered,
            front_color: r.front_color,
          };
        });
        setStatuses(map);
      })
      .finally(() => setIsLoading(false));
  }, [activity.id]);

  const toggle = async (
    weaponMasterId: string,
    field: "is_available" | "is_assigned" | "is_confirmed" | "is_registered",
  ) => {
    if (!canWrite) return;
    const current = statuses[weaponMasterId] ?? {
      is_available: false,
      is_assigned: false,
      is_confirmed: false,
      is_registered: false,
      front_color: null,
    };
    const next = { ...current, [field]: !current[field] };

    if (
      field === "is_assigned" &&
      next.is_assigned &&
      activity.weapon_master_count
    ) {
      const assignedCount = Object.values(statuses).filter(
        (s) => s.is_assigned,
      ).length;
      if (assignedCount >= activity.weapon_master_count) {
        alert(
          `Le nombre de maîtres d'armes assignés (${activity.weapon_master_count}) prévu pour cette campagne est déjà atteint.`,
        );
        return;
      }
    }

    setStatuses((prev) => ({ ...prev, [weaponMasterId]: next }));
    try {
      await setWeaponMasterActivityStatus(weaponMasterId, activity.id, {
        [field]: next[field],
      });
    } catch {
      setStatuses((prev) => ({ ...prev, [weaponMasterId]: current }));
      alert("Échec de la mise à jour.");
    }
  };

  const setFront = async (weaponMasterId: string, frontColor: string) => {
    if (!canWrite) return;
    const current = statuses[weaponMasterId] ?? {
      is_available: false,
      is_assigned: false,
      is_confirmed: false,
      is_registered: false,
      front_color: null,
    };
    const next = { ...current, front_color: frontColor || null };
    setStatuses((prev) => ({ ...prev, [weaponMasterId]: next }));
    try {
      await setWeaponMasterActivityStatus(weaponMasterId, activity.id, {
        front_color: frontColor || null,
      });
    } catch {
      setStatuses((prev) => ({ ...prev, [weaponMasterId]: current }));
      alert("Échec de la mise à jour.");
    }
  };

  if (isLoading) {
    return <p className="text-sm text-foreground/60">Chargement…</p>;
  }

  if (weaponMasters.length === 0) {
    return (
      <p className="text-sm text-foreground/60">
        Aucun maître d&apos;armes — ajoutes-en depuis l&apos;onglet Maîtres
        d&apos;armes.
      </p>
    );
  }

  const assignedEmails = Array.from(
    new Set(
      weaponMasters
        .filter((wm) => statuses[wm.id]?.is_assigned && wm.player_email)
        .map((wm) => wm.player_email as string),
    ),
  );

  const handleCopyAssignedEmails = async () => {
    if (assignedEmails.length === 0) return;
    try {
      await navigator.clipboard.writeText(assignedEmails.join("; "));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      alert("Échec de la copie.");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleCopyAssignedEmails}
        disabled={assignedEmails.length === 0}
        title="Copier les courriels des maîtres d'armes assignés"
        className="flex w-fit items-center gap-1.5 rounded-full border border-black/[.08] px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[.145] dark:hover:bg-white/[.08]"
      >
        <Copy size={14} />
        {copied
          ? "Copié !"
          : `Copier les courriels des assignés (${assignedEmails.length})`}
      </button>
      {[...weaponMasters]
        .sort((a, b) =>
          marechalDisplayName(a).localeCompare(marechalDisplayName(b), "fr"),
        )
        .map((wm) => {
          const status = statuses[wm.id] ?? {
            is_available: false,
            is_assigned: false,
            is_confirmed: false,
            is_registered: false,
            front_color: null,
          };
          return (
            <div
              key={wm.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-black/[.08] p-2 dark:border-white/[.145]"
            >
              <span className="flex items-center gap-1.5 text-sm text-foreground">
                {status.front_color && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${FRONT_COLOR_STYLES[status.front_color as FrontColor]}`}
                  >
                    {status.front_color}
                  </span>
                )}
                {marechalDisplayName(wm)}
              </span>
              <div className="flex items-center gap-2">
                <select
                  value={status.front_color ?? ""}
                  onChange={(e) => setFront(wm.id, e.target.value)}
                  disabled={!canWrite}
                  className="rounded border border-black/[.08] bg-white px-2 py-1 text-xs text-foreground disabled:opacity-60 dark:border-white/[.145] dark:bg-zinc-800"
                >
                  <option value="">Front —</option>
                  {FRONT_COLORS.map((color) => (
                    <option key={color} value={color}>
                      {color}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => toggle(wm.id, "is_available")}
                  disabled={!canWrite}
                  className={`${pillClassName(status.is_available)} disabled:cursor-default`}
                >
                  Disponible
                </button>
                <button
                  type="button"
                  onClick={() => toggle(wm.id, "is_assigned")}
                  disabled={!canWrite}
                  className={`${pillClassName(status.is_assigned)} disabled:cursor-default`}
                >
                  Assigné
                </button>
                <button
                  type="button"
                  onClick={() => toggle(wm.id, "is_confirmed")}
                  disabled={!canWrite}
                  className={`${pillClassName(status.is_confirmed)} disabled:cursor-default`}
                >
                  Confirmé
                </button>
                <button
                  type="button"
                  onClick={() => toggle(wm.id, "is_registered")}
                  disabled={!canWrite}
                  className={`${pillClassName(status.is_registered)} disabled:cursor-default`}
                >
                  Inscrit
                </button>
              </div>
            </div>
          );
        })}
    </div>
  );
}
