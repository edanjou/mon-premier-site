"use client";

import { Copy, Flag } from "lucide-react";
import { useEffect, useState } from "react";
import { listMarechalActivityStatuses, marechalDisplayName, setMarechalActivityStatus, type Marechal } from "@/lib/marechaux";

type ActivityLike = {
  id: string;
  name: string;
  marshal_count: number | null;
  campaign_team_count: number | null;
};

const pillClassName = (active: boolean) =>
  `rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
    active
      ? "border-primary bg-primary text-white"
      : "border-black/[.08] text-foreground/70 hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
  }`;

export default function MarechalTeamPanel({
  activity,
  marechaux,
  canWrite,
}: {
  activity: ActivityLike;
  marechaux: Marechal[];
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
      }
    >
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    listMarechalActivityStatuses(activity.id)
      .then((rows) => {
        const map: Record<
          string,
          {
            is_available: boolean;
            is_assigned: boolean;
            is_confirmed: boolean;
            is_registered: boolean;
          }
        > = {};
        rows.forEach((r) => {
          map[r.marechal_id] = {
            is_available: r.is_available,
            is_assigned: r.is_assigned,
            is_confirmed: r.is_confirmed,
            is_registered: r.is_registered,
          };
        });
        setStatuses(map);
      })
      .finally(() => setIsLoading(false));
  }, [activity.id]);

  const toggle = async (
    marechalId: string,
    field: "is_available" | "is_assigned" | "is_confirmed" | "is_registered",
  ) => {
    if (!canWrite) return;
    const current = statuses[marechalId] ?? {
      is_available: false,
      is_assigned: false,
      is_confirmed: false,
      is_registered: false,
    };
    const next = { ...current, [field]: !current[field] };

    if (field === "is_assigned" && next.is_assigned) {
      const marechal = marechaux.find((m) => m.id === marechalId);
      const isCampaignTeam = marechal?.is_campaign_team ?? false;

      if (isCampaignTeam && activity.campaign_team_count) {
        const campaignAssignedCount = marechaux.filter(
          (m) => m.is_campaign_team && statuses[m.id]?.is_assigned,
        ).length;
        if (campaignAssignedCount >= activity.campaign_team_count) {
          alert(
            `Le nombre de membres de l'équipe campagne (${activity.campaign_team_count}) prévu pour cette campagne est déjà atteint.`,
          );
          return;
        }
      } else if (!isCampaignTeam && activity.marshal_count) {
        const marshalAssignedCount = marechaux.filter(
          (m) => !m.is_campaign_team && statuses[m.id]?.is_assigned,
        ).length;
        if (marshalAssignedCount >= activity.marshal_count) {
          alert(
            `Le nombre de maréchaux assignés (${activity.marshal_count}) prévu pour cette campagne est déjà atteint.`,
          );
          return;
        }
      }
    }

    setStatuses((prev) => ({ ...prev, [marechalId]: next }));
    try {
      await setMarechalActivityStatus(marechalId, activity.id, {
        [field]: next[field],
      });
    } catch {
      setStatuses((prev) => ({ ...prev, [marechalId]: current }));
      alert("Échec de la mise à jour.");
    }
  };

  if (isLoading) {
    return <p className="text-sm text-foreground/60">Chargement…</p>;
  }

  if (marechaux.length === 0) {
    return (
      <p className="text-sm text-foreground/60">
        Aucun maréchal — ajoutes-en depuis l&apos;onglet Maréchaux.
      </p>
    );
  }

  const assignedEmails = Array.from(
    new Set(
      marechaux
        .filter(
          (m) =>
            statuses[m.id]?.is_assigned &&
            !m.is_campaign_team &&
            m.player_email,
        )
        .map((m) => m.player_email as string),
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
        title="Copier les courriels des maréchaux assignés"
        className="flex w-fit items-center gap-1.5 rounded-full border border-black/[.08] px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[.145] dark:hover:bg-white/[.08]"
      >
        <Copy size={14} />
        {copied
          ? "Copié !"
          : `Copier les courriels des assignés (${assignedEmails.length})`}
      </button>
      {[...marechaux]
        .sort((a, b) =>
          marechalDisplayName(a).localeCompare(marechalDisplayName(b), "fr"),
        )
        .map((m) => {
          const status = statuses[m.id] ?? {
            is_available: false,
            is_assigned: false,
            is_confirmed: false,
            is_registered: false,
          };
          return (
            <div
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-black/[.08] p-2 dark:border-white/[.145]"
            >
              <span className="flex items-center gap-1.5 text-sm text-foreground">
                {m.is_campaign_team && (
                  <Flag
                    size={14}
                    className="text-primary"
                    aria-label="Équipe campagne"
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
                <button
                  type="button"
                  onClick={() => toggle(m.id, "is_confirmed")}
                  disabled={!canWrite}
                  className={`${pillClassName(status.is_confirmed)} disabled:cursor-default`}
                >
                  Confirmé
                </button>
                <button
                  type="button"
                  onClick={() => toggle(m.id, "is_registered")}
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
