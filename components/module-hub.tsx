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
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import { getModuleAccessLevels, type ModuleAccessLevel } from "@/lib/features";
import { orderItems } from "@/lib/order-items";
import { getOwnProfile, type Profile } from "@/lib/profile";
import { supabase } from "@/lib/supabase";

export type HubItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  moduleKey?: string;
  disabled?: boolean;
  /** Pure navigation link to another hub (family/subsection card) — not tied
   * to a single permission module, so it's never permission-filtered on its
   * own. If `childItems` is set, visibility instead depends on whether the
   * user can access at least one of them (recursively). With no
   * `childItems`, it's always visible (e.g. "Mon compte"). */
  noGate?: boolean;
  /** The hub this item links to, for computing noGate visibility. */
  childItems?: HubItem[];
  /** Always rendered last, in the order given — excluded from drag reordering. */
  pinned?: boolean;
  /** Hidden from admins regardless of noGate/permissions (e.g. "Faire une
   * demande" — a regular-user action admins don't need). */
  hideForAdmin?: boolean;
};

export type OrderColumn =
  | "dashboard_order"
  | "campagnes_order"
  | "grande_bataille_order"
  | "combat_order";

export function moduleKeyFor(item: HubItem): string {
  if (item.moduleKey) return item.moduleKey;
  const segments = item.href.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? item.href;
}

export function isItemAllowed(
  item: HubItem,
  levels: Record<string, ModuleAccessLevel>,
  isAdmin: boolean,
): boolean {
  if (item.childItems) {
    return item.childItems.some(
      (child) => !child.disabled && isItemAllowed(child, levels, isAdmin),
    );
  }
  if (item.hideForAdmin && isAdmin) return false;
  if (item.noGate) return true;
  if (isAdmin) return true;
  return (levels[moduleKeyFor(item)] ?? "none") !== "none";
}

export function titleSizeClass(label: string): string {
  // Uniform size for everyone; only a single word genuinely too long to
  // fit (regardless of how many words wrap around it) triggers a shrink.
  const longestWord = Math.max(...label.split(/\s+/).map((w) => w.length));
  if (longestWord > 12) {
    return "text-[22px] lg:text-[14px] xl:text-[19px] 2xl:text-[24px]";
  }
  return "text-[36px] lg:text-[24px] xl:text-[30px] 2xl:text-[36px]";
}

function SortableHubCard({
  item,
  suppressClickRef,
}: {
  item: HubItem;
  suppressClickRef: React.MutableRefObject<boolean>;
}) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.href });
  const Icon = item.icon;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (!suppressClickRef.current) {
          router.push(item.href);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(item.href);
      }}
      className={`group flex cursor-grab touch-none items-center gap-3 rounded-2xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing dark:border dark:border-white/60 dark:bg-zinc-900 ${
        isDragging ? "z-10 opacity-50" : ""
      }`}
    >
      <div className="icon-badge-hover flex h-[55px] w-[55px] flex-shrink-0 items-center justify-center rounded-full bg-primary text-white">
        <Icon size={25} className="group-hover:animate-wiggle" />
      </div>
      <h2
        className={`${glofters.className} ${titleSizeClass(item.label)} line-clamp-2 min-w-0 break-words leading-[0.9] text-foreground`}
      >
        {item.label}
      </h2>
    </div>
  );
}

function PinnedHubCard({ item }: { item: HubItem }) {
  const router = useRouter();
  const Icon = item.icon;

  return (
    <div
      onClick={() => router.push(item.href)}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(item.href);
      }}
      role="button"
      tabIndex={0}
      className="group flex cursor-pointer items-center gap-3 rounded-2xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border dark:border-white/60 dark:bg-zinc-900"
    >
      <div className="icon-badge-hover flex h-[55px] w-[55px] flex-shrink-0 items-center justify-center rounded-full bg-primary text-white">
        <Icon size={25} className="group-hover:animate-wiggle" />
      </div>
      <h2
        className={`${glofters.className} ${titleSizeClass(item.label)} line-clamp-2 min-w-0 break-words leading-[0.9] text-foreground`}
      >
        {item.label}
      </h2>
    </div>
  );
}

function DisabledHubCard({ item }: { item: HubItem }) {
  const Icon = item.icon;
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-5 opacity-50 shadow-sm dark:border dark:border-white/60 dark:bg-zinc-900">
      <div className="flex h-[55px] w-[55px] flex-shrink-0 items-center justify-center rounded-full bg-foreground/20 text-foreground/60">
        <Icon size={25} />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <h2
          className={`${glofters.className} ${titleSizeClass(item.label)} line-clamp-2 min-w-0 break-words leading-[0.9] text-foreground`}
        >
          {item.label}
        </h2>
        <span className="w-fit rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-foreground/50">
          Bientôt
        </span>
      </div>
    </div>
  );
}

export default function ModuleHub({
  title,
  subtitle,
  items,
  orderColumn,
}: {
  title: string;
  subtitle?: string | null;
  items: HubItem[];
  orderColumn: OrderColumn;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeItems, setActiveItems] = useState<HubItem[]>([]);
  const [pinnedItems, setPinnedItems] = useState<HubItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const suppressClickRef = useRef(false);

  const disabledItems = items.filter((i) => i.disabled);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    getOwnProfile().then(async (p) => {
      setProfile(p);
      const levels = p ? await getModuleAccessLevels(p) : {};
      const isAdmin = p?.role === "admin";
      const available = items.filter(
        (item) =>
          !item.disabled && !item.pinned && isItemAllowed(item, levels, isAdmin),
      );
      setActiveItems(orderItems(available, p?.[orderColumn] ?? null));
      setPinnedItems(
        items.filter(
          (item) =>
            item.pinned && !item.disabled && isItemAllowed(item, levels, isAdmin),
        ),
      );
      setIsLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- items/orderColumn are stable per hub page instance
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

    setActiveItems((prev) => {
      const fromIndex = prev.findIndex((item) => item.href === active.id);
      const toIndex = prev.findIndex((item) => item.href === over.id);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const next = arrayMove(prev, fromIndex, toIndex);
      if (profile) {
        supabase
          .from("profiles")
          .update({ [orderColumn]: next.map((item) => item.href) })
          .eq("id", profile.id)
          .then();
      }
      return next;
    });
  };

  return (
    <div>
      <h1 className={`${glofters.className} text-3xl text-foreground`}>
        {title}
      </h1>
      {subtitle && <p className="mt-1 text-sm text-foreground/60">{subtitle}</p>}
      <Breadcrumb />

      {isLoading ? (
        <p className="mt-8 text-sm text-foreground/60">Chargement…</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={releaseClickSuppression}
        >
          <SortableContext
            items={activeItems.map((i) => i.href)}
            strategy={rectSortingStrategy}
          >
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {activeItems.map((item) => (
                <SortableHubCard
                  key={item.href}
                  item={item}
                  suppressClickRef={suppressClickRef}
                />
              ))}
              {disabledItems.map((item) => (
                <DisabledHubCard key={item.href} item={item} />
              ))}
              {pinnedItems.map((item) => (
                <PinnedHubCard key={item.href} item={item} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
