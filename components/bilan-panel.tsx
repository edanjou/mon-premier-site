"use client";

import { Axe, BadgeCheck, Shield, Users } from "lucide-react";
import { useEffect, useState } from "react";
import RichTextEditor from "@/components/rich-text-editor";
import {
  getOrCreateBilan,
  updateBilan,
  type Bilan,
  type BilanSectionsInput,
} from "@/lib/bilans";
import { listAllDepartmentSlots, type DepartmentSlot } from "@/lib/department-slots";
import { listEscarmouches, type Escarmouche } from "@/lib/escarmouches";
import { getModuleAccessLevels } from "@/lib/features";
import {
  listGrandeBatailleChapters,
  type GrandeBatailleChapter,
} from "@/lib/grande-bataille-chapters";
import {
  listHomologationSchedules,
  type HomologationSchedule,
} from "@/lib/homologation";
import { getOwnProfile } from "@/lib/profile";
import {
  listAssignmentsForVolunteers,
  type VolunteerSlotAssignment,
} from "@/lib/volunteer-slot-assignments";
import { listVolunteers, type Volunteer } from "@/lib/volunteers";

type BilanSection = {
  key: keyof BilanSectionsInput;
  title: string;
  placeholder: string;
  heading?: string;
};

const SECTIONS: readonly BilanSection[] = [
  {
    key: "heures_approximatives",
    title: "Heures approximatives",
    placeholder: "Estimation du temps investi cette année…",
  },
  {
    key: "bons_coups",
    title: "Résumé des bons coups",
    placeholder: "Ce qui a bien fonctionné…",
  },
  {
    key: "pistes_amelioration",
    title: "Résumé des pistes d'amélioration",
    placeholder: "Ce qui pourrait être amélioré…",
  },
  {
    key: "priorites",
    title: "Priorités",
    placeholder: "Priorités pour l'an prochain…",
  },
  {
    key: "post_mortem_pre_gb",
    title: "Pré GB",
    placeholder: "Post mortem — préparation avant la Grande Bataille…",
    heading: "Post mortem détaillé",
  },
  {
    key: "post_mortem_escarmouches",
    title: "Escarmouches",
    placeholder: "Post mortem — déroulement, points à retenir…",
  },
  {
    key: "post_mortem_homologation",
    title: "Homologation",
    placeholder: "Post mortem — déroulement, points à retenir…",
  },
  {
    key: "post_mortem_grandes_batailles",
    title: "Grandes Batailles",
    placeholder: "Post mortem — déroulement, points à retenir…",
  },
  {
    key: "conclusion",
    title: "Conclusion",
    placeholder: "Conclusion générale de l'année…",
  },
  {
    key: "mot_de_la_fin",
    title: "Mot de la fin",
    placeholder: "Mot de la fin…",
  },
];

function emptySections(): BilanSectionsInput {
  return {
    heures_approximatives: "",
    bons_coups: "",
    pistes_amelioration: "",
    priorites: "",
    post_mortem_pre_gb: "",
    post_mortem_escarmouches: "",
    post_mortem_homologation: "",
    post_mortem_grandes_batailles: "",
    conclusion: "",
    mot_de_la_fin: "",
  };
}

function StatBox({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Axe;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-black/[.08] bg-black/[.02] p-3 dark:border-white/[.145] dark:bg-white/[.03]">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon size={16} />
      </span>
      <div>
        <p className="text-lg font-semibold leading-none text-foreground">
          {value}
        </p>
        <p className="text-xs text-foreground/60">{label}</p>
      </div>
    </div>
  );
}

export default function BilanPanel({
  coordinationKey,
  moduleKey,
  year,
}: {
  coordinationKey: string;
  moduleKey: string;
  year: number;
}) {
  const [bilan, setBilan] = useState<Bilan | null>(null);
  const [escarmouches, setEscarmouches] = useState<Escarmouche[]>([]);
  const [homologations, setHomologations] = useState<HomologationSchedule[]>(
    [],
  );
  const [grandesBatailleChapters, setGrandesBatailleChapters] = useState<
    GrandeBatailleChapter[]
  >([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [slots, setSlots] = useState<DepartmentSlot[]>([]);
  const [assignments, setAssignments] = useState<VolunteerSlotAssignment[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canWrite, setCanWrite] = useState(true);

  const [form, setForm] = useState<BilanSectionsInput>(emptySections());
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getOwnProfile().then((profile) => {
      if (!profile) return;
      getModuleAccessLevels(profile).then((levels) => {
        setCanWrite(levels[moduleKey] === "ecriture");
      });
    });
  }, [moduleKey]);

  const fetchAll = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const volunteerList = await listVolunteers(coordinationKey, year);
      const [
        currentBilan,
        escarmoucheList,
        homologationList,
        grandeBatailleList,
        slotList,
        assignmentList,
      ] = await Promise.all([
        getOrCreateBilan(coordinationKey, year),
        listEscarmouches(),
        listHomologationSchedules(),
        listGrandeBatailleChapters(coordinationKey, year),
        listAllDepartmentSlots(coordinationKey, year),
        listAssignmentsForVolunteers(volunteerList.map((v) => v.id)),
      ]);
      setBilan(currentBilan);
      setForm({
        heures_approximatives: currentBilan.heures_approximatives ?? "",
        bons_coups: currentBilan.bons_coups ?? "",
        pistes_amelioration: currentBilan.pistes_amelioration ?? "",
        priorites: currentBilan.priorites ?? "",
        post_mortem_pre_gb: currentBilan.post_mortem_pre_gb ?? "",
        post_mortem_escarmouches: currentBilan.post_mortem_escarmouches ?? "",
        post_mortem_homologation: currentBilan.post_mortem_homologation ?? "",
        post_mortem_grandes_batailles:
          currentBilan.post_mortem_grandes_batailles ?? "",
        conclusion: currentBilan.conclusion ?? "",
        mot_de_la_fin: currentBilan.mot_de_la_fin ?? "",
      });
      setEscarmouches(escarmoucheList);
      setHomologations(homologationList);
      setGrandesBatailleChapters(grandeBatailleList);
      setVolunteers(volunteerList);
      setSlots(slotList);
      setAssignments(assignmentList);
    } catch {
      setError("Impossible de charger le bilan.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchAll sets a loading flag ahead of an async fetch
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchAll is stable for a given coordinationKey/year
  }, [coordinationKey, year]);

  const handleSave = async () => {
    if (!bilan) return;
    setIsSaving(true);
    try {
      await updateBilan(bilan.id, form);
      await fetchAll();
    } catch {
      alert("Échec de l'enregistrement.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-foreground/60">Chargement…</p>;
  }
  if (error || !bilan) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">
        {error ?? "Impossible de charger le bilan."}
      </p>
    );
  }

  const yearPrefix = String(year);
  const escarmouchesCount = escarmouches.filter((e) =>
    e.date.startsWith(yearPrefix),
  ).length;
  const homologationCount = homologations.filter((h) =>
    h.date.startsWith(yearPrefix),
  ).length;
  const grandesBataillesCount = grandesBatailleChapters.length;
  const volontairesHeures = assignments.reduce((sum, a) => {
    const slot = slots.find((s) => s.id === a.slot_id);
    return sum + (slot?.hours ?? 0);
  }, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">
          Bilan {year}
        </h2>
        {canWrite && (
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#0c4390] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Enregistrement…" : "Enregistrer"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBox icon={Axe} label="Escarmouches" value={String(escarmouchesCount)} />
        <StatBox
          icon={BadgeCheck}
          label="Homologations"
          value={String(homologationCount)}
        />
        <StatBox
          icon={Shield}
          label="Grandes Batailles"
          value={String(grandesBataillesCount)}
        />
        <StatBox
          icon={Users}
          label={`Volontaires — ${volontairesHeures} h à ce jour`}
          value={String(volunteers.length)}
        />
      </div>

      <div className="flex flex-col gap-6">
        {SECTIONS.map((section) => (
          <div key={section.key}>
            {section.heading && (
              <h3 className="mb-3 text-lg font-semibold text-foreground">
                {section.heading}
              </h3>
            )}
            <label className="mb-1 block text-sm font-semibold text-foreground">
              {section.title}
            </label>
            <RichTextEditor
              value={form[section.key] ?? ""}
              onChange={(html) =>
                setForm((prev) => ({ ...prev, [section.key]: html }))
              }
              placeholder={section.placeholder}
              minHeight="8rem"
              readOnly={!canWrite}
            />
          </div>
        ))}
      </div>

      {canWrite && (
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="w-fit rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#0c4390] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Enregistrement…" : "Enregistrer"}
        </button>
      )}
    </div>
  );
}
