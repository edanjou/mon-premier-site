"use client";

import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useEffect, useRef, useState } from "react";
import {
  Image as KonvaImage,
  Layer,
  Rect,
  Stage,
  Transformer,
} from "react-konva";
import useImage from "use-image";

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 640;

type OverlayShape = {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

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

function BackgroundImage({
  src,
  imageRef,
}: {
  src: string;
  imageRef: React.RefObject<Konva.Image | null>;
}) {
  const [image] = useImage(src);
  const hasFitRef = useRef(false);

  useEffect(() => {
    if (!image || hasFitRef.current || !imageRef.current) return;
    const scale = Math.min(CANVAS_WIDTH / image.width, CANVAS_HEIGHT / image.height);
    imageRef.current.scale({ x: scale, y: scale });
    imageRef.current.position({
      x: (CANVAS_WIDTH - image.width * scale) / 2,
      y: (CANVAS_HEIGHT - image.height * scale) / 2,
    });
    imageRef.current.getLayer()?.batchDraw();
    hasFitRef.current = true;
  }, [image, imageRef]);

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
      draggable
      name="background-image"
      onWheel={handleWheel}
    />
  );
}

function OverlayImage({
  shape,
  onSelect,
  onChange,
  setShapeRef,
}: {
  shape: OverlayShape;
  onSelect: () => void;
  onChange: (attrs: Partial<OverlayShape>) => void;
  setShapeRef: (id: string, node: Konva.Image | null) => void;
}) {
  const [image] = useImage(shape.src);

  return (
    <KonvaImage
      ref={(node) => setShapeRef(shape.id, node)}
      image={image}
      x={shape.x}
      y={shape.y}
      width={shape.width}
      height={shape.height}
      rotation={shape.rotation}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        onChange({ x: e.target.x(), y: e.target.y() });
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
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const bgImageRef = useRef<Konva.Image>(null);
  const shapeRefs = useRef(new Map<string, Konva.Image>());
  const backgroundUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    const node = selectedId ? shapeRefs.current.get(selectedId) : undefined;
    transformer.nodes(node ? [node] : []);
    transformer.getLayer()?.batchDraw();
  }, [selectedId]);

  const setShapeRef = (id: string, node: Konva.Image | null) => {
    if (node) shapeRefs.current.set(id, node);
    else shapeRefs.current.delete(id);
  };

  const handleBackgroundChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (backgroundUrlRef.current) URL.revokeObjectURL(backgroundUrlRef.current);
    backgroundUrlRef.current = url;
    setBackgroundSrc(url);
    e.target.value = "";
  };

  const handleAddOverlays = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const maxSide = 220;
    const newOverlays: OverlayShape[] = [];
    let cascade = overlays.length;

    for (const file of Array.from(files)) {
      const src = URL.createObjectURL(file);
      const { width, height } = await getImageSize(src);
      const scale = Math.min(1, maxSide / Math.max(width, height));
      const w = width * scale;
      const h = height * scale;
      const offset = cascade * 24;
      newOverlays.push({
        id: crypto.randomUUID(),
        src,
        x: CANVAS_WIDTH / 2 - w / 2 + offset,
        y: CANVAS_HEIGHT / 2 - h / 2 + offset,
        width: w,
        height: h,
        rotation: 0,
      });
      cascade += 1;
    }

    setOverlays((prev) => [...prev, ...newOverlays]);
    e.target.value = "";
  };

  const handleOverlayChange = (id: string, attrs: Partial<OverlayShape>) => {
    setOverlays((prev) => prev.map((o) => (o.id === id ? { ...o, ...attrs } : o)));
  };

  const handleStagePointerDown = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    const target = e.target;
    const name = target.name?.();
    if (target === target.getStage() || name === "background-image" || name === "canvas-backdrop") {
      setSelectedId(null);
    }
  };

  const handleExport = () => {
    const stage = stageRef.current;
    if (!stage) return;

    const previousSelection = selectedId;
    transformerRef.current?.nodes([]);
    stage.batchDraw();

    const dataUrl = stage.toDataURL({ pixelRatio: 2, mimeType: "image/png" });

    if (previousSelection) {
      const node = shapeRefs.current.get(previousSelection);
      transformerRef.current?.nodes(node ? [node] : []);
      stage.batchDraw();
    }

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

        <button
          onClick={handleExport}
          className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Exporter
        </button>
      </div>

      <Stage
        ref={stageRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onMouseDown={handleStagePointerDown}
        onTouchStart={handleStagePointerDown}
        className="max-w-full border border-zinc-300 bg-white dark:border-zinc-700"
      >
        <Layer>
          <Rect
            x={0}
            y={0}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            fill="#e4e4e7"
            name="canvas-backdrop"
          />
          {backgroundSrc && <BackgroundImage src={backgroundSrc} imageRef={bgImageRef} />}
          {overlays.map((shape) => (
            <OverlayImage
              key={shape.id}
              shape={shape}
              onSelect={() => setSelectedId(shape.id)}
              onChange={(attrs) => handleOverlayChange(shape.id, attrs)}
              setShapeRef={setShapeRef}
            />
          ))}
          <Transformer
            ref={transformerRef}
            rotateEnabled
            anchorSize={8}
            borderStroke="#2563eb"
            anchorStroke="#2563eb"
            anchorFill="#ffffff"
          />
        </Layer>
      </Stage>

      <p className="max-w-xl text-center text-sm text-zinc-500 dark:text-zinc-400">
        Molette sur l&apos;image de fond pour zoomer, glisser pour la déplacer.
        Cliquez une image ajoutée pour la déplacer, la redimensionner ou la
        faire pivoter.
      </p>
    </div>
  );
}
