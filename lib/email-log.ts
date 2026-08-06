export type EmailLogStatus = "sent" | "failed";

export type EmailLogEntry = {
  to: string;
  subject: string;
  status: EmailLogStatus;
  error?: string | null;
};

export type EmailLogRecord = {
  id: string;
  to_email: string;
  subject: string;
  status: EmailLogStatus;
  error: string | null;
  created_at: string;
};

// Fire-and-forget: a logging failure must never block the email send itself.
export async function logEmail(entry: EmailLogEntry): Promise<void> {
  try {
    await fetch("/api/email-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
  } catch {
    // Ignoré volontairement — le journal est secondaire par rapport à l'envoi.
  }
}

export async function listEmailLog(token: string | null): Promise<EmailLogRecord[]> {
  const res = await fetch("/api/admin/email-log", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Impossible de charger le journal des courriels.");
  const data = await res.json();
  return data.entries ?? [];
}
