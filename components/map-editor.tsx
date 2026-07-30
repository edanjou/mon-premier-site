"use client";

import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import {
  Archive,
  ArrowLeft,
  Copy,
  Folder,
  Images,
  MousePointer2,
  Pencil,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
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

type Tool = "select" | "draw";

type OverlayShape = {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

type DrawnLine = {
  id: string;
  points: number[];
};

type CanvasSize = {
  width: number;
  height: number;
};

const CANVAS_PRESETS: { label: string; width: number; height: number }[] = [
  { label: "1000 × 640 (par défaut)", width: 1000, height: 640 },
  { label: "1200 × 800", width: 1200, height: 800 },
  { label: "1920 × 1080 (Full HD)", width: 1920, height: 1080 },
  { label: "800 × 800 (carré)", width: 800, height: 800 },
];

const MIN_STAGE_SCALE = 0.2;
const MAX_STAGE_SCALE = 4;

function getImageSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = src;
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
        className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
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
  onClose,
  onEnterFolder,
  onGoBack,
  onUseAsBackground,
  onAddAsOverlay,
  onDeleteFile,
  onDeleteFolder,
}: {
  entries: MediaEntry[];
  currentPath: string;
  isLoading: boolean;
  onClose: () => void;
  onEnterFolder: (path: string) => void;
  onGoBack: () => void;
  onUseAsBackground: (file: MediaFile) => void;
  onAddAsOverlay: (file: MediaFile) => void;
  onDeleteFile: (file: MediaFile) => void;
  onDeleteFolder: (folder: MediaFolder) => void;
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

        {isLoading && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Chargement…</p>
        )}
        {!isLoading && entries.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {currentPath
              ? "Ce dossier est vide."
              : "Aucune image pour l'instant. Les images ajoutées via \"Image de fond\", \"Ajouter une image\" ou un import .zip apparaîtront ici automatiquement."}
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
                className="group relative overflow-hidden rounded-lg border border-black/[.08] dark:border-white/[.145]"
              >
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
                <div className="absolute inset-x-0 bottom-0 flex gap-1 bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => onUseAsBackground(entry)}
                    className="flex-1 rounded bg-white/90 px-2 py-1 text-xs font-medium text-black hover:bg-white"
                  >
                    Fond
                  </button>
                  <button
                    onClick={() => onAddAsOverlay(entry)}
                    className="flex-1 rounded bg-white/90 px-2 py-1 text-xs font-medium text-black hover:bg-white"
                  >
                    Calque
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
  const [selected, setSelected] = useState("");
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
              <option value="">Racine (aucun dossier)</option>
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

function BackgroundImage({
  src,
  imageRef,
  draggable,
  canvasSize,
}: {
  src: string;
  imageRef: React.RefObject<Konva.Image | null>;
  draggable: boolean;
  canvasSize: CanvasSize;
}) {
  const [image] = useImage(src, "anonymous");
  const hasFitRef = useRef(false);

  useEffect(() => {
    if (!image || hasFitRef.current || !imageRef.current) return;
    const scale = Math.min(
      canvasSize.width / image.width,
      canvasSize.height / image.height,
    );
    imageRef.current.scale({ x: scale, y: scale });
    imageRef.current.position({
      x: (canvasSize.width - image.width * scale) / 2,
      y: (canvasSize.height - image.height * scale) / 2,
    });
    imageRef.current.getLayer()?.batchDraw();
    hasFitRef.current = true;
  }, [image, imageRef, canvasSize]);

  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const node = e.target as Konva.Image;
    const stage = node.getStage();
    const pointer = stage?.getPointerPosition();
    if (!stage || !pointer) return;

    const oldScale = node.scaleX();
    const mousePointTo = {
      x: (pointer.x - node.x()) / oldScale,
      y: (pointer.y - node.y()) / oldScale,
    };

    const scaleBy = 1.05;
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const rawScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const newScale = Math.min(Math.max(rawScale, 0.1), 8);

    node.scale({ x: newScale, y: newScale });
    node.position({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
    node.getLayer()?.batchDraw();
  };

  if (!image) return null;

  return (
    <KonvaImage
      ref={imageRef}
      image={image}
      draggable={draggable}
      name="background-image"
      onWheel={handleWheel}
    />
  );
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
  getNode: (id: string) => Konva.Image | undefined;
  dragOriginRef: React.RefObject<{
    draggedId: string;
    origins: Map<string, { x: number; y: number }>;
  } | null>;
  onCommitGroupMove: (
    origins: Map<string, { x: number; y: number }>,
    dx: number,
    dy: number,
  ) => void;
}) {
  const [image] = useImage(shape.src, "anonymous");
  const isInMultiSelection = selectedIds.includes(shape.id) && selectedIds.length > 1;

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
      onClick={(e) => onSelect(shape.id, (e.evt as MouseEvent).shiftKey)}
      onTap={() => onSelect(shape.id, false)}
      onDragStart={() => {
        if (isInMultiSelection) {
          const origins = new Map<string, { x: number; y: number }>();
          selectedIds.forEach((id) => {
            const node = getNode(id);
            if (node) origins.set(id, { x: node.x(), y: node.y() });
          });
          dragOriginRef.current = { draggedId: shape.id, origins };
        } else {
          dragOriginRef.current = null;
        }
      }}
      onDragMove={(e) => {
        const origin = dragOriginRef.current;
        if (!origin || origin.draggedId !== shape.id) return;
        const start = origin.origins.get(shape.id);
        if (!start) return;
        const dx = e.target.x() - start.x;
        const dy = e.target.y() - start.y;
        origin.origins.forEach((startPos, id) => {
          if (id === shape.id) return;
          const node = getNode(id);
          node?.position({ x: startPos.x + dx, y: startPos.y + dy });
        });
        e.target.getLayer()?.batchDraw();
      }}
      onDragEnd={(e) => {
        const origin = dragOriginRef.current;
        if (origin && origin.draggedId === shape.id) {
          const start = origin.origins.get(shape.id);
          const dx = start ? e.target.x() - start.x : 0;
          const dy = start ? e.target.y() - start.y : 0;
          onCommitGroupMove(origin.origins, dx, dy);
          dragOriginRef.current = null;
        } else {
          onChange({ x: e.target.x(), y: e.target.y() });
        }
      }}
      onTransformEnd={(e) => {
        const node = e.target as Konva.Image;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        onChange({
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          width: Math.max(5, node.width() * scaleX),
          height: Math.max(5, node.height() * scaleY),
        });
      }}
    />
  );
}

export default function MapEditor() {
  const [backgroundSrc, setBackgroundSrc] = useState<string | null>(null);
  const [overlays, setOverlays] = useState<OverlayShape[]>([]);
  const [lines, setLines] = useState<DrawnLine[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tool, setTool] = useState<Tool>("select");
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width: 1000, height: 640 });
  const [customWidth, setCustomWidth] = useState("1000");
  const [customHeight, setCustomHeight] = useState("640");
  const [libraryEntries, setLibraryEntries] = useState<MediaEntry[]>([]);
  const [libraryPath, setLibraryPath] = useState("");
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(true);
  const [isImportingZip, setIsImportingZip] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingUpload, setPendingUpload] = useState<{
    kind: "background" | "overlays";
    files: File[];
  } | null>(null);
  const [folderChoices, setFolderChoices] = useState<string[]>([]);

  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const bgImageRef = useRef<Konva.Image>(null);
  const shapeRefs = useRef(new Map<string, Konva.Image>());
  const selectionRectRef = useRef<Konva.Rect>(null);
  const drawingLineRef = useRef<Konva.Line>(null);

  const isSelectingRef = useRef(false);
  const selectionStartRef = useRef({ x: 0, y: 0 });
  const isDrawingRef = useRef(false);
  const drawingPointsRef = useRef<number[]>([]);
  const dragOriginRef = useRef<{
    draggedId: string;
    origins: Map<string, { x: number; y: number }>;
  } | null>(null);

  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    const nodes = selectedIds
      .map((id) => shapeRefs.current.get(id))
      .filter((node): node is Konva.Image => Boolean(node));
    transformer.nodes(nodes);
    transformer.getLayer()?.batchDraw();
  }, [selectedIds]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const active = document.activeElement;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;
      if (selectedIds.length === 0) return;
      e.preventDefault();
      setOverlays((prev) => prev.filter((o) => !selectedIds.includes(o.id)));
      selectedIds.forEach((id) => shapeRefs.current.delete(id));
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
        if (!cancelled) setUploadError("Impossible de charger la banque de médias.");
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

  const getNode = (id: string) => shapeRefs.current.get(id);

  const handleSetTool = (next: Tool) => {
    setTool(next);
    if (next === "draw") setSelectedIds([]);
  };

  const openFolderPicker = async (upload: { kind: "background" | "overlays"; files: File[] }) => {
    setUploadError(null);
    try {
      const rootEntries = await listMedia("");
      setFolderChoices(
        rootEntries.filter((entry): entry is MediaFolder => entry.type === "folder").map((f) => f.name),
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

    try {
      const uploaded = await Promise.all(
        upload.files.map((file) => uploadMedia(file, folder)),
      );
      if (upload.kind === "background") {
        setBackgroundSrc(uploaded[0].url);
      } else {
        await addOverlaysFromMedia(uploaded);
      }
      if (libraryPath === folder) await refreshLibrary();
    } catch {
      setUploadError(
        upload.kind === "background"
          ? "Échec de l'envoi de l'image de fond vers la banque de médias."
          : "Échec de l'envoi d'une ou plusieurs images vers la banque de médias.",
      );
    }
  };

  const handleBackgroundChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await openFolderPicker({ kind: "background", files: [file] });
  };

  const addOverlaysFromMedia = async (files: MediaFile[]) => {
    const maxSide = 220;
    const newOverlays: OverlayShape[] = [];
    let cascade = overlays.length;

    for (const file of files) {
      const { width, height } = await getImageSize(file.url);
      const scale = Math.min(1, maxSide / Math.max(width, height));
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
    await openFolderPicker({ kind: "overlays", files: Array.from(files) });
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
        err instanceof Error ? err.message : "Échec de l'import du fichier .zip.",
      );
    } finally {
      setIsImportingZip(false);
    }
  };

  const handleUseLibraryAsBackground = (file: MediaFile) => {
    setBackgroundSrc(file.url);
    setIsLibraryOpen(false);
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
  };

  const handleGoBackInLibrary = () => {
    setLibraryPath((prev) => (prev.includes("/") ? prev.slice(0, prev.lastIndexOf("/")) : ""));
  };

  const handleOverlayChange = (id: string, attrs: Partial<OverlayShape>) => {
    setOverlays((prev) => prev.map((o) => (o.id === id ? { ...o, ...attrs } : o)));
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
  };

  const handleDuplicate = () => {
    if (selectedIds.length === 0) return;
    const offset = 20;
    const newShapes: OverlayShape[] = [];
    const newIds: string[] = [];
    overlays.forEach((o) => {
      if (selectedIds.includes(o.id)) {
        const id = crypto.randomUUID();
        newIds.push(id);
        newShapes.push({ ...o, id, x: o.x + offset, y: o.y + offset });
      }
    });
    if (newShapes.length === 0) return;
    setOverlays((prev) => [...prev, ...newShapes]);
    setSelectedIds(newIds);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    setOverlays((prev) => prev.filter((o) => !selectedIds.includes(o.id)));
    selectedIds.forEach((id) => shapeRefs.current.delete(id));
    setSelectedIds([]);
  };

  const zoomStage = (factor: number) => {
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = stage.scaleX();
    const newScale = Math.min(MAX_STAGE_SCALE, Math.max(MIN_STAGE_SCALE, oldScale * factor));
    const center = { x: canvasSize.width / 2, y: canvasSize.height / 2 };
    const relatedTo = {
      x: (center.x - stage.x()) / oldScale,
      y: (center.y - stage.y()) / oldScale,
    };
    stage.scale({ x: newScale, y: newScale });
    stage.position({
      x: center.x - relatedTo.x * newScale,
      y: center.y - relatedTo.y * newScale,
    });
    stage.batchDraw();
  };

  const applyCanvasSize = (width: number, height: number) => {
    const w = Math.max(100, Math.min(4000, Math.round(width)));
    const h = Math.max(100, Math.min(4000, Math.round(height)));
    setCanvasSize({ width: w, height: h });
    setCustomWidth(String(w));
    setCustomHeight(String(h));
    stageRef.current?.scale({ x: 1, y: 1 });
    stageRef.current?.position({ x: 0, y: 0 });
    stageRef.current?.batchDraw();
  };

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const preset = CANVAS_PRESETS.find((p) => `${p.width}x${p.height}` === e.target.value);
    if (preset) applyCanvasSize(preset.width, preset.height);
  };

  const handleCustomSizeApply = () => {
    const w = parseInt(customWidth, 10);
    const h = parseInt(customHeight, 10);
    if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
      applyCanvasSize(w, h);
    }
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
    if (drawingPointsRef.current.length >= 4) {
      setLines((prev) => [...prev, { id: crypto.randomUUID(), points: drawingPointsRef.current }]);
    }
    drawingPointsRef.current = [];
    drawingLineRef.current?.points([]);
    drawingLineRef.current?.visible(false);
    drawingLineRef.current?.getLayer()?.batchDraw();
  };

  const handlePointerDown = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    if (tool === "draw") {
      startDrawing(pos);
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
      selectionRectRef.current?.setAttrs({ x: pos.x, y: pos.y, width: 0, height: 0, visible: true });
      selectionRectRef.current?.getLayer()?.batchDraw();
    }
  };

  const handlePointerMove = () => {
    const stage = stageRef.current;
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    if (tool === "draw" && isDrawingRef.current) {
      continueDrawing(pos);
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

    if (isSelectingRef.current) {
      isSelectingRef.current = false;
      const box = selectionRectRef.current?.getClientRect();
      selectionRectRef.current?.setAttrs({ visible: false, width: 0, height: 0 });
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
        setSelectedIds(matches);
      }
    }
  };

  const handleExport = () => {
    const stage = stageRef.current;
    if (!stage) return;

    const prevScale = stage.scale();
    const prevPos = stage.position();
    const prevSelection = [...selectedIds];

    transformerRef.current?.nodes([]);
    stage.scale({ x: 1, y: 1 });
    stage.position({ x: 0, y: 0 });
    stage.batchDraw();

    const dataUrl = stage.toDataURL({
      x: 0,
      y: 0,
      width: canvasSize.width,
      height: canvasSize.height,
      pixelRatio: 2,
      mimeType: "image/png",
    });

    stage.scale(prevScale);
    stage.position(prevPos);
    if (prevSelection.length > 0) {
      const nodes = prevSelection
        .map((id) => shapeRefs.current.get(id))
        .filter((node): node is Konva.Image => Boolean(node));
      transformerRef.current?.nodes(nodes);
    }
    stage.batchDraw();

    downloadDataUrl(dataUrl, "carte.png");
  };

  return (
    <div className="flex min-h-screen flex-col items-center gap-6 bg-zinc-50 px-6 py-10 font-sans dark:bg-black">
      <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Éditeur de carte
      </h1>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <label className="cursor-pointer rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]">
          Image de fond
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleBackgroundChange}
          />
        </label>

        <label className="cursor-pointer rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]">
          Ajouter une image
          <input
            type="file"
            accept="image/png"
            multiple
            className="hidden"
            onChange={handleAddOverlays}
          />
        </label>

        <label className="cursor-pointer rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]">
          <span className="flex items-center gap-2">
            <Archive size={16} />
            {isImportingZip ? "Import en cours…" : "Importer un .zip"}
          </span>
          <input
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            className="hidden"
            disabled={isImportingZip}
            onChange={handleZipUpload}
          />
        </label>

        <button
          onClick={() => setIsLibraryOpen(true)}
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
          <input
            type="number"
            min={100}
            max={4000}
            value={customWidth}
            onChange={(e) => setCustomWidth(e.target.value)}
            className="w-20 rounded border border-black/[.08] bg-white px-2 py-1 dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50"
          />
          <span>×</span>
          <input
            type="number"
            min={100}
            max={4000}
            value={customHeight}
            onChange={(e) => setCustomHeight(e.target.value)}
            className="w-20 rounded border border-black/[.08] bg-white px-2 py-1 dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50"
          />
          <button
            onClick={handleCustomSizeApply}
            className="rounded-full border border-black/[.08] px-3 py-1 font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
          >
            Appliquer
          </button>
        </div>

        <button
          onClick={handleExport}
          className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-[#1c1c1c] transition-colors hover:bg-[#d49f00]"
        >
          Exporter
        </button>
      </div>

      {uploadError && (
        <p className="text-sm text-red-600 dark:text-red-400">{uploadError}</p>
      )}

      <div className="flex w-full max-w-[1200px] items-start justify-center gap-4">
        <div className="flex flex-col gap-2 rounded-xl border border-black/[.08] bg-white p-2 dark:border-white/[.145] dark:bg-zinc-900">
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
          <div className="my-1 h-px bg-black/[.08] dark:bg-white/[.145]" />
          <ToolbarButton label="Zoomer" onClick={() => zoomStage(1.2)}>
            <ZoomIn size={18} />
          </ToolbarButton>
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
            onClick={handleDeleteSelected}
            disabled={selectedIds.length === 0}
          >
            <Trash2 size={18} />
          </ToolbarButton>
        </div>

        <div className="max-h-[75vh] max-w-full overflow-auto rounded border border-zinc-300 bg-white dark:border-zinc-700">
          <Stage
            ref={stageRef}
            width={canvasSize.width}
            height={canvasSize.height}
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
                <Line
                  key={line.id}
                  points={line.points}
                  stroke="#1c1c1c"
                  strokeWidth={3}
                  tension={0}
                  lineCap="round"
                  lineJoin="round"
                  listening={false}
                />
              ))}
              <Line
                ref={drawingLineRef}
                points={[]}
                stroke="#1c1c1c"
                strokeWidth={3}
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
          </Stage>
        </div>
      </div>

      <p className="max-w-2xl text-center text-sm text-zinc-500 dark:text-zinc-400">
        Molette sur l&apos;image de fond pour zoomer, glisser pour la déplacer.
        Cliquez une image pour la sélectionner (Maj+clic pour en ajouter
        plusieurs, ou glissez sur une zone vide pour un rectangle de
        sélection). Supprimer/Retour arrière efface la sélection.
      </p>

      {isLibraryOpen && (
        <MediaLibraryPanel
          entries={libraryEntries}
          currentPath={libraryPath}
          isLoading={isLoadingLibrary}
          onClose={() => setIsLibraryOpen(false)}
          onEnterFolder={handleEnterFolder}
          onGoBack={handleGoBackInLibrary}
          onUseAsBackground={handleUseLibraryAsBackground}
          onAddAsOverlay={handleAddLibraryOverlay}
          onDeleteFile={handleDeleteFile}
          onDeleteFolder={handleDeleteFolder}
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
    </div>
  );
}
