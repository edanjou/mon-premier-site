"use client";

import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      },
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);

    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setIsLoading(false);
      if (error) {
        setError("Impossible d'envoyer l'email de réinitialisation.");
        return;
      }
      setMessage("Email envoyé. Vérifie ta boîte de réception.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setIsLoading(false);
    if (error) {
      setError("Email ou mot de passe incorrect.");
      return;
    }
    setPassword("");
    router.push("/tableau-de-bord");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (user) {
    return (
      <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-xl border border-black/[.08] bg-white p-6 text-center dark:border-white/[.145] dark:bg-zinc-900">
        <p className="text-sm text-foreground/70">Connecté en tant que</p>
        <p className="font-medium text-foreground">{user.email}</p>
        <Link
          href="/tableau-de-bord"
          className="mt-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390]"
        >
          Aller au tableau de bord
        </Link>
        <button
          onClick={handleSignOut}
          className="rounded-full border border-black/[.08] px-5 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
        >
          Se déconnecter
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-sm flex-col gap-3 rounded-xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-zinc-900"
    >
      <input
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
      />
      {mode === "login" && (
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe"
          className="rounded border border-black/[.08] bg-white px-3 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-800"
        />
      )}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {message && (
        <p className="text-sm text-green-600 dark:text-green-400">
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={isLoading}
        className="mt-1 self-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading
          ? "…"
          : mode === "login"
            ? "Se connecter"
            : "Envoyer le lien"}
      </button>
      <button
        type="button"
        onClick={() => {
          setMode(mode === "login" ? "forgot" : "login");
          setError(null);
          setMessage(null);
        }}
        className="link-button text-xs text-foreground/60 hover:underline"
      >
        {mode === "login"
          ? "Mot de passe oublié ?"
          : "Retour à la connexion"}
      </button>
    </form>
  );
}
