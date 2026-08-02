import {
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
  type IParagraphOptions,
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

function textCell(text: string, widthPercent: number) {
  return new TableCell({
    children: [new Paragraph(text)],
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
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
  return [heading(title, HeadingLevel.HEADING_3), ...paragraphs];
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

function frontsSection(fronts: ExportFrontInfo[]): Paragraph[] {
  if (fronts.length === 0) return [];
  const paragraphs: Paragraph[] = [
    heading("Fronts et organisateurs", HeadingLevel.HEADING_3),
  ];
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
          new TextRun({ text: "Organisateurs :", bold: true }),
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
      rows: [
        new TableRow({
          children: [
            textCell("Début", startWidth),
            textCell("Fin", endWidth),
            textCell("Élément", labelWidth),
          ],
        }),
        ...rows.map(
          (row) =>
            new TableRow({
              children: [
                textCell(row.startTime || "—", startWidth),
                textCell(row.endTime || "—", endWidth),
                textCell(
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
    heading(chapter.title, HeadingLevel.HEADING_1),
    ...htmlToParagraphs(chapter.game_text),
    ...(chapter.map_url ? await chapterMapImage(chapter.map_url) : []),
  ];

  if (chapter.objectives.length > 0) {
    children.push(heading("Objectifs", HeadingLevel.HEADING_3));
    chapter.objectives.forEach((objective, index) => {
      children.push(heading(`Objectif ${index + 1}`, HeadingLevel.HEADING_4));
      children.push(...htmlToParagraphs(objective.description));
      if (objective.rewards_detail) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: "Gains : ", bold: true })],
          }),
        );
        children.push(...htmlToParagraphs(objective.rewards_detail));
      }
    });
  }

  const scheduleInfo = [chapter.start_time, chapter.duration]
    .filter(Boolean)
    .join(" — ");
  if (scheduleInfo) {
    children.push(
      heading("Horaire du chapitre", HeadingLevel.HEADING_3),
      new Paragraph(scheduleInfo),
    );
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
    children.push(
      heading("Mode de guérison", HeadingLevel.HEADING_3),
      new Paragraph(chapter.healing_mode.join(", ")),
    );
  }
  children.push(
    ...section(
      "Détails du mode de guérison",
      chapter.healing_mode_details ?? "",
    ),
  );

  return children;
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
    new Paragraph({ text: activity.name, heading: HeadingLevel.TITLE }),
    new Paragraph({ text: formattedDate, spacing: { after: 200 } }),
  ];

  for (const block of blocks) {
    switch (block.block_type) {
      case "game_text":
        children.push(...htmlToParagraphs(activity.game_text));
        break;
      case "details_registration":
        children.push(
          heading("Inscription", HeadingLevel.HEADING_1),
          heading("Participants", HeadingLevel.HEADING_2),
          ...section("Tarifs", activity.registration_participants_pricing ?? ""),
          ...section(
            "Pour vous inscrire",
            activity.registration_participants_howto ?? "",
          ),
          ...frontsSection(fronts),
          heading("Non-participants", HeadingLevel.HEADING_2),
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
          heading("Horaire", HeadingLevel.HEADING_1),
          ...htmlToParagraphs(scheduleIntro),
          ...(table.length > 0
            ? [heading("Horaire de la journée", HeadingLevel.HEADING_3)]
            : []),
          ...table,
          ...htmlToParagraphs(scheduleOutro),
        );
        break;
      }
      case "details_game_elements":
        children.push(
          heading("Éléments jeux", HeadingLevel.HEADING_1),
          ...section("Sécurité", activity.game_security ?? ""),
          ...section("États-major", activity.game_staff ?? ""),
          ...section("Gains", activity.game_rewards ?? ""),
          ...section("Règles", activity.game_rules ?? ""),
          ...section("Mort et guérison", activity.game_death_healing ?? ""),
          ...section("Varia", activity.game_varia ?? ""),
        );
        break;
      case "details_contact":
        children.push(
          heading("Nous joindre", HeadingLevel.HEADING_1),
          ...htmlToParagraphs(activity.contact_info),
        );
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
          children.push(heading(block.label, HeadingLevel.HEADING_3));
        }
        children.push(...htmlToParagraphs(block.content));
        break;
    }
  }

  const doc = new Document({
    sections: [{ children }],
  });

  return Packer.toBlob(doc);
}
