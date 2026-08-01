"use client";

import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import {
  Archive,
  ArrowLeft,
  ArrowUpRight,
  Check,
  Circle as CircleIcon,
  Copy,
  FilePlus,
  Folder,
  Images,
  Library,
  Lock,
  LockOpen,
  Menu,
  MousePointer2,
  Paperclip,
  Pencil,
  Pentagon,
  Save,
  Slash,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Arrow,
  Circle,
  Image as KonvaImage,
  Layer,
  Line,
  Rect,
  Stage,
  Transformer,
} from "react-konva";
import useImage from "use-image";
import {
  deleteFolder,
  deleteMedia,
  listMedia,
  sanitizeSegment,
  uploadMedia,
  uploadZipAsFolder,
  type MediaEntry,
  type MediaFile,
  type MediaFolder,
} from "@/lib/media-library";
import {
  createSavedMap,
  deleteSavedMap,
  listSavedMaps,
  updateSavedMap,
  type SavedMap,
} from "@/lib/saved-maps";

type DragShapeKind = "line" | "arrow" | "circle";
type MapShapeKind = DragShapeKind | "polygon";

type Tool = "select" | "draw" | MapShapeKind;

const SHAPE_TOOLS: DragShapeKind[] = ["line", "arrow", "circle"];

function isShapeKind(tool: Tool): tool is DragShapeKind {
  return (SHAPE_TOOLS as Tool[]).includes(tool);
}

export type OverlayShape = {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

type DrawStyle = "solid" | "dashed";

export type DrawnLine = {
  id: string;
  points: number[];
  stroke: string;
  strokeWidth: number;
  dash: number[];
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
};

export type MapShape = {
  id: string;
  kind: MapShapeKind;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  stroke: string;
  strokeWidth: number;
  dash: number[];
  points: number[];
  radius: number;
  fill: string;
  fillOpacity: number;
};

export type CanvasSize = {
  width: number;
  height: number;
};

export type MapEditorData = {
  backgroundSrc: string | null;
  canvasSize: CanvasSize;
  overlays: OverlayShape[];
  lines: DrawnLine[];
  mapShapes: MapShape[];
};

type DragOrigin = {
  draggedId: string;
  origins: Map<string, { x: number; y: number }>;
};

const CANVAS_PRESETS: { label: string; width: number; height: number }[] = [
  { label: "3:2 (1200 × 800)", width: 1200, height: 800 },
  { label: "1:1 (1000 × 1000)", width: 1000, height: 1000 },
];

const DRAW_COLOR_SWATCHES = ["#1c1c1c", "#0e4fa7", "#efb200", "#dc2626"];
const EMPTY_POINTS: number[] = [];
const LOCAL_ONLY_VALUE = "__local__";
const DEFAULT_LIBRARY_FOLDER = "elements";

const MIN_STAGE_SCALE = 0.2;
const MAX_STAGE_SCALE = 4;
const OVERLAY_SCALE = 0.25;
const BACKGROUND_SCALE = 3;
const WATERMARK_SRC = "/bicolline-logo-white.svg";
const WATERMARK_MARGIN = 24;
const WATERMARK_MAX_WIDTH = 90;
const WATERMARK_NATURAL_WIDTH = 233.744;
const WATERMARK_NATURAL_HEIGHT = 267.476;
const DEFAULT_BACKGROUND_URL =
  "https://cfduycvxggikaxjilbkf.supabase.co/storage/v1/object/public/media/37e4ab42-762e-4453-9542-7d5204beb886.jpg";

function getDashPattern(style: DrawStyle, width: number): number[] {
  return style === "dashed" ? [width * 3, width * 2] : [];
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.substring(0, 2), 16);
  const g = parseInt(normalized.substring(2, 4), 16);
  const b = parseInt(normalized.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getImageSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () =>
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = src;
  });
}

const BACKGROUND_MAX_DIMENSION = 2000;
const BACKGROUND_JPEG_QUALITY = 0.82;

function compressBackgroundImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();

    img.onload = () => {
      const scale = Math.min(
        1,
        BACKGROUND_MAX_DIMENSION / Math.max(img.width, img.height),
      );
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Impossible de compresser l'image."));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (!blob) {
            reject(new Error("Impossible de compresser l'image."));
            return;
          }
          resolve(new File([blob], "background.jpg", { type: "image/jpeg" }));
        },
        "image/jpeg",
        BACKGROUND_JPEG_QUALITY,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Impossible de charger l'image pour la compresser."));
    };
    img.src = url;
  });
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function ToolbarButton({
  label,
  onClick,
  active,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={`toolbar-button flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
          active
            ? "border-primary bg-primary text-white"
            : "border-black/[.08] bg-white text-black hover:bg-black/[.04] dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-[#1a1a1a]"
        } disabled:cursor-not-allowed disabled:opacity-40`}
      >
        {children}
      </button>
      <span className="pointer-events-none absolute left-full top-1/2 z-10 ml-2 -translate-y-1/2 whitespace-nowrap rounded bg-zinc-900 px-2 py-1 text-xs text-white opacity-0 shadow transition-opacity group-hover:opacity-100 dark:bg-zinc-700">
        {label}
      </span>
    </div>
  );
}

function MediaLibraryPanel({
  entries,
  currentPath,
  isLoading,
  selectedPaths,
  onClose,
  onEnterFolder,
  onGoBack,
  onAddAsOverlay,
  onDeleteFile,
  onDeleteFolder,
  onToggleSelect,
  onClearSelection,
  onBulkAddOverlay,
  onBulkDelete,
}: {
  entries: MediaEntry[];
  currentPath: string;
  isLoading: boolean;
  selectedPaths: string[];
  onClose: () => void;
  onEnterFolder: (path: string) => void;
  onGoBack: () => void;
  onAddAsOverlay: (file: MediaFile) => void;
  onDeleteFile: (file: MediaFile) => void;
  onDeleteFolder: (folder: MediaFolder) => void;
  onToggleSelect: (path: string) => void;
  onClearSelection: () => void;
  onBulkAddOverlay: () => void;
  onBulkDelete: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-3xl flex-col gap-4 overflow-hidden rounded-xl bg-white p-6 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {currentPath && (
              <button
                onClick={onGoBack}
                aria-label="Retour"
                className="rounded-full p-1 hover:bg-black/[.04] dark:hover:bg-white/[.08]"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
              Banque de médias{currentPath ? ` / ${currentPath}` : ""}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full p-1 hover:bg-black/[.04] dark:hover:bg-white/[.08]"
          >
            <X size={20} />
          </button>
        </div>

        {selectedPaths.length > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2 text-sm">
            <span className="text-black dark:text-zinc-50">
              {selectedPaths.length} sélectionnée(s)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onBulkAddOverlay}
                className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-white hover:bg-[#0c4390]"
              >
                Ajouter comme calques
              </button>
              <button
                onClick={onBulkDelete}
                className="rounded-full border border-red-600 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
              >
                Supprimer
              </button>
              <button
                onClick={onClearSelection}
                className="text-xs text-zinc-500 hover:underline dark:text-zinc-400"
              >
                Désélectionner
              </button>
            </div>
          </div>
        )}

        {isLoading && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Chargement…
          </p>
        )}
        {!isLoading && entries.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {currentPath
              ? "Ce dossier est vide."
              : 'Aucune image pour l\'instant. Les images ajoutées via "Ajouter une image" (en choisissant un dossier) ou un import .zip apparaîtront ici automatiquement.'}
          </p>
        )}

        <div className="grid max-h-[60vh] grid-cols-2 gap-4 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
          {entries.map((entry) =>
            entry.type === "folder" ? (
              <div
                key={entry.path}
                className="group relative flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border border-black/[.08] bg-zinc-50 p-4 dark:border-white/[.145] dark:bg-zinc-800"
              >
                <button
                  onClick={() => onDeleteFolder(entry)}
                  aria-label="Supprimer le dossier"
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X size={14} />
                </button>
                <button
                  onClick={() => onEnterFolder(entry.path)}
                  className="flex flex-col items-center gap-2"
                >
                  <Folder size={40} className="text-zinc-400" />
                  <span className="max-w-full truncate text-xs text-zinc-600 dark:text-zinc-400">
                    {entry.name}
                  </span>
                </button>
              </div>
            ) : (
              <div
                key={entry.path}
                className={`group relative overflow-hidden rounded-lg border ${
                  selectedPaths.includes(entry.path)
                    ? "border-2 border-primary"
                    : "border-black/[.08] dark:border-white/[.145]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedPaths.includes(entry.path)}
                  onChange={() => onToggleSelect(entry.path)}
                  aria-label="Sélectionner cette image"
                  className="absolute left-1 top-1 z-10 h-4 w-4 cursor-pointer accent-primary"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={entry.url}
                  alt=""
                  className="aspect-square w-full bg-zinc-100 object-contain object-center dark:bg-zinc-800"
                />
                <button
                  onClick={() => onDeleteFile(entry)}
                  aria-label="Supprimer de la banque"
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X size={14} />
                </button>
                <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => onAddAsOverlay(entry)}
                    className="w-full rounded bg-white/90 px-2 py-1 text-xs font-medium text-black hover:bg-white"
                  >
                    Ajouter comme calque
                  </button>
                </div>
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

function FolderPickerModal({
  folders,
  fileCount,
  onConfirm,
  onCancel,
}: {
  folders: string[];
  fileCount: number;
  onConfirm: (folder: string) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState(DEFAULT_LIBRARY_FOLDER);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const handleConfirm = () => {
    const folder = isCreatingNew ? sanitizeSegment(newFolderName) : selected;
    onConfirm(folder);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl bg-white p-6 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
          Ajouter {fileCount > 1 ? `${fileCount} images` : "l'image"} dans…
        </h2>

        {!isCreatingNew ? (
          <>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="rounded border border-black/[.08] bg-white px-3 py-2 text-sm dark:border-white/[.145] dark:bg-zinc-800 dark:text-zinc-50"
            >
              <option value={LOCAL_ONLY_VALUE}>
                Ne pas enregistrer dans la banque
              </option>
              <option value="">Banque : racine (aucun dossier)</option>
              {folders.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                setIsCreatingNew(true);
                setNewFolderName("");
              }}
              className="text-left text-sm font-medium text-primary hover:underline"
            >
              + Nouveau dossier
            </button>
          </>
        ) : (
          <input
            type="text"
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Nom du dossier"
            className="rounded border border-black/[.08] bg-white px-3 py-2 text-sm dark:border-white/[.145] dark:bg-zinc-800 dark:text-zinc-50"
          />
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={isCreatingNew && newFolderName.trim() === ""}
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  );
}

function MapWatermark({
  displayWidth,
  displayHeight,
}: {
  displayWidth: number;
  displayHeight: number;
}) {
  const [image] = useImage(WATERMARK_SRC, "anonymous");
  const scale = Math.min(1, WATERMARK_MAX_WIDTH / WATERMARK_NATURAL_WIDTH);
  const width = WATERMARK_NATURAL_WIDTH * scale;
  const height = WATERMARK_NATURAL_HEIGHT * scale;

  return (
    <KonvaImage
      image={image}
      x={displayWidth - width - WATERMARK_MARGIN}
      y={displayHeight - height - WATERMARK_MARGIN}
      width={width}
      height={height}
      listening={false}
    />
  );
}

function BackgroundImage({
  src,
  imageRef,
  draggable,
  canvasSize,
  pinLayers,
  getAllLayerEntries,
  onCommitPan,
}: {
  src: string;
  imageRef: React.RefObject<Konva.Image | null>;
  draggable: boolean;
  canvasSize: CanvasSize;
  pinLayers: boolean;
  getAllLayerEntries: () => [string, Konva.Node][];
  onCommitPan: (
    origins: Map<string, { x: number; y: number }>,
    dx: number,
    dy: number,
  ) => void;
}) {
  const [image] = useImage(src, "anonymous");
  const hasFitRef = useRef(false);
  const panOriginRef = useRef<{
    startX: number;
    startY: number;
    origins: Map<string, { x: number; y: number }>;
  } | null>(null);

  useEffect(() => {
    hasFitRef.current = false;
  }, [src]);

  useEffect(() => {
    if (!image || hasFitRef.current || !imageRef.current) return;
    const fitScale = Math.min(
      canvasSize.width / image.width,
      canvasSize.height / image.height,
    );
    const scale = fitScale * BACKGROUND_SCALE;
    imageRef.current.scale({ x: scale, y: scale });
    imageRef.current.position({
      x: (canvasSize.width - image.width * scale) / 2,
      y: (canvasSize.height - image.height * scale) / 2,
    });
    imageRef.current.getLayer()?.batchDraw();
    hasFitRef.current = true;
  }, [image, imageRef, canvasSize]);

  const handleDragStart = (e: KonvaEventObject<DragEvent>) => {
    if (!pinLayers) {
      panOriginRef.current = null;
      return;
    }
    const origins = new Map<string, { x: number; y: number }>();
    getAllLayerEntries().forEach(([id, node]) => {
      origins.set(id, { x: node.x(), y: node.y() });
    });
    panOriginRef.current = {
      startX: e.target.x(),
      startY: e.target.y(),
      origins,
    };
  };

  const handleDragMove = (e: KonvaEventObject<DragEvent>) => {
    const state = panOriginRef.current;
    if (!state) return;
    const dx = e.target.x() - state.startX;
    const dy = e.target.y() - state.startY;
    getAllLayerEntries().forEach(([id, node]) => {
      const origin = state.origins.get(id);
      if (origin) node.position({ x: origin.x + dx, y: origin.y + dy });
    });
    e.target.getLayer()?.batchDraw();
  };

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    const state = panOriginRef.current;
    if (state) {
      const dx = e.target.x() - state.startX;
      const dy = e.target.y() - state.startY;
      onCommitPan(state.origins, dx, dy);
    }
    panOriginRef.current = null;
  };

  if (!image) return null;

  return (
    <KonvaImage
      ref={imageRef}
      image={image}
      draggable={draggable}
      name="background-image"
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    />
  );
}

function useGroupDragHandlers({
  id,
  selectedIds,
  getNode,
  dragOriginRef,
  onCommitGroupMove,
  onSingleDragEnd,
}: {
  id: string;
  selectedIds: string[];
  getNode: (id: string) => Konva.Node | undefined;
  dragOriginRef: React.RefObject<DragOrigin | null>;
  onCommitGroupMove: (
    origins: Map<string, { x: number; y: number }>,
    dx: number,
    dy: number,
  ) => void;
  onSingleDragEnd: (x: number, y: number) => void;
}) {
  const isInMultiSelection = selectedIds.includes(id) && selectedIds.length > 1;

  const onDragStart = () => {
    if (isInMultiSelection) {
      const origins = new Map<string, { x: number; y: number }>();
      selectedIds.forEach((sid) => {
        const node = getNode(sid);
        if (node) origins.set(sid, { x: node.x(), y: node.y() });
      });
      dragOriginRef.current = { draggedId: id, origins };
    } else {
      dragOriginRef.current = null;
    }
  };

  const onDragMove = (e: KonvaEventObject<DragEvent>) => {
    const origin = dragOriginRef.current;
    if (!origin || origin.draggedId !== id) return;
    const start = origin.origins.get(id);
    if (!start) return;
    const dx = e.target.x() - start.x;
    const dy = e.target.y() - start.y;
    origin.origins.forEach((startPos, otherId) => {
      if (otherId === id) return;
      const node = getNode(otherId);
      node?.position({ x: startPos.x + dx, y: startPos.y + dy });
    });
    e.target.getLayer()?.batchDraw();
  };

  const onDragEnd = (e: KonvaEventObject<DragEvent>) => {
    const origin = dragOriginRef.current;
    if (origin && origin.draggedId === id) {
      const start = origin.origins.get(id);
      const dx = start ? e.target.x() - start.x : 0;
      const dy = start ? e.target.y() - start.y : 0;
      onCommitGroupMove(origin.origins, dx, dy);
      dragOriginRef.current = null;
    } else {
      onSingleDragEnd(e.target.x(), e.target.y());
    }
  };

  return { onDragStart, onDragMove, onDragEnd };
}

function OverlayImage({
  shape,
  selectedIds,
  draggable,
  onSelect,
  onChange,
  setShapeRef,
  getNode,
  dragOriginRef,
  onCommitGroupMove,
}: {
  shape: OverlayShape;
  selectedIds: string[];
  draggable: boolean;
  onSelect: (id: string, additive: boolean) => void;
  onChange: (attrs: Partial<OverlayShape>) => void;
  setShapeRef: (id: string, node: Konva.Image | null) => void;
  getNode: (id: string) => Konva.Node | undefined;
  dragOriginRef: React.RefObject<DragOrigin | null>;
  onCommitGroupMove: (
    origins: Map<string, { x: number; y: number }>,
    dx: number,
    dy: number,
  ) => void;
}) {
  const [image] = useImage(shape.src, "anonymous");
  const { onDragStart, onDragMove, onDragEnd } = useGroupDragHandlers({
    id: shape.id,
    selectedIds,
    getNode,
    dragOriginRef,
    onCommitGroupMove,
    onSingleDragEnd: (x, y) => onChange({ x, y }),
  });

  return (
    <KonvaImage
      ref={(node) => setShapeRef(shape.id, node)}
      image={image}
      x={shape.x}
      y={shape.y}
      width={shape.width}
      height={shape.height}
      rotation={shape.rotation}
      draggable={draggable}
      onClick={(e) => {
        if (!draggable) return;
        onSelect(shape.id, (e.evt as MouseEvent).shiftKey);
      }}
      onTap={() => {
        if (!draggable) return;
        onSelect(shape.id, false);
      }}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onTransformEnd={(e) => {
        const node = e.target as Konva.Image;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        const width = Math.max(5, node.width() * scaleX);
        const height = Math.max(5, node.height() * scaleY);
        onChange({
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          width,
          height,
        });
      }}
    />
  );
}

function LineShape({
  shape,
  selectedIds,
  draggable,
  onSelect,
  onChange,
  setLineRef,
  getNode,
  dragOriginRef,
  onCommitGroupMove,
}: {
  shape: DrawnLine;
  selectedIds: string[];
  draggable: boolean;
  onSelect: (id: string, additive: boolean) => void;
  onChange: (attrs: Partial<DrawnLine>) => void;
  setLineRef: (id: string, node: Konva.Line | null) => void;
  getNode: (id: string) => Konva.Node | undefined;
  dragOriginRef: React.RefObject<DragOrigin | null>;
  onCommitGroupMove: (
    origins: Map<string, { x: number; y: number }>,
    dx: number,
    dy: number,
  ) => void;
}) {
  const { onDragStart, onDragMove, onDragEnd } = useGroupDragHandlers({
    id: shape.id,
    selectedIds,
    getNode,
    dragOriginRef,
    onCommitGroupMove,
    onSingleDragEnd: (x, y) => onChange({ x, y }),
  });

  return (
    <Line
      ref={(node) => setLineRef(shape.id, node)}
      points={shape.points}
      x={shape.x}
      y={shape.y}
      rotation={shape.rotation}
      scaleX={shape.scaleX}
      scaleY={shape.scaleY}
      stroke={shape.stroke}
      strokeWidth={shape.strokeWidth}
      dash={shape.dash}
      tension={0}
      lineCap="round"
      lineJoin="round"
      hitStrokeWidth={Math.max(shape.strokeWidth, 16)}
      draggable={draggable}
      onClick={(e) => {
        if (!draggable) return;
        onSelect(shape.id, (e.evt as MouseEvent).shiftKey);
      }}
      onTap={() => {
        if (!draggable) return;
        onSelect(shape.id, false);
      }}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onTransformEnd={(e) => {
        const node = e.target as Konva.Line;
        onChange({
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          scaleX: node.scaleX(),
          scaleY: node.scaleY(),
        });
      }}
    />
  );
}

function MapShapeItem({
  shape,
  selectedIds,
  draggable,
  onSelect,
  onChange,
  setShapeItemRef,
  getNode,
  dragOriginRef,
  onCommitGroupMove,
}: {
  shape: MapShape;
  selectedIds: string[];
  draggable: boolean;
  onSelect: (id: string, additive: boolean) => void;
  onChange: (attrs: Partial<MapShape>) => void;
  setShapeItemRef: (id: string, node: Konva.Shape | null) => void;
  getNode: (id: string) => Konva.Node | undefined;
  dragOriginRef: React.RefObject<DragOrigin | null>;
  onCommitGroupMove: (
    origins: Map<string, { x: number; y: number }>,
    dx: number,
    dy: number,
  ) => void;
}) {
  const { onDragStart, onDragMove, onDragEnd } = useGroupDragHandlers({
    id: shape.id,
    selectedIds,
    getNode,
    dragOriginRef,
    onCommitGroupMove,
    onSingleDragEnd: (x, y) => onChange({ x, y }),
  });

  const handleTransformEnd = (e: KonvaEventObject<Event>) => {
    const node = e.target;
    onChange({
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
      scaleX: node.scaleX(),
      scaleY: node.scaleY(),
    });
  };

  const handleClick = (e: KonvaEventObject<MouseEvent>) => {
    if (!draggable) return;
    onSelect(shape.id, e.evt.shiftKey);
  };

  const handleTap = () => {
    if (!draggable) return;
    onSelect(shape.id, false);
  };

  const common = {
    x: shape.x,
    y: shape.y,
    rotation: shape.rotation,
    scaleX: shape.scaleX,
    scaleY: shape.scaleY,
    stroke: shape.stroke,
    strokeWidth: shape.strokeWidth,
    dash: shape.dash,
    draggable,
    onClick: handleClick,
    onTap: handleTap,
    onDragStart,
    onDragMove,
    onDragEnd,
    onTransformEnd: handleTransformEnd,
  };

  if (shape.kind === "line") {
    return (
      <Line
        ref={(node) => setShapeItemRef(shape.id, node)}
        {...common}
        points={shape.points}
        tension={0}
        lineCap="round"
        lineJoin="round"
        hitStrokeWidth={Math.max(shape.strokeWidth, 16)}
      />
    );
  }

  if (shape.kind === "arrow") {
    return (
      <Arrow
        ref={(node) => setShapeItemRef(shape.id, node)}
        {...common}
        points={shape.points}
        fill={shape.stroke}
        pointerLength={12}
        pointerWidth={12}
        hitStrokeWidth={Math.max(shape.strokeWidth, 16)}
      />
    );
  }

  if (shape.kind === "polygon") {
    return (
      <Line
        ref={(node) => setShapeItemRef(shape.id, node)}
        {...common}
        points={shape.points}
        closed
        fill={hexToRgba(shape.fill, shape.fillOpacity)}
        lineJoin="round"
      />
    );
  }

  return (
    <Circle
      ref={(node) => setShapeItemRef(shape.id, node)}
      {...common}
      radius={shape.radius}
      fillEnabled={false}
    />
  );
}

export default function MapEditor({
  embedded = false,
  onAttach,
  onCancel,
}: {
  embedded?: boolean;
  onAttach?: (result: { name: string; url: string }) => void;
  onCancel?: () => void;
} = {}) {
  const [backgroundSrc, setBackgroundSrc] = useState<string | null>(
    DEFAULT_BACKGROUND_URL,
  );
  const [overlays, setOverlays] = useState<OverlayShape[]>([]);
  const [lines, setLines] = useState<DrawnLine[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tool, setTool] = useState<Tool>("select");
  const [pinLayersToBackground, setPinLayersToBackground] = useState(false);
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({
    width: 1200,
    height: 800,
  });
  const [libraryEntries, setLibraryEntries] = useState<MediaEntry[]>([]);
  const [libraryPath, setLibraryPath] = useState("");
  const [selectedMediaPaths, setSelectedMediaPaths] = useState<string[]>([]);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(true);
  const [isImportingZip, setIsImportingZip] = useState(false);
  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingUpload, setPendingUpload] = useState<{ files: File[] } | null>(
    null,
  );
  const [folderChoices, setFolderChoices] = useState<string[]>([]);
  const [zoomMultiplier, setZoomMultiplier] = useState(1);
  const [containerWidth, setContainerWidth] = useState(800);
  const [viewportHeightBudget, setViewportHeightBudget] = useState(() =>
    typeof window !== "undefined" ? window.innerHeight * 0.7 : 600,
  );
  const [drawColor, setDrawColor] = useState(DRAW_COLOR_SWATCHES[0]);
  const [drawWidth, setDrawWidth] = useState(3);
  const [drawStyle, setDrawStyle] = useState<DrawStyle>("solid");
  const [fillColor, setFillColor] = useState(DRAW_COLOR_SWATCHES[1]);
  const [fillOpacity, setFillOpacity] = useState(0.3);
  const [mapShapes, setMapShapes] = useState<MapShape[]>([]);

  const [mapName, setMapName] = useState("");
  const [currentSavedMapId, setCurrentSavedMapId] = useState<string | null>(
    null,
  );
  const [isSavingMap, setIsSavingMap] = useState(false);
  const [isAttaching, setIsAttaching] = useState(false);
  const [isSavedMapsOpen, setIsSavedMapsOpen] = useState(false);
  const [savedMaps, setSavedMaps] = useState<SavedMap[]>([]);
  const [isLoadingSavedMaps, setIsLoadingSavedMaps] = useState(false);

  const stageRef = useRef<Konva.Stage>(null);
  const stageContainerRef = useRef<HTMLDivElement>(null);
  const uploadMenuRef = useRef<HTMLDivElement>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const bgImageRef = useRef<Konva.Image>(null);
  const backgroundBlobUrlRef = useRef<string | null>(null);
  const shapeRefs = useRef(new Map<string, Konva.Image>());
  const lineRefs = useRef(new Map<string, Konva.Line>());
  const mapShapeRefs = useRef(new Map<string, Konva.Shape>());
  const selectionRectRef = useRef<Konva.Rect>(null);
  const drawingLineRef = useRef<Konva.Line>(null);
  const previewLineRef = useRef<Konva.Line>(null);
  const previewArrowRef = useRef<Konva.Arrow>(null);
  const previewCircleRef = useRef<Konva.Circle>(null);
  const previewPolygonRef = useRef<Konva.Line>(null);

  const isSelectingRef = useRef(false);
  const selectionStartRef = useRef({ x: 0, y: 0 });
  const isDrawingRef = useRef(false);
  const drawingPointsRef = useRef<number[]>([]);
  const shapeDrawStartRef = useRef<{ x: number; y: number } | null>(null);
  const isDrawingPolygonRef = useRef(false);
  const polygonPointsRef = useRef<number[]>([]);
  const dragOriginRef = useRef<DragOrigin | null>(null);

  const getNode = (id: string): Konva.Node | undefined =>
    shapeRefs.current.get(id) ??
    lineRefs.current.get(id) ??
    mapShapeRefs.current.get(id);

  const getAllLayerEntries = (): [string, Konva.Node][] => [
    ...Array.from(shapeRefs.current.entries()),
    ...Array.from(lineRefs.current.entries()),
    ...Array.from(mapShapeRefs.current.entries()),
  ];

  const setMapShapeRef = (id: string, node: Konva.Shape | null) => {
    if (node) mapShapeRefs.current.set(id, node);
    else mapShapeRefs.current.delete(id);
  };

  const hidePreviewShapes = () => {
    previewLineRef.current?.visible(false);
    previewArrowRef.current?.visible(false);
    previewCircleRef.current?.visible(false);
    previewLineRef.current?.getLayer()?.batchDraw();
  };

  const hidePolygonPreview = () => {
    previewPolygonRef.current?.points([]);
    previewPolygonRef.current?.visible(false);
    previewPolygonRef.current?.getLayer()?.batchDraw();
  };

  useEffect(() => {
    if (!isUploadMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        uploadMenuRef.current &&
        !uploadMenuRef.current.contains(e.target as Node)
      ) {
        setIsUploadMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isUploadMenuOpen]);

  useEffect(() => {
    const el = stageContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = Math.round(entry.contentRect.width);
        if (width > 0) {
          setContainerWidth((prev) => (prev === width ? prev : width));
        }
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleResize = () =>
      setViewportHeightBudget(window.innerHeight * 0.7);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const widthBasedHeight =
    containerWidth * (canvasSize.height / canvasSize.width);
  const displayWidth =
    widthBasedHeight <= viewportHeightBudget
      ? containerWidth
      : viewportHeightBudget * (canvasSize.width / canvasSize.height);
  const displayHeight =
    widthBasedHeight <= viewportHeightBudget
      ? widthBasedHeight
      : viewportHeightBudget;
  const baseFitScale = displayWidth > 0 ? displayWidth / canvasSize.width : 1;
  const totalStageScale = baseFitScale * zoomMultiplier;
  const stagePosX = (displayWidth - canvasSize.width * totalStageScale) / 2;
  const stagePosY = (displayHeight - canvasSize.height * totalStageScale) / 2;

  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    const nodes = selectedIds
      .map((id) => getNode(id))
      .filter((node): node is Konva.Node => Boolean(node));
    transformer.nodes(nodes);
    transformer.getLayer()?.batchDraw();
  }, [selectedIds]);

  const deleteSelectedShapes = () => {
    if (selectedIds.length === 0) return;
    setOverlays((prev) => prev.filter((o) => !selectedIds.includes(o.id)));
    setLines((prev) => prev.filter((l) => !selectedIds.includes(l.id)));
    setMapShapes((prev) => prev.filter((s) => !selectedIds.includes(s.id)));
    selectedIds.forEach((id) => {
      shapeRefs.current.delete(id);
      lineRefs.current.delete(id);
      mapShapeRefs.current.delete(id);
    });
    setSelectedIds([]);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement
      )
        return;
      if (selectedIds.length === 0) return;
      e.preventDefault();
      setOverlays((prev) => prev.filter((o) => !selectedIds.includes(o.id)));
      setLines((prev) => prev.filter((l) => !selectedIds.includes(l.id)));
      setMapShapes((prev) => prev.filter((s) => !selectedIds.includes(s.id)));
      selectedIds.forEach((id) => {
        shapeRefs.current.delete(id);
        lineRefs.current.delete(id);
        mapShapeRefs.current.delete(id);
      });
      setSelectedIds([]);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIds]);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard loading flag ahead of an async fetch
    setIsLoadingLibrary(true);
    listMedia(libraryPath)
      .then((entries) => {
        if (!cancelled) setLibraryEntries(entries);
      })
      .catch(() => {
        if (!cancelled)
          setUploadError("Impossible de charger la banque de médias.");
      })
      .finally(() => {
        if (!cancelled) setIsLoadingLibrary(false);
      });
    return () => {
      cancelled = true;
    };
  }, [libraryPath]);

  const refreshLibrary = async () => {
    try {
      const entries = await listMedia(libraryPath);
      setLibraryEntries(entries);
    } catch {
      setUploadError("Impossible de charger la banque de médias.");
    }
  };

  const setShapeRef = (id: string, node: Konva.Image | null) => {
    if (node) shapeRefs.current.set(id, node);
    else shapeRefs.current.delete(id);
  };

  const setLineRef = (id: string, node: Konva.Line | null) => {
    if (node) lineRefs.current.set(id, node);
    else lineRefs.current.delete(id);
  };

  const handleSetTool = (next: Tool) => {
    if (tool === "polygon" && next !== "polygon") cancelPolygon();
    setTool(next);
    if (next !== "select") setSelectedIds([]);
  };

  const openFolderPicker = async (upload: { files: File[] }) => {
    setUploadError(null);
    try {
      const rootEntries = await listMedia("");
      setFolderChoices(
        rootEntries
          .filter((entry): entry is MediaFolder => entry.type === "folder")
          .map((f) => f.name),
      );
    } catch {
      setFolderChoices([]);
    }
    setPendingUpload(upload);
  };

  const handleConfirmFolder = async (folder: string) => {
    const upload = pendingUpload;
    if (!upload) return;
    setPendingUpload(null);
    setUploadError(null);

    if (folder === LOCAL_ONLY_VALUE) {
      const localFiles = upload.files.map((file) => ({
        url: URL.createObjectURL(file),
      }));
      await addOverlaysFromMedia(localFiles);
      return;
    }

    try {
      const uploaded = await Promise.all(
        upload.files.map((file) => uploadMedia(file, folder)),
      );
      await addOverlaysFromMedia(uploaded);
      if (libraryPath === folder) await refreshLibrary();
    } catch {
      setUploadError(
        "Échec de l'envoi d'une ou plusieurs images vers la banque de médias.",
      );
    }
  };

  const handleBackgroundChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadError(null);
    try {
      const compressed = await compressBackgroundImage(file);
      const url = URL.createObjectURL(compressed);
      if (backgroundBlobUrlRef.current)
        URL.revokeObjectURL(backgroundBlobUrlRef.current);
      backgroundBlobUrlRef.current = url;
      setBackgroundSrc(url);
    } catch {
      setUploadError("Échec du traitement de l'image de fond.");
    }
  };

  const addOverlaysFromMedia = async (files: { url: string }[]) => {
    const newOverlays: OverlayShape[] = [];
    let cascade = overlays.length;

    for (const file of files) {
      const { width, height } = await getImageSize(file.url);
      const scale = OVERLAY_SCALE;
      const w = width * scale;
      const h = height * scale;
      const offset = cascade * 24;
      newOverlays.push({
        id: crypto.randomUUID(),
        src: file.url,
        x: canvasSize.width / 2 - w / 2 + offset,
        y: canvasSize.height / 2 - h / 2 + offset,
        width: w,
        height: h,
        rotation: 0,
      });
      cascade += 1;
    }

    setOverlays((prev) => [...prev, ...newOverlays]);
  };

  const handleAddOverlays = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    e.target.value = "";
    if (!files || files.length === 0) return;
    await openFolderPicker({ files: Array.from(files) });
  };

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const defaultName = file.name.replace(/\.zip$/i, "");
    const folderName = window.prompt("Nom du sous-dossier :", defaultName);
    if (!folderName) return;

    setUploadError(null);
    setIsImportingZip(true);
    try {
      await uploadZipAsFolder(file, folderName);
      if (libraryPath === "") await refreshLibrary();
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : "Échec de l'import du fichier .zip.",
      );
    } finally {
      setIsImportingZip(false);
    }
  };

  const handleAddLibraryOverlay = async (file: MediaFile) => {
    await addOverlaysFromMedia([file]);
    setIsLibraryOpen(false);
  };

  const handleDeleteFile = async (file: MediaFile) => {
    try {
      await deleteMedia(file.path);
      await refreshLibrary();
    } catch {
      setUploadError("Échec de la suppression du média.");
    }
  };

  const handleDeleteFolder = async (folder: MediaFolder) => {
    try {
      await deleteFolder(folder.path);
      await refreshLibrary();
    } catch {
      setUploadError("Échec de la suppression du dossier.");
    }
  };

  const handleEnterFolder = (path: string) => {
    setLibraryPath(path);
    setSelectedMediaPaths([]);
  };

  const handleGoBackInLibrary = () => {
    setLibraryPath((prev) =>
      prev.includes("/") ? prev.slice(0, prev.lastIndexOf("/")) : "",
    );
    setSelectedMediaPaths([]);
  };

  const handleToggleMediaSelect = (path: string) => {
    setSelectedMediaPaths((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path],
    );
  };

  const handleClearMediaSelection = () => setSelectedMediaPaths([]);

  const handleBulkAddOverlay = async () => {
    const files = libraryEntries.filter(
      (entry): entry is MediaFile =>
        entry.type === "file" && selectedMediaPaths.includes(entry.path),
    );
    if (files.length === 0) return;
    await addOverlaysFromMedia(files);
    setSelectedMediaPaths([]);
    setIsLibraryOpen(false);
  };

  const handleBulkDeleteMedia = async () => {
    if (selectedMediaPaths.length === 0) return;
    try {
      await Promise.all(selectedMediaPaths.map((path) => deleteMedia(path)));
      setSelectedMediaPaths([]);
      await refreshLibrary();
    } catch {
      setUploadError("Échec de la suppression de certains médias.");
    }
  };

  const handleOverlayChange = (id: string, attrs: Partial<OverlayShape>) => {
    setOverlays((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...attrs } : o)),
    );
  };

  const handleLineChange = (id: string, attrs: Partial<DrawnLine>) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...attrs } : l)));
  };

  const handleMapShapeChange = (id: string, attrs: Partial<MapShape>) => {
    setMapShapes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...attrs } : s)),
    );
  };

  const handleOverlaySelect = (id: string, additive: boolean) => {
    setSelectedIds((prev) => {
      if (additive) {
        return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      }
      return [id];
    });
  };

  const handleCommitGroupMove = (
    origins: Map<string, { x: number; y: number }>,
    dx: number,
    dy: number,
  ) => {
    setOverlays((prev) =>
      prev.map((o) => {
        const start = origins.get(o.id);
        if (!start) return o;
        return { ...o, x: start.x + dx, y: start.y + dy };
      }),
    );
    setLines((prev) =>
      prev.map((l) => {
        const start = origins.get(l.id);
        if (!start) return l;
        return { ...l, x: start.x + dx, y: start.y + dy };
      }),
    );
    setMapShapes((prev) =>
      prev.map((s) => {
        const start = origins.get(s.id);
        if (!start) return s;
        return { ...s, x: start.x + dx, y: start.y + dy };
      }),
    );
  };

  const handleDuplicate = () => {
    if (selectedIds.length === 0) return;
    const offset = 20;
    const newOverlayShapes: OverlayShape[] = [];
    const newLineShapes: DrawnLine[] = [];
    const newMapShapes: MapShape[] = [];
    const newIds: string[] = [];

    overlays.forEach((o) => {
      if (selectedIds.includes(o.id)) {
        const id = crypto.randomUUID();
        newIds.push(id);
        newOverlayShapes.push({ ...o, id, x: o.x + offset, y: o.y + offset });
      }
    });
    lines.forEach((l) => {
      if (selectedIds.includes(l.id)) {
        const id = crypto.randomUUID();
        newIds.push(id);
        newLineShapes.push({ ...l, id, x: l.x + offset, y: l.y + offset });
      }
    });
    mapShapes.forEach((s) => {
      if (selectedIds.includes(s.id)) {
        const id = crypto.randomUUID();
        newIds.push(id);
        newMapShapes.push({ ...s, id, x: s.x + offset, y: s.y + offset });
      }
    });

    if (newIds.length === 0) return;
    if (newOverlayShapes.length > 0)
      setOverlays((prev) => [...prev, ...newOverlayShapes]);
    if (newLineShapes.length > 0)
      setLines((prev) => [...prev, ...newLineShapes]);
    if (newMapShapes.length > 0)
      setMapShapes((prev) => [...prev, ...newMapShapes]);
    setSelectedIds(newIds);
  };

  const zoomStage = (factor: number) => {
    setZoomMultiplier((prev) =>
      Math.min(MAX_STAGE_SCALE, Math.max(MIN_STAGE_SCALE, prev * factor)),
    );
  };

  const applyCanvasSize = (width: number, height: number) => {
    const w = Math.max(100, Math.min(4000, Math.round(width)));
    const h = Math.max(100, Math.min(4000, Math.round(height)));
    setCanvasSize({ width: w, height: h });
  };

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const preset = CANVAS_PRESETS.find(
      (p) => `${p.width}x${p.height}` === e.target.value,
    );
    if (preset) applyCanvasSize(preset.width, preset.height);
  };

  const startDrawing = (pos: { x: number; y: number }) => {
    isDrawingRef.current = true;
    drawingPointsRef.current = [pos.x, pos.y];
    drawingLineRef.current?.points(drawingPointsRef.current);
    drawingLineRef.current?.visible(true);
    drawingLineRef.current?.getLayer()?.batchDraw();
  };

  const continueDrawing = (pos: { x: number; y: number }) => {
    if (!isDrawingRef.current) return;
    drawingPointsRef.current = [...drawingPointsRef.current, pos.x, pos.y];
    drawingLineRef.current?.points(drawingPointsRef.current);
    drawingLineRef.current?.getLayer()?.batchDraw();
  };

  const finishDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const points =
      drawingPointsRef.current.length === 2
        ? [...drawingPointsRef.current, ...drawingPointsRef.current]
        : drawingPointsRef.current;
    if (points.length >= 4) {
      setLines((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          points,
          stroke: drawColor,
          strokeWidth: drawWidth,
          dash: getDashPattern(drawStyle, drawWidth),
          x: 0,
          y: 0,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
        },
      ]);
    }
    drawingPointsRef.current = [];
    drawingLineRef.current?.points([]);
    drawingLineRef.current?.visible(false);
    drawingLineRef.current?.getLayer()?.batchDraw();
  };

  const startShapeDraw = (pos: { x: number; y: number }) => {
    shapeDrawStartRef.current = pos;
    updateShapePreview(pos);
  };

  const updateShapePreview = (pos: { x: number; y: number }) => {
    const start = shapeDrawStartRef.current;
    if (!start || !isShapeKind(tool)) return;
    const dx = pos.x - start.x;
    const dy = pos.y - start.y;

    if (tool === "line") {
      previewLineRef.current?.setAttrs({
        points: [start.x, start.y, pos.x, pos.y],
        visible: true,
      });
      previewLineRef.current?.getLayer()?.batchDraw();
    } else if (tool === "arrow") {
      previewArrowRef.current?.setAttrs({
        points: [start.x, start.y, pos.x, pos.y],
        visible: true,
      });
      previewArrowRef.current?.getLayer()?.batchDraw();
    } else if (tool === "circle") {
      previewCircleRef.current?.setAttrs({
        x: start.x,
        y: start.y,
        radius: Math.hypot(dx, dy),
        visible: true,
      });
      previewCircleRef.current?.getLayer()?.batchDraw();
    }
  };

  const finishShapeDraw = () => {
    const start = shapeDrawStartRef.current;
    if (!start || !isShapeKind(tool)) return;
    const kind = tool;

    const base = {
      id: crypto.randomUUID(),
      kind,
      stroke: drawColor,
      strokeWidth: drawWidth,
      dash: getDashPattern(drawStyle, drawWidth),
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      fill: fillColor,
      fillOpacity,
    };

    let newShape: MapShape | null = null;

    if (kind === "line" || kind === "arrow") {
      const node =
        kind === "line" ? previewLineRef.current : previewArrowRef.current;
      const points = node?.points() ?? [];
      if (
        points.length >= 4 &&
        Math.hypot(points[2] - points[0], points[3] - points[1]) > 4
      ) {
        newShape = { ...base, x: 0, y: 0, points, radius: 0 };
      }
    } else if (kind === "circle") {
      const node = previewCircleRef.current;
      const radius = node?.radius() ?? 0;
      if (radius > 4) {
        newShape = {
          ...base,
          x: node?.x() ?? 0,
          y: node?.y() ?? 0,
          points: [],
          radius,
        };
      }
    }

    if (newShape) setMapShapes((prev) => [...prev, newShape as MapShape]);
    shapeDrawStartRef.current = null;
    hidePreviewShapes();
  };

  const startPolygon = (pos: { x: number; y: number }) => {
    isDrawingPolygonRef.current = true;
    polygonPointsRef.current = [pos.x, pos.y];
    previewPolygonRef.current?.setAttrs({
      points: polygonPointsRef.current,
      visible: true,
    });
    previewPolygonRef.current?.getLayer()?.batchDraw();
  };

  const addPolygonPoint = (pos: { x: number; y: number }) => {
    polygonPointsRef.current = [...polygonPointsRef.current, pos.x, pos.y];
    previewPolygonRef.current?.setAttrs({ points: polygonPointsRef.current });
    previewPolygonRef.current?.getLayer()?.batchDraw();
  };

  const updatePolygonRubberBand = (pos: { x: number; y: number }) => {
    if (!isDrawingPolygonRef.current) return;
    previewPolygonRef.current?.setAttrs({
      points: [...polygonPointsRef.current, pos.x, pos.y],
    });
    previewPolygonRef.current?.getLayer()?.batchDraw();
  };

  const finishPolygon = () => {
    if (!isDrawingPolygonRef.current) return;
    isDrawingPolygonRef.current = false;
    const points = polygonPointsRef.current;
    if (points.length >= 6) {
      setMapShapes((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          kind: "polygon",
          x: 0,
          y: 0,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          stroke: drawColor,
          strokeWidth: drawWidth,
          dash: getDashPattern(drawStyle, drawWidth),
          points,
          radius: 0,
          fill: fillColor,
          fillOpacity,
        },
      ]);
    }
    polygonPointsRef.current = [];
    hidePolygonPreview();
  };

  const cancelPolygon = () => {
    isDrawingPolygonRef.current = false;
    polygonPointsRef.current = [];
    hidePolygonPreview();
  };

  useEffect(() => {
    const handlePolygonKeyDown = (e: KeyboardEvent) => {
      if (tool !== "polygon" || !isDrawingPolygonRef.current) return;
      if (e.key === "Enter") {
        e.preventDefault();
        finishPolygon();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancelPolygon();
      }
    };
    window.addEventListener("keydown", handlePolygonKeyDown);
    return () => window.removeEventListener("keydown", handlePolygonKeyDown);
  }, [tool, drawColor, drawWidth, drawStyle, fillColor, fillOpacity]);

  const handlePointerDown = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;
    const pos = stage.getRelativePointerPosition();
    if (!pos) return;

    if (tool === "draw") {
      startDrawing(pos);
      return;
    }

    if (isShapeKind(tool)) {
      startShapeDraw(pos);
      return;
    }

    if (tool === "polygon") {
      if (isDrawingPolygonRef.current) {
        addPolygonPoint(pos);
      } else {
        startPolygon(pos);
      }
      return;
    }

    const target = e.target;
    const name = target.name?.();
    const isEmptyArea = target === stage || name === "canvas-backdrop";
    const isBackground = name === "background-image";

    if (isBackground) {
      setSelectedIds([]);
      return;
    }

    if (isEmptyArea) {
      setSelectedIds([]);
      isSelectingRef.current = true;
      selectionStartRef.current = pos;
      selectionRectRef.current?.setAttrs({
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        visible: true,
      });
      selectionRectRef.current?.getLayer()?.batchDraw();
    }
  };

  const handlePointerMove = () => {
    const stage = stageRef.current;
    if (!stage) return;
    const pos = stage.getRelativePointerPosition();
    if (!pos) return;

    if (tool === "draw" && isDrawingRef.current) {
      continueDrawing(pos);
      return;
    }

    if (isShapeKind(tool) && shapeDrawStartRef.current) {
      updateShapePreview(pos);
      return;
    }

    if (tool === "polygon" && isDrawingPolygonRef.current) {
      updatePolygonRubberBand(pos);
      return;
    }

    if (isSelectingRef.current) {
      const start = selectionStartRef.current;
      const x = Math.min(start.x, pos.x);
      const y = Math.min(start.y, pos.y);
      const width = Math.abs(pos.x - start.x);
      const height = Math.abs(pos.y - start.y);
      selectionRectRef.current?.setAttrs({ x, y, width, height });
      selectionRectRef.current?.getLayer()?.batchDraw();
    }
  };

  const handlePointerUp = () => {
    if (tool === "draw" && isDrawingRef.current) {
      finishDrawing();
      return;
    }

    if (isShapeKind(tool) && shapeDrawStartRef.current) {
      finishShapeDraw();
      return;
    }

    if (tool === "polygon") {
      return;
    }

    if (isSelectingRef.current) {
      isSelectingRef.current = false;
      const box = selectionRectRef.current?.getClientRect();
      selectionRectRef.current?.setAttrs({
        visible: false,
        width: 0,
        height: 0,
      });
      selectionRectRef.current?.getLayer()?.batchDraw();

      if (box && (box.width > 2 || box.height > 2)) {
        const matches: string[] = [];
        overlays.forEach((o) => {
          const node = shapeRefs.current.get(o.id);
          if (!node) return;
          if (Konva.Util.haveIntersection(box, node.getClientRect())) {
            matches.push(o.id);
          }
        });
        lines.forEach((l) => {
          const node = lineRefs.current.get(l.id);
          if (!node) return;
          if (Konva.Util.haveIntersection(box, node.getClientRect())) {
            matches.push(l.id);
          }
        });
        mapShapes.forEach((s) => {
          const node = mapShapeRefs.current.get(s.id);
          if (!node) return;
          if (Konva.Util.haveIntersection(box, node.getClientRect())) {
            matches.push(s.id);
          }
        });
        setSelectedIds(matches);
      }
    }
  };

  const getStagePngDataUrl = (): string | null => {
    const stage = stageRef.current;
    if (!stage) return null;

    const prevSelection = [...selectedIds];
    transformerRef.current?.nodes([]);
    stage.batchDraw();

    const dataUrl = stage.toDataURL({ pixelRatio: 2, mimeType: "image/png" });

    if (prevSelection.length > 0) {
      const nodes = prevSelection
        .map((id) => getNode(id))
        .filter((node): node is Konva.Node => Boolean(node));
      transformerRef.current?.nodes(nodes);
    }
    stage.batchDraw();

    return dataUrl;
  };

  const handleExport = () => {
    const dataUrl = getStagePngDataUrl();
    if (!dataUrl) return;
    downloadDataUrl(dataUrl, `${sanitizeSegment(mapName || "carte")}.png`);
  };

  const persistBlobUrl = async (
    src: string,
    folder: string,
  ): Promise<string> => {
    if (!src.startsWith("blob:")) return src;
    const blob = await (await fetch(src)).blob();
    const file = new File([blob], "image", {
      type: blob.type || "image/png",
    });
    const uploaded = await uploadMedia(file, folder);
    return uploaded.url;
  };

  const persistProjectAssets = async (): Promise<MapEditorData> => {
    const persistedBackground = backgroundSrc
      ? await persistBlobUrl(backgroundSrc, "cartes-fonds")
      : null;
    const persistedOverlays = await Promise.all(
      overlays.map(async (o) => ({
        ...o,
        src: await persistBlobUrl(o.src, "cartes-fonds"),
      })),
    );

    if (persistedBackground !== backgroundSrc) {
      if (backgroundBlobUrlRef.current) {
        URL.revokeObjectURL(backgroundBlobUrlRef.current);
        backgroundBlobUrlRef.current = null;
      }
      setBackgroundSrc(persistedBackground);
    }
    if (persistedOverlays.some((o, i) => o.src !== overlays[i]?.src)) {
      setOverlays(persistedOverlays);
    }

    return {
      backgroundSrc: persistedBackground,
      canvasSize,
      overlays: persistedOverlays,
      lines,
      mapShapes,
    };
  };

  const loadProjectData = (data: MapEditorData) => {
    setBackgroundSrc(data.backgroundSrc);
    setCanvasSize(data.canvasSize);
    setOverlays(data.overlays);
    setLines(data.lines);
    setMapShapes(data.mapShapes);
    setSelectedIds([]);
  };

  const handleNewMap = () => {
    setBackgroundSrc(DEFAULT_BACKGROUND_URL);
    setCanvasSize({ width: 1200, height: 800 });
    setOverlays([]);
    setLines([]);
    setMapShapes([]);
    setSelectedIds([]);
    setMapName("");
    setCurrentSavedMapId(null);
  };

  const handleSaveMap = async () => {
    const name = mapName.trim();
    if (!name) {
      setUploadError("Donne un nom à la carte avant de l'enregistrer.");
      return;
    }
    setUploadError(null);
    setIsSavingMap(true);
    try {
      const data = await persistProjectAssets();
      const dataUrl = getStagePngDataUrl();
      let previewUrl: string | null = null;
      if (dataUrl) {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], "apercu.png", { type: "image/png" });
        const uploaded = await uploadMedia(file, "cartes");
        previewUrl = uploaded.url;
      }
      const payload = { name, data, preview_url: previewUrl };
      if (currentSavedMapId) {
        await updateSavedMap(currentSavedMapId, payload);
      } else {
        const created = await createSavedMap(payload);
        setCurrentSavedMapId(created.id);
      }
    } catch {
      setUploadError("Échec de l'enregistrement de la carte.");
    } finally {
      setIsSavingMap(false);
    }
  };

  const openSavedMaps = () => {
    setIsSavedMapsOpen(true);
    setIsLoadingSavedMaps(true);
    listSavedMaps()
      .then(setSavedMaps)
      .catch(() =>
        setUploadError("Impossible de charger les cartes enregistrées."),
      )
      .finally(() => setIsLoadingSavedMaps(false));
  };

  const handleLoadSavedMap = (map: SavedMap) => {
    loadProjectData(map.data as MapEditorData);
    setMapName(map.name);
    setCurrentSavedMapId(map.id);
    setIsSavedMapsOpen(false);
  };

  const handleRenameSavedMap = async (map: SavedMap) => {
    const name = window.prompt("Nom de la carte :", map.name);
    if (!name || name === map.name) return;
    try {
      await updateSavedMap(map.id, {
        name,
        data: map.data,
        preview_url: map.preview_url,
      });
      setSavedMaps((prev) =>
        prev.map((m) => (m.id === map.id ? { ...m, name } : m)),
      );
      if (currentSavedMapId === map.id) setMapName(name);
    } catch {
      setUploadError("Échec du renommage de la carte.");
    }
  };

  const handleDeleteSavedMap = async (map: SavedMap) => {
    if (!window.confirm(`Supprimer la carte "${map.name}" ?`)) return;
    try {
      await deleteSavedMap(map.id);
      setSavedMaps((prev) => prev.filter((m) => m.id !== map.id));
      if (currentSavedMapId === map.id) setCurrentSavedMapId(null);
    } catch {
      setUploadError("Échec de la suppression de la carte.");
    }
  };

  const handleAttach = async () => {
    if (!onAttach) return;
    setIsAttaching(true);
    setUploadError(null);
    try {
      const dataUrl = getStagePngDataUrl();
      if (!dataUrl) return;
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "carte.png", { type: "image/png" });
      const uploaded = await uploadMedia(file, "chapitres");
      onAttach({ name: mapName.trim() || "Carte", url: uploaded.url });
    } catch {
      setUploadError("Échec du téléversement de la carte.");
    } finally {
      setIsAttaching(false);
    }
  };

  const handleAttachSavedMap = (map: SavedMap) => {
    if (!onAttach || !map.preview_url) return;
    onAttach({ name: map.name, url: map.preview_url });
  };

  return (
    <div className="flex flex-1 flex-col items-center gap-6 bg-background px-6 py-4 font-sans">
      {embedded && (
        <div className="flex w-full max-w-[1200px] items-center justify-between">
          <h2 className="font-semibold text-foreground">Éditeur de carte</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleAttach}
              disabled={isAttaching}
              className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Check size={16} />
              {isAttaching ? "…" : "Joindre au chapitre"}
            </button>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-center gap-4">
        <input
          type="text"
          value={mapName}
          onChange={(e) => setMapName(e.target.value)}
          placeholder="Nom de la carte"
          className="rounded-full border border-black/[.08] bg-white px-4 py-2 text-sm text-foreground dark:border-white/[.145] dark:bg-zinc-900"
        />
        <div ref={uploadMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsUploadMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
          >
            <Menu size={16} />
            Fichiers
          </button>

          {isUploadMenuOpen && (
            <div className="absolute left-0 top-full z-20 mt-2 w-64 rounded-lg border border-black/[.08] bg-white p-1 shadow-lg dark:border-white/[.145] dark:bg-zinc-900">
              <label className="block cursor-pointer rounded px-3 py-2 text-sm transition-colors hover:bg-black/[.04] dark:hover:bg-white/[.08]">
                Modifier l&apos;image de fond
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    handleBackgroundChange(e);
                    setIsUploadMenuOpen(false);
                  }}
                />
              </label>

              <label className="block cursor-pointer rounded px-3 py-2 text-sm transition-colors hover:bg-black/[.04] dark:hover:bg-white/[.08]">
                Ajouter une image
                <input
                  type="file"
                  accept="image/png"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    handleAddOverlays(e);
                    setIsUploadMenuOpen(false);
                  }}
                />
              </label>

              <label className="flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-sm transition-colors hover:bg-black/[.04] dark:hover:bg-white/[.08]">
                <Archive size={16} />
                {isImportingZip ? "Import en cours…" : "Importer un .zip"}
                <input
                  type="file"
                  accept=".zip,application/zip,application/x-zip-compressed"
                  className="hidden"
                  disabled={isImportingZip}
                  onChange={(e) => {
                    handleZipUpload(e);
                    setIsUploadMenuOpen(false);
                  }}
                />
              </label>
            </div>
          )}
        </div>

        <button
          onClick={() => {
            setLibraryPath(DEFAULT_LIBRARY_FOLDER);
            setSelectedMediaPaths([]);
            setIsLibraryOpen(true);
          }}
          className="flex items-center gap-2 rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
        >
          <Images size={16} />
          Banque de médias
        </button>

        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <span>Format</span>
          <select
            value={`${canvasSize.width}x${canvasSize.height}`}
            onChange={handlePresetChange}
            className="rounded border border-black/[.08] bg-white px-2 py-1 dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50"
          >
            {CANVAS_PRESETS.map((p) => (
              <option key={p.label} value={`${p.width}x${p.height}`}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-nowrap items-center gap-2">
          <button
            type="button"
            onClick={handleNewMap}
            className="flex items-center gap-2 whitespace-nowrap rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
          >
            <FilePlus size={16} />
            Nouvelle carte
          </button>

          <button
            type="button"
            onClick={openSavedMaps}
            className="flex items-center gap-2 whitespace-nowrap rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
          >
            <Library size={16} />
            Mes cartes
          </button>

          <button
            type="button"
            onClick={handleSaveMap}
            disabled={isSavingMap}
            className="flex items-center gap-2 whitespace-nowrap rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
          >
            <Save size={16} />
            {isSavingMap ? "…" : "Enregistrer"}
          </button>

          <button
            onClick={handleExport}
            className="whitespace-nowrap rounded-full bg-accent px-5 py-2 text-sm font-medium text-[#1c1c1c] transition-colors hover:bg-[#d49f00]"
          >
            Exporter
          </button>
        </div>
      </div>

      {uploadError && (
        <p className="text-sm text-red-600 dark:text-red-400">{uploadError}</p>
      )}

      {(tool === "draw" || isShapeKind(tool) || tool === "polygon") && (
        <div className="flex w-full max-w-[1200px] flex-wrap items-center gap-4 rounded-xl border border-black/[.08] bg-white p-3 text-sm dark:border-white/[.145] dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <span className="text-zinc-600 dark:text-zinc-400">Couleur</span>
            {DRAW_COLOR_SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setDrawColor(c)}
                aria-label={`Couleur ${c}`}
                className={`h-6 w-6 rounded-full border-2 ${
                  drawColor === c ? "border-primary" : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
            <input
              type="color"
              value={drawColor}
              onChange={(e) => setDrawColor(e.target.value)}
              aria-label="Couleur personnalisée"
              className="h-6 w-8 cursor-pointer rounded border border-black/[.08] bg-transparent dark:border-white/[.145]"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-600 dark:text-zinc-400">Style</span>
            <select
              value={drawStyle}
              onChange={(e) => setDrawStyle(e.target.value as DrawStyle)}
              className="rounded border border-black/[.08] bg-white px-2 py-1 dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50"
            >
              <option value="solid">Plein</option>
              <option value="dashed">Pointillé</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-600 dark:text-zinc-400">Épaisseur</span>
            <input
              type="range"
              min={1}
              max={20}
              value={drawWidth}
              onChange={(e) => setDrawWidth(Number(e.target.value))}
              className="w-32"
            />
            <span className="w-6 text-right text-zinc-600 dark:text-zinc-400">
              {drawWidth}
            </span>
          </div>

          {tool === "polygon" && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-zinc-600 dark:text-zinc-400">
                  Remplissage
                </span>
                {DRAW_COLOR_SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFillColor(c)}
                    aria-label={`Couleur de remplissage ${c}`}
                    className={`h-6 w-6 rounded-full border-2 ${
                      fillColor === c ? "border-primary" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="color"
                  value={fillColor}
                  onChange={(e) => setFillColor(e.target.value)}
                  aria-label="Couleur de remplissage personnalisée"
                  className="h-6 w-8 cursor-pointer rounded border border-black/[.08] bg-transparent dark:border-white/[.145]"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-zinc-600 dark:text-zinc-400">
                  Opacité du remplissage
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={fillOpacity}
                  onChange={(e) => setFillOpacity(Number(e.target.value))}
                  className="w-32"
                />
                <span className="w-10 text-right text-zinc-600 dark:text-zinc-400">
                  {Math.round(fillOpacity * 100)}%
                </span>
              </div>
            </>
          )}
        </div>
      )}

      <div className="flex w-full max-w-[1200px] items-start justify-center gap-4">
        <div className="flex flex-col gap-2 rounded-xl border border-black/[.08] bg-white p-2 dark:border-white/[.145] dark:bg-zinc-900">
          <ToolbarButton
            label={
              pinLayersToBackground
                ? "Détacher les calques du fond"
                : "Fixer les calques au fond"
            }
            active={pinLayersToBackground}
            onClick={() => setPinLayersToBackground((prev) => !prev)}
          >
            {pinLayersToBackground ? (
              <Lock size={18} />
            ) : (
              <LockOpen size={18} />
            )}
          </ToolbarButton>
          <div className="my-1 h-px bg-black/[.08] dark:bg-white/[.145]" />
          <ToolbarButton
            label="Sélectionner"
            active={tool === "select"}
            onClick={() => handleSetTool("select")}
          >
            <MousePointer2 size={18} />
          </ToolbarButton>
          <ToolbarButton
            label="Dessiner un tracé"
            active={tool === "draw"}
            onClick={() => handleSetTool("draw")}
          >
            <Pencil size={18} />
          </ToolbarButton>
          <ToolbarButton
            label="Ligne"
            active={tool === "line"}
            onClick={() => handleSetTool("line")}
          >
            <Slash size={18} />
          </ToolbarButton>
          <ToolbarButton
            label="Flèche"
            active={tool === "arrow"}
            onClick={() => handleSetTool("arrow")}
          >
            <ArrowUpRight size={18} />
          </ToolbarButton>
          <ToolbarButton
            label="Polygone"
            active={tool === "polygon"}
            onClick={() => handleSetTool("polygon")}
          >
            <Pentagon size={18} />
          </ToolbarButton>
          <ToolbarButton
            label="Cercle"
            active={tool === "circle"}
            onClick={() => handleSetTool("circle")}
          >
            <CircleIcon size={18} />
          </ToolbarButton>
          <div className="my-1 h-px bg-black/[.08] dark:bg-white/[.145]" />
          <ToolbarButton label="Zoomer" onClick={() => zoomStage(1.2)}>
            <ZoomIn size={18} />
          </ToolbarButton>
          <div
            className="select-none text-center text-xs font-medium text-zinc-500 dark:text-zinc-400"
            title="Niveau de zoom du plan de travail"
          >
            {Math.round(zoomMultiplier * 100)}%
          </div>
          <ToolbarButton label="Dézoomer" onClick={() => zoomStage(1 / 1.2)}>
            <ZoomOut size={18} />
          </ToolbarButton>
          <div className="my-1 h-px bg-black/[.08] dark:bg-white/[.145]" />
          <ToolbarButton
            label="Dupliquer la sélection"
            onClick={handleDuplicate}
            disabled={selectedIds.length === 0}
          >
            <Copy size={18} />
          </ToolbarButton>
          <ToolbarButton
            label="Supprimer la sélection"
            onClick={deleteSelectedShapes}
            disabled={selectedIds.length === 0}
          >
            <Trash2 size={18} />
          </ToolbarButton>
        </div>

        <div ref={stageContainerRef} className="w-full max-w-[900px]">
          <div
            className="mx-auto overflow-hidden rounded border border-zinc-300 bg-white dark:border-zinc-700"
            style={{ width: displayWidth, height: displayHeight }}
          >
            <Stage
              ref={stageRef}
              width={displayWidth}
              height={displayHeight}
              scaleX={totalStageScale}
              scaleY={totalStageScale}
              x={stagePosX}
              y={stagePosY}
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
            >
              <Layer>
                <Rect
                  x={0}
                  y={0}
                  width={canvasSize.width}
                  height={canvasSize.height}
                  fill="#e4e4e7"
                  name="canvas-backdrop"
                />
                {backgroundSrc && (
                  <BackgroundImage
                    src={backgroundSrc}
                    imageRef={bgImageRef}
                    draggable={tool === "select"}
                    canvasSize={canvasSize}
                    pinLayers={pinLayersToBackground}
                    getAllLayerEntries={getAllLayerEntries}
                    onCommitPan={handleCommitGroupMove}
                  />
                )}
                {overlays.map((shape) => (
                  <OverlayImage
                    key={shape.id}
                    shape={shape}
                    selectedIds={selectedIds}
                    draggable={tool === "select"}
                    onSelect={handleOverlaySelect}
                    onChange={(attrs) => handleOverlayChange(shape.id, attrs)}
                    setShapeRef={setShapeRef}
                    getNode={getNode}
                    dragOriginRef={dragOriginRef}
                    onCommitGroupMove={handleCommitGroupMove}
                  />
                ))}
                {lines.map((line) => (
                  <LineShape
                    key={line.id}
                    shape={line}
                    selectedIds={selectedIds}
                    draggable={tool === "select"}
                    onSelect={handleOverlaySelect}
                    onChange={(attrs) => handleLineChange(line.id, attrs)}
                    setLineRef={setLineRef}
                    getNode={getNode}
                    dragOriginRef={dragOriginRef}
                    onCommitGroupMove={handleCommitGroupMove}
                  />
                ))}
                {mapShapes.map((shape) => (
                  <MapShapeItem
                    key={shape.id}
                    shape={shape}
                    selectedIds={selectedIds}
                    draggable={tool === "select"}
                    onSelect={handleOverlaySelect}
                    onChange={(attrs) => handleMapShapeChange(shape.id, attrs)}
                    setShapeItemRef={setMapShapeRef}
                    getNode={getNode}
                    dragOriginRef={dragOriginRef}
                    onCommitGroupMove={handleCommitGroupMove}
                  />
                ))}
                <Line
                  ref={previewLineRef}
                  points={EMPTY_POINTS}
                  stroke={drawColor}
                  strokeWidth={drawWidth}
                  dash={getDashPattern(drawStyle, drawWidth)}
                  visible={false}
                  listening={false}
                />
                <Arrow
                  ref={previewArrowRef}
                  points={EMPTY_POINTS}
                  stroke={drawColor}
                  fill={drawColor}
                  strokeWidth={drawWidth}
                  dash={getDashPattern(drawStyle, drawWidth)}
                  pointerLength={12}
                  pointerWidth={12}
                  visible={false}
                  listening={false}
                />
                <Circle
                  ref={previewCircleRef}
                  stroke={drawColor}
                  strokeWidth={drawWidth}
                  dash={getDashPattern(drawStyle, drawWidth)}
                  fillEnabled={false}
                  visible={false}
                  listening={false}
                />
                <Line
                  ref={previewPolygonRef}
                  points={EMPTY_POINTS}
                  stroke={drawColor}
                  strokeWidth={drawWidth}
                  dash={getDashPattern(drawStyle, drawWidth)}
                  closed
                  fill={hexToRgba(fillColor, fillOpacity)}
                  lineJoin="round"
                  visible={false}
                  listening={false}
                />
                <Line
                  ref={drawingLineRef}
                  points={EMPTY_POINTS}
                  stroke={drawColor}
                  strokeWidth={drawWidth}
                  dash={getDashPattern(drawStyle, drawWidth)}
                  tension={0}
                  lineCap="round"
                  lineJoin="round"
                  visible={false}
                  listening={false}
                />
                <Transformer
                  ref={transformerRef}
                  rotateEnabled
                  anchorSize={8}
                  borderStroke="#0e4fa7"
                  anchorStroke="#0e4fa7"
                  anchorFill="#ffffff"
                />
                <Rect
                  ref={selectionRectRef}
                  visible={false}
                  fill="rgba(14,79,167,0.15)"
                  stroke="#0e4fa7"
                  strokeWidth={1}
                  listening={false}
                />
              </Layer>
              <Layer
                listening={false}
                scaleX={1 / totalStageScale}
                scaleY={1 / totalStageScale}
                x={-stagePosX / totalStageScale}
                y={-stagePosY / totalStageScale}
              >
                <MapWatermark
                  displayWidth={displayWidth}
                  displayHeight={displayHeight}
                />
              </Layer>
            </Stage>
          </div>
        </div>
      </div>

      <p className="max-w-2xl text-center text-sm text-zinc-500 dark:text-zinc-400">
        Glisser l&apos;image de fond pour la déplacer. Utilisez les boutons +/-
        pour zoomer. Cliquez une image pour la sélectionner (Maj+clic pour en
        ajouter plusieurs, ou glissez sur une zone vide pour un rectangle de
        sélection). Supprimer/Retour arrière efface la sélection. Le zoom du
        plan de travail (+/-) sert à cadrer : l&apos;export capture exactement
        ce qui est visible à l&apos;écran. Pour l&apos;outil Polygone : cliquez
        pour ajouter chaque point, Entrée pour terminer, Échap pour annuler.
      </p>

      {isLibraryOpen && (
        <MediaLibraryPanel
          entries={libraryEntries}
          currentPath={libraryPath}
          isLoading={isLoadingLibrary}
          selectedPaths={selectedMediaPaths}
          onClose={() => {
            setIsLibraryOpen(false);
            setSelectedMediaPaths([]);
          }}
          onEnterFolder={handleEnterFolder}
          onGoBack={handleGoBackInLibrary}
          onAddAsOverlay={handleAddLibraryOverlay}
          onDeleteFile={handleDeleteFile}
          onDeleteFolder={handleDeleteFolder}
          onToggleSelect={handleToggleMediaSelect}
          onClearSelection={handleClearMediaSelection}
          onBulkAddOverlay={handleBulkAddOverlay}
          onBulkDelete={handleBulkDeleteMedia}
        />
      )}

      {pendingUpload && (
        <FolderPickerModal
          folders={folderChoices}
          fileCount={pendingUpload.files.length}
          onConfirm={handleConfirmFolder}
          onCancel={() => setPendingUpload(null)}
        />
      )}

      {isSavedMapsOpen && (
        <SavedMapsPanel
          maps={savedMaps}
          isLoading={isLoadingSavedMaps}
          canAttach={Boolean(onAttach)}
          onClose={() => setIsSavedMapsOpen(false)}
          onLoad={handleLoadSavedMap}
          onRename={handleRenameSavedMap}
          onDelete={handleDeleteSavedMap}
          onAttach={handleAttachSavedMap}
        />
      )}
    </div>
  );
}

function SavedMapsPanel({
  maps,
  isLoading,
  canAttach,
  onClose,
  onLoad,
  onRename,
  onDelete,
  onAttach,
}: {
  maps: SavedMap[];
  isLoading: boolean;
  canAttach: boolean;
  onClose: () => void;
  onLoad: (map: SavedMap) => void;
  onRename: (map: SavedMap) => void;
  onDelete: (map: SavedMap) => void;
  onAttach: (map: SavedMap) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-3xl flex-col gap-4 overflow-hidden rounded-xl bg-white p-6 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
            Mes cartes
          </h2>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full p-1 hover:bg-black/[.04] dark:hover:bg-white/[.08]"
          >
            <X size={20} />
          </button>
        </div>

        {isLoading && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Chargement…
          </p>
        )}
        {!isLoading && maps.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Aucune carte enregistrée pour l&apos;instant.
          </p>
        )}

        <div className="grid max-h-[60vh] grid-cols-2 gap-4 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
          {maps.map((map) => (
            <div
              key={map.id}
              className="group relative flex flex-col gap-2 rounded-lg border border-black/[.08] p-2 dark:border-white/[.145]"
            >
              <button
                type="button"
                onClick={() => onLoad(map)}
                className="flex aspect-video items-center justify-center overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800"
              >
                {map.preview_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={map.preview_url}
                    alt={map.name}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Library size={24} className="text-zinc-400" />
                )}
              </button>
              <span className="truncate text-xs text-zinc-700 dark:text-zinc-300">
                {map.name}
              </span>
              <div className="flex items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={() => onRename(map)}
                  aria-label="Renommer"
                  className="rounded p-1 text-zinc-500 hover:bg-black/[.04] dark:hover:bg-white/[.08]"
                >
                  <Pencil size={14} />
                </button>
                {canAttach && (
                  <button
                    type="button"
                    onClick={() => onAttach(map)}
                    aria-label="Joindre au chapitre"
                    className="rounded p-1 text-primary hover:bg-black/[.04] dark:hover:bg-white/[.08]"
                  >
                    <Paperclip size={14} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onDelete(map)}
                  aria-label="Supprimer"
                  className="rounded p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
