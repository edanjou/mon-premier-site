"use client";

import { Feather, KeyRound, Mail, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import { Pagination, usePagination } from "@/components/pagination";
import { sendPasswordResetEmail } from "@/lib/auth-email";
import {
  collectModules,
  ecritureKey,
  moduleAccessLevel,
  PERMISSION_TREE,
  type ModuleAccessLevel,
  type ModuleDefinition,
  type PermissionTreeNode,
} from "@/lib/features";
import { getOwnProfile } from "@/lib/profile";
import { supabase } from "@/lib/supabase";

type AdminUser = {
  id: string;
  email: string | null;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  role: "admin" | "user";
  permissions: { feature: string; granted: boolean }[];
};

async function getAuthToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function CreateUserModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setIsCreating(true);

    const token = await getAuthToken();
    if (!token) {
      setCreateError("Session expirée.");
      setIsCreating(false);
      return;
    }

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email, firstName, lastName }),
    });
    const body = await res.json();
    setIsCreating(false);

    if (!res.ok) {
      setCreateError(body.error ?? "Échec de la création.");
      return;
    }

    await onCreated();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-sm flex-col gap-3 rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900"
      >
        <h2 className="font-semibold text-foreground">Créer un utilisateur</h2>
        <input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Prénom"
          className="rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
        />
        <input
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Nom"
          className="rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
        />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
        />
        <p className="text-xs text-foreground/50">
          Un mot de passe sécuritaire est généré automatiquement. Utilise le
          bouton &quot;Envoyer le lien&quot; dans la liste, une fois les
          permissions attribuées, pour que la personne définisse le sien.
        </p>
        {createError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {createError}
          </p>
        )}
        <div className="mt-1 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isCreating}
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCreating ? "…" : "Créer"}
          </button>
        </div>
      </form>
    </div>
  );
}

function EditUserModal({
  user,
  onClose,
  onSaved,
}: {
  user: AdminUser;
  onClose: () => void;
  onSaved: (firstName: string, lastName: string, title: string) => void;
}) {
  const [firstName, setFirstName] = useState(user.first_name ?? "");
  const [lastName, setLastName] = useState(user.last_name ?? "");
  const [title, setTitle] = useState(user.title ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: firstName,
        last_name: lastName,
        title: title || null,
      })
      .eq("id", user.id);
    setIsSaving(false);
    if (error) {
      setError("Échec de la mise à jour.");
      return;
    }
    onSaved(firstName, lastName, title);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-sm flex-col gap-3 rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900"
      >
        <h2 className="font-semibold text-foreground">Modifier {user.email}</h2>
        <input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Prénom"
          className="rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
        />
        <input
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Nom"
          className="rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
        />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titre (ex. Maréchal en chef)"
          className="rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
        />
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        <div className="mt-1 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PermissionTreeRow({
  node,
  depth,
  granted,
  isAdmin,
  onSetLevel,
}: {
  node: PermissionTreeNode;
  depth: number;
  granted: Set<string>;
  isAdmin: boolean;
  onSetLevel: (mod: ModuleDefinition, level: ModuleAccessLevel) => void;
}) {
  const indent = { paddingLeft: `${depth * 20}px` };

  if (node.type === "leaf") {
    const mod = node.module;
    const level = isAdmin ? "ecriture" : moduleAccessLevel(mod, granted);
    return (
      <div
        style={indent}
        className="flex items-center justify-between gap-2 py-1.5 text-sm text-foreground"
      >
        <span>{mod.label}</span>
        <select
          value={level}
          disabled={isAdmin}
          onChange={(e) =>
            onSetLevel(mod, e.target.value as ModuleAccessLevel)
          }
          className="rounded border border-black/[.08] bg-white px-2 py-1 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[.145] dark:bg-zinc-800"
        >
          <option value="none">Aucun accès</option>
          <option value="lecture">Lecture</option>
          <option value="ecriture">Écriture</option>
        </select>
      </div>
    );
  }

  const mods = collectModules(node);
  const grantedCount = isAdmin
    ? mods.length
    : mods.filter((m) => moduleAccessLevel(m, granted) === "ecriture").length;
  const allGranted = grantedCount === mods.length;
  const noneGranted = grantedCount === 0;

  return (
    <div>
      <label
        style={indent}
        className="flex items-center gap-2 py-1.5 text-sm font-semibold text-foreground"
      >
        <input
          type="checkbox"
          checked={allGranted}
          disabled={isAdmin}
          ref={(el) => {
            if (el) el.indeterminate = !allGranted && !noneGranted;
          }}
          onChange={(e) =>
            mods.forEach((mod) =>
              onSetLevel(mod, e.target.checked ? "ecriture" : "none"),
            )
          }
          className="h-4 w-4 cursor-pointer accent-primary disabled:cursor-not-allowed"
        />
        {node.label}
      </label>
      {node.children.map((child, index) => (
        <PermissionTreeRow
          key={index}
          node={child}
          depth={depth + 1}
          granted={granted}
          isAdmin={isAdmin}
          onSetLevel={onSetLevel}
        />
      ))}
    </div>
  );
}

function PermissionsModal({
  user,
  onClose,
  onSetLevel,
}: {
  user: AdminUser;
  onClose: () => void;
  onSetLevel: (mod: ModuleDefinition, level: ModuleAccessLevel) => void;
}) {
  const granted = new Set(
    user.permissions.filter((p) => p.granted).map((p) => p.feature),
  );
  const isAdmin = user.role === "admin";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">
            Accès — {user.email}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full p-1 hover:bg-black/[.04] dark:hover:bg-white/[.08]"
          >
            <X size={20} />
          </button>
        </div>
        {isAdmin && (
          <p className="text-xs text-foreground/50">
            Cet utilisateur est admin : accès complet à tout, non modifiable
            ici.
          </p>
        )}
        <div className="flex flex-col divide-y divide-black/[.06] dark:divide-white/[.06]">
          {PERMISSION_TREE.map((node, index) => (
            <PermissionTreeRow
              key={index}
              node={node}
              depth={0}
              granted={granted}
              isAdmin={isAdmin}
              onSetLevel={onSetLevel}
            />
          ))}
        </div>
        <div className="mt-1 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390]"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UtilisateursPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [permissionsUserId, setPermissionsUserId] = useState<string | null>(
    null,
  );
  const [sendingLinkId, setSendingLinkId] = useState<string | null>(null);

  useEffect(() => {
    getOwnProfile().then((profile) => {
      if (!profile || profile.role !== "admin") {
        router.replace("/tableau-de-bord");
        return;
      }
      setCurrentUserId(profile.id);
      setIsChecking(false);
    });
  }, [router]);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    setListError(null);
    const token = await getAuthToken();
    if (!token) {
      setListError("Session expirée.");
      setIsLoadingUsers(false);
      return;
    }

    const res = await fetch("/api/admin/users", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    setIsLoadingUsers(false);
    if (!res.ok) {
      setListError(body.error ?? "Impossible de charger les utilisateurs.");
      return;
    }
    setUsers(body.users);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchUsers sets a loading flag ahead of an async fetch
    if (!isChecking) fetchUsers();
  }, [isChecking]);

  const handleRoleChange = async (userId: string, role: "admin" | "user") => {
    await supabase.from("profiles").update({ role }).eq("id", userId);
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
  };

  const handleSetModuleLevel = async (
    userId: string,
    mod: ModuleDefinition,
    level: ModuleAccessLevel,
  ) => {
    const eKey = ecritureKey(mod.key);
    await Promise.all([
      supabase
        .from("permissions")
        .upsert(
          { user_id: userId, feature: mod.key, granted: level !== "none" },
          { onConflict: "user_id,feature" },
        ),
      supabase
        .from("permissions")
        .upsert(
          { user_id: userId, feature: eKey, granted: level === "ecriture" },
          { onConflict: "user_id,feature" },
        ),
    ]);
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const nextPermissions = u.permissions
          .filter((p) => p.feature !== mod.key && p.feature !== eKey)
          .concat([
            { feature: mod.key, granted: level !== "none" },
            { feature: eKey, granted: level === "ecriture" },
          ]);
        return { ...u, permissions: nextPermissions };
      }),
    );
  };

  const handleDelete = async (user: AdminUser) => {
    if (
      !window.confirm(
        `Supprimer définitivement le compte ${user.email} ? Cette action est irréversible.`,
      )
    ) {
      return;
    }

    const token = await getAuthToken();
    if (!token) return;

    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const body = await res.json();
      alert(body.error ?? "Échec de la suppression.");
      return;
    }

    setUsers((prev) => prev.filter((u) => u.id !== user.id));
  };

  const handleSendResetLink = async (user: AdminUser) => {
    if (!user.email) return;
    setSendingLinkId(user.id);
    const { error } = await sendPasswordResetEmail(user.email);
    setSendingLinkId(null);
    if (error) {
      alert("Échec de l'envoi du lien.");
      return;
    }
    alert(`Lien envoyé à ${user.email}.`);
  };

  const { page, pageCount, setPage, pageItems } = usePagination(users);
  const permissionsUser =
    users.find((u) => u.id === permissionsUserId) ?? null;

  if (isChecking) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-foreground/60">Chargement…</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className={`${glofters.className} text-3xl text-foreground`}>
        Utilisateurs
      </h1>
      <Breadcrumb />

      <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Comptes existants</h2>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390]"
          >
            <Plus size={16} />
            Créer un utilisateur
          </button>
        </div>

        {isLoadingUsers && (
          <p className="text-sm text-foreground/60">Chargement…</p>
        )}
        {listError && (
          <p className="text-sm text-red-600 dark:text-red-400">{listError}</p>
        )}

        {!isLoadingUsers && !listError && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="border-b border-black/[.08] text-foreground/60 dark:border-white/[.08]">
                  <th className="py-2 pr-4 font-medium">Nom</th>
                  <th className="py-2 pr-4 font-medium">Email</th>
                  <th className="py-2 pr-4 font-medium">Rôle</th>
                  <th className="py-2 pr-4 font-medium">Accès</th>
                  <th className="py-2 pr-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-black/[.06] odd:bg-black/[.015] dark:border-white/[.06] dark:odd:bg-white/[.03]"
                  >
                    <td className="py-2 pr-4 text-foreground">
                      {[user.first_name, user.last_name]
                        .filter(Boolean)
                        .join(" ") || "—"}
                    </td>
                    <td className="py-2 pr-4 text-foreground/80">
                      {user.email}
                    </td>
                    <td className="py-2 pr-4">
                      <select
                        value={user.role}
                        onChange={(e) =>
                          handleRoleChange(
                            user.id,
                            e.target.value as "admin" | "user",
                          )
                        }
                        className="rounded border border-black/[.08] bg-white px-2 py-1 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
                      >
                        <option value="user">Utilisateur</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="py-2 pr-4">
                      <button
                        type="button"
                        onClick={() => setPermissionsUserId(user.id)}
                        className="flex items-center gap-1.5 rounded-full border border-black/[.08] px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-white/[.08]"
                      >
                        <KeyRound size={14} />
                        {user.role === "admin" ? "Accès complet" : "Gérer"}
                      </button>
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleSendResetLink(user)}
                          disabled={sendingLinkId === user.id}
                          aria-label="Envoyer le lien pour définir le mot de passe"
                          title="Envoyer le lien pour définir le mot de passe"
                          className="rounded-full p-2 text-foreground/60 transition-colors hover:bg-black/[.05] disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/[.08]"
                        >
                          <Mail size={16} />
                        </button>
                        <button
                          onClick={() => setEditingUser(user)}
                          aria-label="Modifier"
                          className="rounded-full p-2 text-foreground/60 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
                        >
                          <Feather size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          disabled={user.id === currentUserId}
                          aria-label="Supprimer"
                          className="rounded-full p-2 text-foreground/60 transition-colors hover:bg-black/[.05] disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-white/[.08]"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={page}
              pageCount={pageCount}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {isCreateOpen && (
        <CreateUserModal
          onClose={() => setIsCreateOpen(false)}
          onCreated={fetchUsers}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={(firstName, lastName, title) => {
            setUsers((prev) =>
              prev.map((u) =>
                u.id === editingUser.id
                  ? { ...u, first_name: firstName, last_name: lastName, title }
                  : u,
              ),
            );
          }}
        />
      )}

      {permissionsUser && (
        <PermissionsModal
          user={permissionsUser}
          onClose={() => setPermissionsUserId(null)}
          onSetLevel={(mod, level) =>
            handleSetModuleLevel(permissionsUser.id, mod, level)
          }
        />
      )}
    </div>
  );
}
