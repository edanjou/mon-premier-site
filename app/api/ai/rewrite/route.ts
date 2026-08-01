import { generateText } from "ai";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";

const MAX_TEXT_LENGTH = 4000;

const SYSTEM_PROMPT =
  "Tu es un assistant de rédaction pour un site francophone de coordination d'événements de jeu de rôle grandeur nature (LARP). " +
  "On te donne un extrait de texte : reformule-le pour améliorer la clarté, la grammaire et le style, sans changer son sens ni sa langue. " +
  "Réponds uniquement avec le texte reformulé, sans commentaire, introduction ni guillemets.";

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if (!auth) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const body = await request.json();
  const { text } = body as { text?: string };

  if (!text || !text.trim()) {
    return NextResponse.json({ error: "Texte requis." }, { status: 400 });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: "Texte trop long pour la reformulation." },
      { status: 400 },
    );
  }

  try {
    const { text: result } = await generateText({
      model: "anthropic/claude-haiku-4.5",
      system: SYSTEM_PROMPT,
      prompt: text,
    });
    return NextResponse.json({ result: result.trim() });
  } catch {
    return NextResponse.json(
      { error: "Échec de la reformulation par l'IA." },
      { status: 502 },
    );
  }
}
