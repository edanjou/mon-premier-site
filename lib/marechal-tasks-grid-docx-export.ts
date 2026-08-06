import {
  Document,
  Packer,
  PageOrientation,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { ActivityChapter } from "@/lib/activity-chapters";
import type { MarechalTask } from "@/lib/marechal-tasks";
import type { Marechal, MarechalActivityStatus } from "@/lib/marechaux";

type CellLine = { text: string; bold?: boolean };

function cell(
  lines: CellLine[],
  widthPercent: number,
  shadeFill?: string,
): TableCell {
  const children: TextRun[] = [];
  lines.forEach((line, index) => {
    if (index > 0) children.push(new TextRun({ text: "", break: 1 }));
    children.push(new TextRun({ text: line.text, bold: line.bold }));
  });
  return new TableCell({
    children: [new Paragraph({ children })],
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    shading: shadeFill ? { fill: shadeFill } : undefined,
    margins: { top: 120, bottom: 120, left: 140, right: 140 },
  });
}

export async function exportTasksGridToDocx(input: {
  activityName: string;
  chapters: ActivityChapter[];
  rows: Marechal[];
  statuses: MarechalActivityStatus[];
  tasks: MarechalTask[];
  firstCampaignTeamIndex: number;
  marechalDisplayName: (m: Marechal) => string;
}): Promise<Blob> {
  const {
    activityName,
    chapters,
    rows,
    statuses,
    tasks,
    firstCampaignTeamIndex,
    marechalDisplayName,
  } = input;

  const slotDefault = (
    slot: "briefing_7h45" | "homologation_8h9h" | "homologation_9h10h" | "briefing_17h",
  ): string =>
    slot === "briefing_7h45" || slot === "briefing_17h" ? "2e du garage" : "";

  const slotValue = (
    marechalId: string,
    slot: "briefing_7h45" | "homologation_8h9h" | "homologation_9h10h" | "briefing_17h",
  ): string =>
    statuses.find((s) => s.marechal_id === marechalId)?.[slot] ??
    slotDefault(slot);

  const cellValue = (marechalId: string, chapterId: string): string =>
    tasks
      .filter(
        (t) => t.assigned_marechal_id === marechalId && t.chapter_id === chapterId,
      )
      .map((t) => t.label)
      .join(", ");

  const columnCount = 4 + chapters.length + 1;
  const nameWidth = 15;
  const otherWidth = (100 - nameWidth) / (columnCount - 1);
  const headerShade = "E5E5E5";

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      cell([{ text: "Maréchal", bold: true }], nameWidth, headerShade),
      cell(
        [{ text: "Briefing", bold: true }, { text: "2e du garage" }],
        otherWidth,
        headerShade,
      ),
      cell(
        [{ text: "Homologation", bold: true }, { text: "8h-9h" }],
        otherWidth,
        headerShade,
      ),
      cell(
        [{ text: "Homologation", bold: true }, { text: "9h-10h" }],
        otherWidth,
        headerShade,
      ),
      ...chapters.map((c) =>
        cell(
          [
            { text: c.title, bold: true },
            ...c.battlefields.map((b) => ({ text: b.name })),
          ],
          otherWidth,
          headerShade,
        ),
      ),
      cell(
        [{ text: "Debriefing", bold: true }, { text: "2e du garage" }],
        otherWidth,
        headerShade,
      ),
    ],
  });

  const bodyRows: TableRow[] = [];
  rows.forEach((m, index) => {
    if (index === firstCampaignTeamIndex && firstCampaignTeamIndex > 0) {
      bodyRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: "Équipe campagne", bold: true }),
                  ],
                }),
              ],
              columnSpan: columnCount,
              shading: { fill: "F2F2F2" },
            }),
          ],
        }),
      );
    }
    bodyRows.push(
      new TableRow({
        children: [
          cell([{ text: marechalDisplayName(m), bold: true }], nameWidth),
          cell([{ text: slotValue(m.id, "briefing_7h45") }], otherWidth),
          cell([{ text: slotValue(m.id, "homologation_8h9h") }], otherWidth),
          cell([{ text: slotValue(m.id, "homologation_9h10h") }], otherWidth),
          ...chapters.map((c) =>
            cell([{ text: cellValue(m.id, c.id) }], otherWidth),
          ),
          cell([{ text: slotValue(m.id, "briefing_17h") }], otherWidth),
        ],
      }),
    );
  });

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...bodyRows],
  });

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Aptos" },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.LANDSCAPE,
              width: 24480,
              height: 15840,
            },
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: `Tâches — ${activityName}`, bold: true, size: 32 }),
            ],
            spacing: { after: 200 },
          }),
          table,
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}
