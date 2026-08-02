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
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Castle, LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { isItemAllowed, type HubItem } from "@/components/module-hub";
import {
  getModuleAccessLevels,
  type ModuleAccessLevel,
} from "@/lib/features";
import { hubContextFor } from "@/lib/hub-items";
import { orderItems } from "@/lib/order-items";
import { getOwnProfile, type Profile } from "@/lib/profile";
import { supabase } from "@/lib/supabase";

type IconComponent = React.ComponentType<{
  size?: number;
  className?: string;
}>;

function SidebarItem({
  href,
  label,
  icon: Icon,
  active,
  onClick,
  iconWrapperClassName,
}: {
  href?: string;
  label: string;
  icon: IconComponent;
  active?: boolean;
  onClick?: () => void;
  iconWrapperClassName?: string;
}) {
  const className = `group relative flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
    active
      ? "bg-primary text-white"
      : "text-foreground/60 hover:bg-black/[.05] dark:hover:bg-white/[.08]"
  }`;

  const iconElement = iconWrapperClassName ? (
    <span
      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${iconWrapperClassName}`}
    >
      <Icon size={16} />
    </span>
  ) : (
    <Icon size={20} className="flex-shrink-0" />
  );

  const content = (
    <>
      {iconElement}
      <span className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1 text-xs text-white opacity-0 shadow transition-opacity group-hover:opacity-100 dark:bg-zinc-700">
        {label}
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className} aria-label={label}>
        {content}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={className} aria-label={label}>
      {content}
    </button>
  );
}

function DisabledSidebarItem({ item }: { item: HubItem }) {
  const Icon = item.icon;
  return (
    <div
      className="group relative flex h-11 w-11 items-center justify-center rounded-full text-foreground/25"
      aria-label={`${item.label} (Bientôt)`}
    >
      <Icon size={20} className="flex-shrink-0" />
      <span className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1 text-xs text-white opacity-0 shadow transition-opacity group-hover:opacity-100 dark:bg-zinc-700">
        {item.label} (Bientôt)
      </span>
    </div>
  );
}

function SortableSidebarItem({
  item,
  active,
  suppressClickRef,
}: {
  item: HubItem;
  active: boolean;
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
  } = useSortable({ id: item.href });
  const Icon = item.icon;

  const className = `group relative flex h-11 w-11 touch-none items-center justify-center rounded-full transition-colors ${
    active
      ? "bg-primary text-white"
      : "text-foreground/60 hover:bg-black/[.05] dark:hover:bg-white/[.08]"
  } ${isDragging ? "z-10 opacity-50" : ""}`;

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
        if (e.key === "Enter") {
          router.push(item.href);
        }
      }}
      className={className}
      aria-label={item.label}
    >
      <Icon size={20} className="flex-shrink-0" />
      <span className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1 text-xs text-white opacity-0 shadow transition-opacity group-hover:opacity-100 dark:bg-zinc-700">
        {item.label}
      </span>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [levels, setLevels] = useState<Record<string, ModuleAccessLevel>>({});
  const suppressClickRef = useRef(false);

  const { items: contextItems, orderColumn } = hubContextFor(pathname);
  const isAdmin = profile?.role === "admin";

  const disabledItems = contextItems.filter((item) => item.disabled);
  const moduleItems = orderItems(
    contextItems.filter(
      (item) =>
        !item.disabled && !item.pinned && isItemAllowed(item, levels, isAdmin),
    ),
    profile?.[orderColumn] ?? null,
  );
  const pinnedItems = contextItems.filter(
    (item) =>
      item.pinned && !item.disabled && isItemAllowed(item, levels, isAdmin),
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/");
        return;
      }
      setIsChecking(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) router.replace("/");
      },
    );
    return () => listener.subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    if (isChecking) return;
    getOwnProfile().then(async (p) => {
      setProfile(p);
      setLevels(p ? await getModuleAccessLevels(p) : {});
    });
  }, [isChecking]);

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
    if (!over || active.id === over.id || !profile) return;

    const fromIndex = moduleItems.findIndex((item) => item.href === active.id);
    const toIndex = moduleItems.findIndex((item) => item.href === over.id);
    if (fromIndex === -1 || toIndex === -1) return;
    const next = arrayMove(moduleItems, fromIndex, toIndex);
    const nextHrefs = next.map((item) => item.href);
    setProfile({ ...profile, [orderColumn]: nextHrefs });
    supabase
      .from("profiles")
      .update({ [orderColumn]: nextHrefs })
      .eq("id", profile.id)
      .then();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  if (isChecking) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background">
        <p className="text-sm text-foreground/60">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 bg-background p-4">
      <div className="flex w-20 flex-shrink-0 items-center justify-center">
        <Image
          src="/bicolline.svg"
          alt="Logo Bicolline"
          width={60}
          height={60}
          className="h-[60px] w-[60px]"
        />
      </div>

      <div className="flex flex-1 gap-6">
        <aside className="flex w-20 flex-shrink-0 flex-col items-center gap-2 rounded-[28px] bg-white py-6 shadow-sm dark:bg-zinc-900">
          <div className="flex w-full flex-col items-center gap-2">
            <SidebarItem
              href="/tableau-de-bord"
              label="Tableau de bord"
              icon={Castle}
              active={pathname === "/tableau-de-bord"}
            />
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={releaseClickSuppression}
            >
              <SortableContext
                items={moduleItems.map((item) => item.href)}
                strategy={verticalListSortingStrategy}
              >
                {moduleItems.map((item) => (
                  <SortableSidebarItem
                    key={item.href}
                    item={item}
                    active={pathname === item.href}
                    suppressClickRef={suppressClickRef}
                  />
                ))}
              </SortableContext>
            </DndContext>
            {disabledItems.map((item) => (
              <DisabledSidebarItem key={item.href} item={item} />
            ))}
            {pinnedItems.map((item) => (
              <SidebarItem
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={pathname === item.href}
              />
            ))}
          </div>

          <div className="mt-auto flex w-full flex-col items-center gap-2">
            <SidebarItem
              label="Se déconnecter"
              icon={LogOut}
              onClick={handleSignOut}
            />
          </div>
        </aside>

        <main className="flex flex-1 flex-col overflow-y-auto px-8 py-6">
          <div className="flex-1">{children}</div>
          <footer className="mt-8 text-right text-xs text-foreground/40">
            Outil développé par Eric D&apos;Anjou
          </footer>
        </main>
      </div>
    </div>
  );
}
