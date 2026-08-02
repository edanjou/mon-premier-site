"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import { supabase } from "@/lib/supabase";

export default function MonComptePage() {
  const [user, setUser] = useState<User | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [title, setTitle] = useState("");
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setEmail(data.user?.email ?? "");
      if (!data.user) return;
      supabase
        .from("profiles")
        .select("first_name, last_name, title")
        .eq("id", data.user.id)
        .single()
        .then(({ data: profile }) => {
          setFirstName(profile?.first_name ?? "");
          setLastName(profile?.last_name ?? "");
          setTitle(profile?.title ?? "");
        });
    });
  }, []);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setProfileError(null);
    setProfileMessage(null);
    setIsProfileLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: firstName,
        last_name: lastName,
        title: title || null,
      })
      .eq("id", user.id);
    setIsProfileLoading(false);
    if (error) {
      setProfileError("Impossible de mettre à jour le profil.");
      return;
    }
    setProfileMessage("Profil mis à jour.");
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setEmailMessage(null);
    setIsEmailLoading(true);
    const { error } = await supabase.auth.updateUser({ email });
    setIsEmailLoading(false);
    if (error) {
      setEmailError("Impossible de mettre à jour l'email.");
      return;
    }
    setEmailMessage(
      "Vérifie ta boîte de réception pour confirmer la nouvelle adresse.",
    );
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);

    if (password !== confirmPassword) {
      setPasswordError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 6) {
      setPasswordError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setIsPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsPasswordLoading(false);
    if (error) {
      setPasswordError("Impossible de mettre à jour le mot de passe.");
      return;
    }
    setPassword("");
    setConfirmPassword("");
    setPasswordMessage("Mot de passe mis à jour.");
  };

  return (
    <div>
      <h1 className={`${glofters.className} text-3xl text-foreground`}>
        Mon compte
      </h1>
      <Breadcrumb />

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form
          onSubmit={handleProfileSubmit}
          className="flex flex-col gap-3 rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900"
        >
          <h2 className="font-semibold text-foreground">Profil</h2>
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
          {profileError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {profileError}
            </p>
          )}
          {profileMessage && (
            <p className="text-sm text-green-600 dark:text-green-400">
              {profileMessage}
            </p>
          )}
          <button
            type="submit"
            disabled={isProfileLoading}
            className="mt-1 self-start rounded-full bg-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isProfileLoading ? "…" : "Mettre à jour le profil"}
          </button>
        </form>

        <form
          onSubmit={handleEmailSubmit}
          className="flex flex-col gap-3 rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900"
        >
          <h2 className="font-semibold text-foreground">Adresse email</h2>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
          />
          {emailError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {emailError}
            </p>
          )}
          {emailMessage && (
            <p className="text-sm text-green-600 dark:text-green-400">
              {emailMessage}
            </p>
          )}
          <button
            type="submit"
            disabled={isEmailLoading}
            className="mt-1 self-start rounded-full bg-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isEmailLoading ? "…" : "Mettre à jour l'email"}
          </button>
        </form>

        <form
          onSubmit={handlePasswordSubmit}
          className="flex flex-col gap-3 rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900"
        >
          <h2 className="font-semibold text-foreground">Mot de passe</h2>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nouveau mot de passe"
            className="rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
          />
          <input
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirmer le mot de passe"
            className="rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
          />
          {passwordError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {passwordError}
            </p>
          )}
          {passwordMessage && (
            <p className="text-sm text-green-600 dark:text-green-400">
              {passwordMessage}
            </p>
          )}
          <button
            type="submit"
            disabled={isPasswordLoading}
            className="mt-1 self-start rounded-full bg-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPasswordLoading ? "…" : "Mettre à jour le mot de passe"}
          </button>
        </form>
      </div>
    </div>
  );
}
