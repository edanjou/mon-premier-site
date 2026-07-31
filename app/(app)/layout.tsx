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
import {
  Castle,
  ChessKnight,
  Crown,
  Hammer,
  LogOut,
  Scroll,
  ShieldUser,
  Swords,
  UserRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { orderItems } from "@/lib/order-items";
import { getOwnProfile } from "@/lib/profile";
import { supabase } from "@/lib/supabase";

type IconComponent = React.ComponentType<{
  size?: number;
  className?: string;
}>;

function KingIcon({
  size = 20,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`relative inline-flex items-center justify-center ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      <UserRound size={size} />
      <Crown
        size={Math.round(size * 0.55)}
        className="absolute -top-1 left-1/2 -translate-x-1/2"
      />
    </span>
  );
}

type NavItem = {
  href: string;
  label: string;
  icon: IconComponent;
};

const ALL_MODULE_ITEMS: NavItem[] = [
  { href: "/editeur-carte", label: "Éditeur de carte", icon: Scroll },
  { href: "/activites", label: "Activités", icon: Swords },
  { href: "/jeu", label: "Jeu", icon: ChessKnight },
  { href: "/utilisateurs", label: "Utilisateurs", icon: KingIcon },
];

const BOTTOM_NAV_ITEMS = [
  { href: "/parametres", label: "Paramètres", icon: Hammer },
  { href: "/mon-compte", label: "Mon compte", icon: ShieldUser },
];

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
      <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1 text-xs text-white opacity-0 shadow transition-opacity group-hover:opacity-100 dark:bg-zinc-700">
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

function SortableSidebarItem({
  item,
  active,
  suppressClickRef,
}: {
  item: NavItem;
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
      <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1 text-xs text-white opacity-0 shadow transition-opacity group-hover:opacity-100 dark:bg-zinc-700">
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
  const [userId, setUserId] = useState<string | null>(null);
  const [moduleItems, setModuleItems] = useState<NavItem[]>([]);
  const suppressClickRef = useRef(false);

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
    getOwnProfile().then((profile) => {
      setUserId(profile?.id ?? null);
      const available =
        profile?.role === "admin"
          ? ALL_MODULE_ITEMS
          : ALL_MODULE_ITEMS.filter((item) => item.href !== "/utilisateurs");
      setModuleItems(orderItems(available, profile?.sidebar_order ?? null));
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
    if (!over || active.id === over.id) return;

    setModuleItems((prev) => {
      const fromIndex = prev.findIndex((item) => item.href === active.id);
      const toIndex = prev.findIndex((item) => item.href === over.id);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const next = arrayMove(prev, fromIndex, toIndex);
      if (userId) {
        supabase
          .from("profiles")
          .update({ sidebar_order: next.map((item) => item.href) })
          .eq("id", userId)
          .then();
      }
      return next;
    });
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
          </div>

          <div className="mt-auto flex w-full flex-col items-center gap-2">
            {BOTTOM_NAV_ITEMS.map((item) => (
              <SidebarItem
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={pathname === item.href}
              />
            ))}
            <SidebarItem
              label="Se déconnecter"
              icon={LogOut}
              onClick={handleSignOut}
            />
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto px-8 py-6">{children}</main>
      </div>
    </div>
  );
}
