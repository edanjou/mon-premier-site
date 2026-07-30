import { unzipSync } from "fflate";
import { supabase } from "@/lib/supabase";

const BUCKET = "media";
const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg"]);

export type MediaFile = {
  type: "file";
  name: string;
  path: string;
  url: string;
  createdAt: string;
};

export type MediaFolder = {
  type: "folder";
  name: string;
  path: string;
};

export type MediaEntry = MediaFile | MediaFolder;

function joinPath(prefix: string, name: string) {
  return prefix ? `${prefix}/${name}` : name;
}

const DIACRITICS_PATTERN = new RegExp("[\\u0300-\\u036f]", "g");

export function sanitizeSegment(name: string): string {
  const cleaned = name
    .normalize("NFD")
    .replace(DIACRITICS_PATTERN, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
  return cleaned || "dossier";
}

export async function listMedia(prefix = ""): Promise<MediaEntry[]> {
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
    sortBy: { column: "name", order: "asc" },
  });
  if (error) throw error;

  const entries = (data ?? [])
    .filter((item) => item.name !== ".emptyFolderPlaceholder")
    .map((item): MediaEntry => {
      const path = joinPath(prefix, item.name);
      if (item.id === null) {
        return { type: "folder", name: item.name, path };
      }
      return {
        type: "file",
        name: item.name,
        path,
        url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl,
        createdAt: item.created_at ?? "",
      };
    });

  return entries.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export async function uploadMedia(file: File, folder = ""): Promise<MediaFile> {
  const ext = file.name.split(".").pop() || "png";
  const filename = `${crypto.randomUUID()}.${ext}`;
  const path = joinPath(folder, filename);

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;

  const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  return { type: "file", name: filename, path, url, createdAt: new Date().toISOString() };
}

export async function uploadZipAsFolder(zipFile: File, folderName: string): Promise<MediaFile[]> {
  const buffer = new Uint8Array(await zipFile.arrayBuffer());
  const entries = unzipSync(buffer);
  const folder = sanitizeSegment(folderName);

  const uploads: Promise<MediaFile | null>[] = Object.entries(entries).map(
    async ([entryName, content]) => {
      if (entryName.endsWith("/")) return null;
      const baseName = entryName.split("/").pop() ?? entryName;
      const ext = baseName.split(".").pop()?.toLowerCase() ?? "";
      if (!IMAGE_EXTENSIONS.has(ext)) return null;

      const path = joinPath(folder, baseName);
      const mimeType = ext === "jpg" ? "image/jpeg" : ext === "svg" ? "image/svg+xml" : `image/${ext}`;
      const blob = new Blob([new Uint8Array(content)], { type: mimeType });

      const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
        cacheControl: "3600",
        upsert: true,
      });
      if (error) throw error;

      const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      return { type: "file" as const, name: baseName, path, url, createdAt: new Date().toISOString() };
    },
  );

  const results = (await Promise.all(uploads)).filter(
    (item): item is MediaFile => item !== null,
  );

  if (results.length === 0) {
    throw new Error("Aucune image (png, jpg, gif, webp, svg) trouvée dans ce fichier .zip.");
  }

  return results;
}

export async function deleteMedia(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

export async function deleteFolder(path: string): Promise<void> {
  const { data, error } = await supabase.storage.from(BUCKET).list(path);
  if (error) throw error;

  const paths = (data ?? [])
    .filter((item) => item.id !== null)
    .map((item) => joinPath(path, item.name));

  if (paths.length > 0) {
    const { error: removeError } = await supabase.storage.from(BUCKET).remove(paths);
    if (removeError) throw removeError;
  }
}
