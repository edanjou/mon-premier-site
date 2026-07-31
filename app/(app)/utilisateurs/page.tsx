"use client";

import { Feather, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { glofters } from "@/app/fonts/glofters";
import { FEATURES } from "@/lib/features";
import { getOwnProfile } from "@/lib/profile";
import { supabase } from "@/lib/supabase";

type AdminUser = {
  id: string;
  email: string | null;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
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
  const [password, setPassword] = useState("");
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
      body: JSON.stringify({ email, password, firstName, lastName }),
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
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe"
          className="rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
        />
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
  onSaved: (firstName: string, lastName: string) => void;
}) {
  const [firstName, setFirstName] = useState(user.first_name ?? "");
  const [lastName, setLastName] = useState(user.last_name ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ first_name: firstName, last_name: lastName })
      .eq("id", user.id);
    setIsSaving(false);
    if (error) {
      setError("Échec de la mise à jour.");
      return;
    }
    onSaved(firstName, lastName);
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

export default function UtilisateursPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

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

  const handleTogglePermission = async (
    userId: string,
    feature: string,
    granted: boolean,
  ) => {
    await supabase
      .from("permissions")
      .upsert(
        { user_id: userId, feature, granted },
        { onConflict: "user_id,feature" },
      );
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const existing = u.permissions.find((p) => p.feature === feature);
        const nextPermissions = existing
          ? u.permissions.map((p) =>
              p.feature === feature ? { ...p, granted } : p,
            )
          : [...u.permissions, { feature, granted }];
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
      <p className="mt-2 text-foreground/70">
        Créer des comptes et gérer les permissions par fonctionnalité.
      </p>

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
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-black/[.08] text-foreground/60 dark:border-white/[.08]">
                  <th className="py-2 pr-4 font-medium">Nom</th>
                  <th className="py-2 pr-4 font-medium">Email</th>
                  <th className="py-2 pr-4 font-medium">Rôle</th>
                  {FEATURES.map((feature) => (
                    <th key={feature.key} className="py-2 pr-4 font-medium">
                      {feature.label}
                    </th>
                  ))}
                  <th className="py-2 pr-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-black/[.06] dark:border-white/[.06]"
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
                    {FEATURES.map((feature) => {
                      const granted =
                        user.permissions.find((p) => p.feature === feature.key)
                          ?.granted ?? false;
                      return (
                        <td key={feature.key} className="py-2 pr-4">
                          <input
                            type="checkbox"
                            checked={user.role === "admin" || granted}
                            disabled={user.role === "admin"}
                            onChange={(e) =>
                              handleTogglePermission(
                                user.id,
                                feature.key,
                                e.target.checked,
                              )
                            }
                            className="h-4 w-4 cursor-pointer accent-primary disabled:cursor-not-allowed"
                          />
                        </td>
                      );
                    })}
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-1">
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
                          className="rounded-full p-2 text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30 dark:text-red-400 dark:hover:bg-red-950"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
          onSaved={(firstName, lastName) => {
            setUsers((prev) =>
              prev.map((u) =>
                u.id === editingUser.id
                  ? { ...u, first_name: firstName, last_name: lastName }
                  : u,
              ),
            );
          }}
        />
      )}
    </div>
  );
}
