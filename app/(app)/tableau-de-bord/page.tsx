"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Axe,
  BadgeCheck,
  ChessKnight,
  MapPinned,
  PocketKnife,
  ScrollText,
  Shield,
  Swords,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { glofters } from "@/app/fonts/glofters";
import KingIcon from "@/components/king-icon";
import { getModuleAccessLevels } from "@/lib/features";
import { orderItems } from "@/lib/order-items";
import { getOwnProfile } from "@/lib/profile";
import { supabase } from "@/lib/supabase";

type ModuleItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const ALL_MODULES: ModuleItem[] = [
  { href: "/editeur-carte", label: "Éditeur de carte", icon: MapPinned },
  { href: "/activites", label: "Campagnes", icon: Swords },
  { href: "/grandes-batailles", label: "Grandes Batailles", icon: Shield },
  { href: "/escarmouches", label: "Escarmouches", icon: Axe },
  { href: "/scenarios", label: "Scénarios", icon: ScrollText },
  { href: "/jeu", label: "Jeu", icon: ChessKnight },
  { href: "/homologation", label: "Homologation", icon: BadgeCheck },
  { href: "/marechaux", label: "Maréchaux", icon: PocketKnife },
  { href: "/utilisateurs", label: "Utilisateurs", icon: KingIcon },
];

function SortableModuleCard({
  module,
  suppressClickRef,
}: {
  module: ModuleItem;
  suppressClickRef: React.MutableRefObject<boolean>;
}) {
  const router = useRouter();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.href });
  const Icon = module.icon;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (!suppressClickRef.current) {
          router.push(module.href);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          router.push(module.href);
        }
      }}
      className={`group flex cursor-grab touch-none items-center gap-3 rounded-2xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing dark:bg-zinc-900 ${
        isDragging ? "z-10 opacity-50" : ""
      }`}
    >
      <div className="icon-badge-hover flex h-[55px] w-[55px] flex-shrink-0 items-center justify-center rounded-full bg-primary text-white">
        <Icon size={25} className="group-hover:animate-wiggle" />
      </div>
      <h2
        className={`${glofters.className} translate-y-[4px] text-[36px] leading-none text-foreground`}
      >
        {module.label}
      </h2>
    </div>
  );
}

export default function DashboardPage() {
  const [firstName, setFirstName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const suppressClickRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    getOwnProfile().then(async (profile) => {
      setFirstName(profile?.first_name ?? null);
      setUserId(profile?.id ?? null);
      const levels = profile ? await getModuleAccessLevels(profile) : {};
      const available = ALL_MODULES.filter((m) => {
        if (m.href === "/utilisateurs") return profile?.role === "admin";
        if (profile?.role === "admin") return true;
        const moduleKey = m.href.slice(1);
        return (levels[moduleKey] ?? "none") !== "none";
      });
      setModules(orderItems(available, profile?.dashboard_order ?? null));
    });
  }, []);

  const handleDragStart = () => {
    suppressClickRef.current = true;
  };

  const releaseClickSuppression = () => {
    requestAnimationFrame(() => {
      suppressClickRef.current = false;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    releaseClickSuppression();
    if (!over || active.id === over.id) return;

    setModules((prev) => {
      const fromIndex = prev.findIndex((m) => m.href === active.id);
      const toIndex = prev.findIndex((m) => m.href === over.id);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const next = arrayMove(prev, fromIndex, toIndex);
      if (userId) {
        supabase
          .from("profiles")
          .update({ dashboard_order: next.map((m) => m.href) })
          .eq("id", userId)
          .then();
      }
      return next;
    });
  };

  return (
    <div>
      <h1 className={`${glofters.className} text-3xl text-foreground`}>
        Bonjour{firstName ? ` ${firstName}` : ""}
      </h1>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={releaseClickSuppression}
      >
        <SortableContext
          items={modules.map((m) => m.href)}
          strategy={rectSortingStrategy}
        >
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((module) => (
              <SortableModuleCard
                key={module.href}
                module={module}
                suppressClickRef={suppressClickRef}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
