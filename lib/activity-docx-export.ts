import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type IParagraphOptions,
} from "docx";
import { FRONT_COLORS, type FrontAssignments } from "@/lib/activity-fronts";

type RunStyle = {
  bold?: boolean;
  italics?: boolean;
  underline?: Record<string, never>;
  strike?: boolean;
};

function collectRuns(node: Element, style: RunStyle): TextRun[] {
  const runs: TextRun[] = [];
  node.childNodes.forEach((child) => {
    if (child.nodeType === 3) {
      const text = child.textContent ?? "";
      if (text) runs.push(new TextRun({ text, ...style }));
      return;
    }
    if (child.nodeType !== 1) return;
    const el = child as Element;
    const tag = el.tagName.toLowerCase();
    if (tag === "br") {
      runs.push(new TextRun({ text: "", break: 1 }));
      return;
    }
    const nextStyle: RunStyle = { ...style };
    if (tag === "strong" || tag === "b") nextStyle.bold = true;
    if (tag === "em" || tag === "i") nextStyle.italics = true;
    if (tag === "u") nextStyle.underline = {};
    if (tag === "s" || tag === "strike" || tag === "del")
      nextStyle.strike = true;
    runs.push(...collectRuns(el, nextStyle));
  });
  return runs;
}

function blockParagraph(
  el: Element,
  extra: Omit<IParagraphOptions, "children" | "text"> = {},
) {
  const runs = collectRuns(el, {});
  return new Paragraph({
    children: runs.length ? runs : [new TextRun("")],
    ...extra,
  });
}

function htmlToParagraphs(html: string | null | undefined): Paragraph[] {
  if (!html) return [];
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const paragraphs: Paragraph[] = [];

  Array.from(parsed.body.children).forEach((el) => {
    const tag = el.tagName.toLowerCase();

    if (tag === "ul" || tag === "ol") {
      Array.from(el.children).forEach((li, index) => {
        if (li.tagName.toLowerCase() !== "li") return;
        if (tag === "ul") {
          paragraphs.push(blockParagraph(li, { bullet: { level: 0 } }));
        } else {
          const runs = collectRuns(li, {});
          paragraphs.push(
            new Paragraph({
              children: [new TextRun(`${index + 1}. `), ...runs],
              indent: { left: 360 },
            }),
          );
        }
      });
      return;
    }

    if (tag === "blockquote") {
      paragraphs.push(blockParagraph(el, { indent: { left: 720 } }));
      return;
    }

    if (/^h[1-6]$/.test(tag)) {
      const level = Number(tag[1]);
      const heading =
        level === 1
          ? HeadingLevel.HEADING_1
          : level === 2
            ? HeadingLevel.HEADING_2
            : HeadingLevel.HEADING_3;
      paragraphs.push(blockParagraph(el, { heading }));
      return;
    }

    paragraphs.push(blockParagraph(el));
  });

  return paragraphs;
}

function heading(
  text: string,
  level: (typeof HeadingLevel)[keyof typeof HeadingLevel],
) {
  return new Paragraph({
    text,
    heading: level,
    spacing: { before: 240, after: 120 },
  });
}

function textCell(text: string) {
  return new TableCell({
    children: [new Paragraph(text)],
    width: { size: 33, type: WidthType.PERCENTAGE },
  });
}

export type ExportScheduleRow = {
  label: string;
  startTime: string;
  duration: string;
  isChapter: boolean;
};

export type ExportFrontInfo = {
  color: string;
  guilds: string;
  organizers: string;
};

export type ActivityExportData = {
  name: string;
  date: string;
  gameText: string;
  registrationParticipantsPricing: string;
  registrationParticipantsHowto: string;
  fronts: ExportFrontInfo[];
  registrationNonParticipantsPricing: string;
  registrationNonParticipantsHowto: string;
  scheduleIntro: string;
  schedule: ExportScheduleRow[];
  scheduleOutro: string;
  gameSecurity: string;
  gameStaff: string;
  gameRewards: string;
  gameRules: string;
  gameDeathHealing: string;
  gameVaria: string;
  contactInfo: string;
};

function section(title: string, html: string): Paragraph[] {
  const paragraphs = htmlToParagraphs(html);
  if (paragraphs.length === 0) return [];
  return [heading(title, HeadingLevel.HEADING_3), ...paragraphs];
}

export function mergeActivitySchedule(
  chapters: {
    title: string;
    start_time: string | null;
    duration: string | null;
  }[],
  blocks: {
    label: string;
    start_time: string | null;
    duration: string | null;
  }[],
): ExportScheduleRow[] {
  return [
    ...chapters.map((c) => ({
      label: c.title,
      startTime: c.start_time ?? "",
      duration: c.duration ?? "",
      isChapter: true,
    })),
    ...blocks.map((b) => ({
      label: b.label,
      startTime: b.start_time ?? "",
      duration: b.duration ?? "",
      isChapter: false,
    })),
  ].sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function buildFrontsExportInfo(
  assignments: FrontAssignments,
): ExportFrontInfo[] {
  return FRONT_COLORS.filter(
    (color) =>
      assignments[color].guilds.length > 0 ||
      assignments[color].organizers.length > 0,
  ).map((color) => ({
    color,
    guilds:
      assignments[color].guilds.map((g) => g.name).join(", ") ||
      "Aucune guilde",
    organizers:
      assignments[color].organizers
        .map((o) => o.name + (o.email ? ` — ${o.email}` : ""))
        .join(", ") || "Aucun",
  }));
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportActivityToDocx(
  data: ActivityExportData,
): Promise<Blob> {
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      text: data.name,
      heading: HeadingLevel.TITLE,
    }),
    new Paragraph({
      text: data.date,
      spacing: { after: 200 },
    }),
    ...htmlToParagraphs(data.gameText),

    heading("Inscription", HeadingLevel.HEADING_1),
    heading("Participants", HeadingLevel.HEADING_2),
    ...section("Tarifs", data.registrationParticipantsPricing),
    ...section("Pour vous inscrire", data.registrationParticipantsHowto),
  ];

  if (data.fronts.length > 0) {
    children.push(heading("Fronts et organisateurs", HeadingLevel.HEADING_3));
    data.fronts.forEach((front) => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: front.color, bold: true })],
        }),
        new Paragraph(front.guilds),
        new Paragraph(`Organisateurs : ${front.organizers}`),
      );
    });
  }

  children.push(
    heading("Non-participants", HeadingLevel.HEADING_2),
    ...section("Tarifs", data.registrationNonParticipantsPricing),
    ...section("Pour vous inscrire", data.registrationNonParticipantsHowto),

    heading("Horaire", HeadingLevel.HEADING_1),
    ...htmlToParagraphs(data.scheduleIntro),
  );

  if (data.schedule.length > 0) {
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              textCell("Heure"),
              textCell("Élément"),
              textCell("Durée"),
            ],
          }),
          ...data.schedule.map(
            (row) =>
              new TableRow({
                children: [
                  textCell(row.startTime || "—"),
                  textCell(row.label + (row.isChapter ? " (Chapitre)" : "")),
                  textCell(row.duration || "—"),
                ],
              }),
          ),
        ],
      }),
    );
  }

  children.push(
    ...htmlToParagraphs(data.scheduleOutro),

    heading("Éléments jeux", HeadingLevel.HEADING_1),
    ...section("Sécurité", data.gameSecurity),
    ...section("États-major", data.gameStaff),
    ...section("Gains", data.gameRewards),
    ...section("Règles", data.gameRules),
    ...section("Mort et guérison", data.gameDeathHealing),
    ...section("Varia", data.gameVaria),

    heading("Nous joindre", HeadingLevel.HEADING_1),
    ...htmlToParagraphs(data.contactInfo),
  );

  const doc = new Document({
    sections: [{ children }],
  });

  return Packer.toBlob(doc);
}
