import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { Activity } from "@/lib/activities";
import type { ActivityChapter } from "@/lib/activity-chapters";
import type { DocumentBlock } from "@/lib/activity-document";
import {
  FRONT_COLORS,
  type FrontAssignments,
  type FrontColor,
} from "@/lib/activity-fronts";
import type { ScheduleRow } from "@/lib/activity-schedule";

const DOC_FONT = "EB Garamond";

const COLORS = {
  ink: "2A1A0F",
  brown: "8B5A2B",
  brownDark: "6B4423",
  muted: "8A7660",
  calloutBg: "F3E9DA",
  calloutBorder: "C9A876",
};

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };

type HeadingTier = 1 | 2 | 3 | 4;

const HEADING_STYLE: Record<
  HeadingTier,
  { color: string; size: number; allCaps?: boolean }
> = {
  1: { color: COLORS.ink, size: 34 },
  2: { color: COLORS.brown, size: 26 },
  3: { color: COLORS.ink, size: 22, allCaps: true },
  4: { color: COLORS.brown, size: 20, allCaps: true },
};

const HEADING_LEVEL: Record<HeadingTier, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
};

type RunStyle = {
  bold?: boolean;
  italics?: boolean;
  underline?: Record<string, never>;
  strike?: boolean;
  color?: string;
  size?: number;
  allCaps?: boolean;
  characterSpacing?: number;
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

function blockParagraph(el: Element): Paragraph {
  const runs = collectRuns(el, {});
  return new Paragraph({
    children: runs.length ? runs : [new TextRun("")],
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 160 },
  });
}

function calloutParagraph(el: Element): Paragraph {
  const runs = collectRuns(el, {});
  return new Paragraph({
    shading: { fill: COLORS.calloutBg },
    border: {
      left: { style: BorderStyle.SINGLE, color: COLORS.calloutBorder, size: 18, space: 8 },
    },
    indent: { left: 40 },
    spacing: { before: 120, after: 160 },
    children: runs.length ? runs : [new TextRun("")],
  });
}

function headingParagraph(el: Element, tier: HeadingTier): Paragraph {
  const style = HEADING_STYLE[tier];
  const runs = collectRuns(el, { bold: true, ...style });
  return new Paragraph({
    heading: HEADING_LEVEL[tier],
    alignment: tier === 1 ? AlignmentType.CENTER : undefined,
    border:
      tier === 2
        ? { bottom: { style: BorderStyle.SINGLE, color: COLORS.brown, size: 6, space: 4 } }
        : undefined,
    spacing: { before: tier === 1 ? 360 : 260, after: tier === 2 ? 160 : 140 },
    children: runs.length ? runs : [new TextRun({ text: "", ...style })],
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
          const runs = collectRuns(li, {});
          paragraphs.push(
            new Paragraph({
              indent: { left: 360, hanging: 260 },
              spacing: { after: 80 },
              alignment: AlignmentType.JUSTIFIED,
              children: [
                new TextRun({ text: "◆  ", color: COLORS.brown, bold: true }),
                ...runs,
              ],
            }),
          );
        } else {
          const runs = collectRuns(li, {});
          paragraphs.push(
            new Paragraph({
              children: [new TextRun(`${index + 1}. `), ...runs],
              indent: { left: 360 },
              spacing: { after: 80 },
            }),
          );
        }
      });
      return;
    }

    if (tag === "blockquote") {
      paragraphs.push(calloutParagraph(el));
      return;
    }

    if (/^h[1-6]$/.test(tag)) {
      const level = Number(tag[1]);
      const tier: HeadingTier = level === 1 ? 1 : level === 2 ? 2 : level === 3 ? 3 : 4;
      paragraphs.push(headingParagraph(el, tier));
      return;
    }

    paragraphs.push(blockParagraph(el));
  });

  return paragraphs;
}

function heading(text: string, tier: HeadingTier) {
  const style = HEADING_STYLE[tier];
  return new Paragraph({
    heading: HEADING_LEVEL[tier],
    alignment: tier === 1 ? AlignmentType.CENTER : undefined,
    border:
      tier === 2
        ? { bottom: { style: BorderStyle.SINGLE, color: COLORS.brown, size: 6, space: 4 } }
        : undefined,
    spacing: { before: tier === 1 ? 360 : 260, after: tier === 2 ? 160 : 140 },
    children: [new TextRun({ text, bold: true, ...style })],
  });
}

function termLabel(text: string): TextRun {
  return new TextRun({ text, bold: true, color: COLORS.brown });
}

function headerCell(text: string, widthPercent: number): TableCell {
  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    shading: { fill: COLORS.brownDark },
    margins: { top: 100, bottom: 100, left: 140, right: 140 },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: true,
            allCaps: true,
            color: "FFFFFF",
            size: 18,
            characterSpacing: 20,
          }),
        ],
      }),
    ],
  });
}

function bodyCell(text: string, widthPercent: number): TableCell {
  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    margins: { top: 120, bottom: 120, left: 140, right: 140 },
    borders: {
      top: NO_BORDER,
      left: NO_BORDER,
      right: NO_BORDER,
      bottom: { style: BorderStyle.SINGLE, color: COLORS.calloutBorder, size: 4 },
    },
    children: [new Paragraph({ children: [new TextRun({ text, color: COLORS.ink })] })],
  });
}

export type ExportFrontInfo = {
  color: FrontColor;
  guilds: string;
  organizers: string[];
};

const FRONT_COLOR_HEX: Record<FrontColor, string> = {
  Jaune: "CA8A04",
  Bleu: "2563EB",
  Vert: "16A34A",
  Mauve: "9333EA",
  Rouge: "DC2626",
  Blanc: "71717A",
};

function section(title: string, html: string): Paragraph[] {
  const paragraphs = htmlToParagraphs(html);
  if (paragraphs.length === 0) return [];
  return [heading(title, 3), ...paragraphs];
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
      assignments[color].organizers.length > 0
        ? assignments[color].organizers.map(
            (o) => o.name + (o.email ? ` — ${o.email}` : ""),
          )
        : ["Aucun"],
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

function titlePage(activityName: string, formattedDate: string): Paragraph[] {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: "Duché de Bicolline · Campagne",
          allCaps: true,
          characterSpacing: 30,
          color: COLORS.muted,
          size: 16,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: activityName,
          bold: true,
          color: COLORS.ink,
          size: 56,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 320 },
      children: [
        new TextRun({
          text: formattedDate,
          allCaps: true,
          characterSpacing: 30,
          color: COLORS.brown,
          size: 16,
        }),
      ],
    }),
  ];
}

function frontsSection(fronts: ExportFrontInfo[]): Paragraph[] {
  if (fronts.length === 0) return [];
  const paragraphs: Paragraph[] = [heading("Fronts et organisateurs", 3)];
  fronts.forEach((front) => {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: front.color,
            bold: true,
            color: FRONT_COLOR_HEX[front.color],
          }),
        ],
      }),
      new Paragraph(front.guilds),
      new Paragraph({
        children: [
          termLabel("Organisateurs : "),
          ...front.organizers.flatMap((name) => [
            new TextRun({ text: "", break: 1 }),
            new TextRun(name),
          ]),
        ],
      }),
    );
  });
  return paragraphs;
}

function scheduleTable(rows: ScheduleRow[]): Table[] {
  if (rows.length === 0) return [];
  const [startWidth, endWidth, labelWidth] = [15, 15, 70];
  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: NO_BORDER,
        bottom: NO_BORDER,
        left: NO_BORDER,
        right: NO_BORDER,
        insideHorizontal: NO_BORDER,
        insideVertical: NO_BORDER,
      },
      rows: [
        new TableRow({
          children: [
            headerCell("Début", startWidth),
            headerCell("Fin", endWidth),
            headerCell("Élément", labelWidth),
          ],
        }),
        ...rows.map(
          (row) =>
            new TableRow({
              children: [
                bodyCell(row.startTime || "—", startWidth),
                bodyCell(row.endTime || "—", endWidth),
                bodyCell(
                  row.label +
                    (row.hasConflict ? " ⚠ Conflit d'horaire" : ""),
                  labelWidth,
                ),
              ],
            }),
        ),
      ],
    }),
  ];
}

const DOCX_IMAGE_TYPE_BY_MIME: Record<string, "jpg" | "png" | "gif" | "bmp"> =
  {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/bmp": "bmp",
  };

const MAP_IMAGE_MAX_WIDTH = 500;

async function chapterMapImage(url: string): Promise<Paragraph[]> {
  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    const blob = await response.blob();
    const type = DOCX_IMAGE_TYPE_BY_MIME[blob.type];
    if (!type) return [];
    const [data, bitmap] = await Promise.all([
      blob.arrayBuffer().then((buf) => new Uint8Array(buf)),
      createImageBitmap(blob),
    ]);
    const scale = Math.min(1, MAP_IMAGE_MAX_WIDTH / bitmap.width);
    return [
      new Paragraph({
        children: [
          new ImageRun({
            type,
            data,
            transformation: {
              width: Math.round(bitmap.width * scale),
              height: Math.round(bitmap.height * scale),
            },
          }),
        ],
      }),
    ];
  } catch {
    return [];
  }
}

async function chapterChildren(chapter: ActivityChapter): Promise<Paragraph[]> {
  const children: Paragraph[] = [
    heading(chapter.title, 1),
    ...htmlToParagraphs(chapter.game_text),
    ...(chapter.map_url ? await chapterMapImage(chapter.map_url) : []),
  ];

  if (chapter.objectives.length > 0) {
    children.push(heading("Objectifs", 3));
    chapter.objectives.forEach((objective, index) => {
      children.push(heading(`Objectif ${index + 1}`, 4));
      children.push(...htmlToParagraphs(objective.description));
      if (objective.rewards_detail) {
        children.push(new Paragraph({ children: [termLabel("Gains : ")] }));
        children.push(...htmlToParagraphs(objective.rewards_detail));
      }
    });
  }

  const scheduleInfo = [chapter.start_time, chapter.duration]
    .filter(Boolean)
    .join(" — ");
  if (scheduleInfo) {
    children.push(heading("Horaire du chapitre", 3), new Paragraph(scheduleInfo));
  }

  children.push(
    ...section("Limites de terrain", chapter.terrain_limits ?? ""),
    ...section("Règles spéciales", chapter.special_rules ?? ""),
    ...section("Éléments spéciaux", chapter.special_elements ?? ""),
    ...section(
      "Monstres et machines de guerre",
      chapter.monsters_war_machines ?? "",
    ),
  );

  if (chapter.healing_mode && chapter.healing_mode.length > 0) {
    children.push(heading("Mode de guérison", 3), new Paragraph(chapter.healing_mode.join(", ")));
  }
  children.push(
    ...section(
      "Détails du mode de guérison",
      chapter.healing_mode_details ?? "",
    ),
  );

  return children;
}

export async function exportMontageDocumentToDocx(input: {
  activity: Activity;
  formattedDate: string;
  blocks: DocumentBlock[];
}): Promise<Blob> {
  const { activity, formattedDate, blocks } = input;

  const children: (Paragraph | Table)[] = [
    ...titlePage(activity.name, formattedDate),
  ];

  for (const block of blocks) {
    if (block.block_type !== "custom_text") continue;
    if (block.label) {
      children.push(heading(block.label, 3));
    }
    children.push(...htmlToParagraphs(block.content));
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: DOC_FONT, size: 22, color: COLORS.ink },
        },
      },
    },
    sections: [{ children }],
  });

  return Packer.toBlob(doc);
}

export async function exportActivityDocumentToDocx(input: {
  activity: Activity;
  formattedDate: string;
  chapters: ActivityChapter[];
  blocks: DocumentBlock[];
  scheduleRows: ScheduleRow[];
  scheduleIntro: string;
  scheduleOutro: string;
  fronts: ExportFrontInfo[];
}): Promise<Blob> {
  const {
    activity,
    formattedDate,
    chapters,
    blocks,
    scheduleRows,
    scheduleIntro,
    scheduleOutro,
    fronts,
  } = input;
  const chapterById = new Map(chapters.map((chapter) => [chapter.id, chapter]));

  const children: (Paragraph | Table)[] = [
    ...titlePage(activity.name, formattedDate),
  ];

  for (const block of blocks) {
    switch (block.block_type) {
      case "game_text":
        children.push(...htmlToParagraphs(activity.game_text));
        break;
      case "details_registration":
        children.push(
          heading("Inscription", 1),
          heading("Participants", 2),
          ...section("Tarifs", activity.registration_participants_pricing ?? ""),
          ...section(
            "Pour vous inscrire",
            activity.registration_participants_howto ?? "",
          ),
          ...frontsSection(fronts),
          heading("Non-participants", 2),
          ...section(
            "Tarifs",
            activity.registration_non_participants_pricing ?? "",
          ),
          ...section(
            "Pour vous inscrire",
            activity.registration_non_participants_howto ?? "",
          ),
        );
        break;
      case "details_schedule": {
        const table = scheduleTable(scheduleRows);
        children.push(
          heading("Horaire", 1),
          ...htmlToParagraphs(scheduleIntro),
          ...(table.length > 0 ? [heading("Horaire de la journée", 3)] : []),
          ...table,
          ...htmlToParagraphs(scheduleOutro),
        );
        break;
      }
      case "details_game_elements":
        children.push(
          heading("Éléments jeux", 1),
          ...section("Sécurité", activity.game_security ?? ""),
          ...section("États-major", activity.game_staff ?? ""),
          ...section("Gains", activity.game_rewards ?? ""),
          ...section("Règles", activity.game_rules ?? ""),
          ...section("Mort et guérison", activity.game_death_healing ?? ""),
          ...section("Varia", activity.game_varia ?? ""),
        );
        break;
      case "details_contact":
        children.push(heading("Nous joindre", 1), ...htmlToParagraphs(activity.contact_info));
        break;
      case "chapter": {
        const chapter = block.chapter_id
          ? chapterById.get(block.chapter_id)
          : undefined;
        if (chapter) children.push(...(await chapterChildren(chapter)));
        break;
      }
      case "custom_text":
        if (block.label) {
          children.push(heading(block.label, 3));
        }
        children.push(...htmlToParagraphs(block.content));
        break;
    }
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: DOC_FONT, size: 22, color: COLORS.ink },
        },
      },
    },
    sections: [{ children }],
  });

  return Packer.toBlob(doc);
}
