import { logEmail } from "@/lib/email-log";
import { supabase } from "@/lib/supabase";

export async function sendPasswordResetEmail(
  email: string,
): Promise<{ error: Error | null }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  await logEmail({
    to: email,
    subject: "Réinitialisation du mot de passe",
    status: error ? "failed" : "sent",
    error: error?.message ?? null,
  });

  return { error };
}
