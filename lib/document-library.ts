import { sanitizeSegment } from "@/lib/media-library";
import { supabase } from "@/lib/supabase";

const BUCKET = "documents";

export type DocumentFile = {
  type: "file";
  name: string;
  path: string;
  url: string;
  createdAt: string;
};

export type DocumentFolder = {
  type: "folder";
  name: string;
  path: string;
};

export type DocumentEntry = DocumentFile | DocumentFolder;

function joinPath(prefix: string, name: string) {
  return prefix ? `${prefix}/${name}` : name;
}

export async function listDocuments(prefix = ""): Promise<DocumentEntry[]> {
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
    sortBy: { column: "name", order: "asc" },
  });
  if (error) throw error;

  const entries = (data ?? [])
    .filter((item) => item.name !== ".emptyFolderPlaceholder")
    .map((item): DocumentEntry => {
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

export async function uploadDocument(
  file: File,
  folder = "",
): Promise<DocumentFile> {
  const dotIndex = file.name.lastIndexOf(".");
  const base = dotIndex > 0 ? file.name.slice(0, dotIndex) : file.name;
  const ext = dotIndex > 0 ? file.name.slice(dotIndex) : "";
  const filename = `${sanitizeSegment(base)}${ext.toLowerCase()}`;
  const path = joinPath(folder, filename);

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });
  if (error) throw error;

  const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  return {
    type: "file",
    name: filename,
    path,
    url,
    createdAt: new Date().toISOString(),
  };
}

export async function deleteDocument(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
  await supabase.from("document_links").delete().eq("storage_path", path);
}

export async function deleteFolder(path: string): Promise<void> {
  const { data, error } = await supabase.storage.from(BUCKET).list(path);
  if (error) throw error;

  const paths = (data ?? [])
    .filter((item) => item.id !== null)
    .map((item) => joinPath(path, item.name));

  if (paths.length > 0) {
    const { error: removeError } = await supabase.storage
      .from(BUCKET)
      .remove(paths);
    if (removeError) throw removeError;
  }
}

export type DocumentLink = {
  storage_path: string;
  activity_id: string;
  activity_name: string;
};

type RawActivityJoin = { name: string } | { name: string }[] | null;

type RawDocumentLink = {
  storage_path: string;
  activity_id: string;
  activities: RawActivityJoin;
};

export async function listDocumentLinks(): Promise<DocumentLink[]> {
  const { data, error } = await supabase
    .from("document_links")
    .select("storage_path, activity_id, activities(name)");
  if (error) throw error;
  return (data ?? []).map((row: RawDocumentLink) => {
    const activity = Array.isArray(row.activities)
      ? (row.activities[0] ?? null)
      : row.activities;
    return {
      storage_path: row.storage_path,
      activity_id: row.activity_id,
      activity_name: activity?.name ?? "",
    };
  });
}

export async function linkDocument(
  storagePath: string,
  activityId: string,
): Promise<void> {
  const { error } = await supabase
    .from("document_links")
    .upsert(
      { storage_path: storagePath, activity_id: activityId },
      { onConflict: "storage_path" },
    );
  if (error) throw error;
}

export async function unlinkDocument(storagePath: string): Promise<void> {
  const { error } = await supabase
    .from("document_links")
    .delete()
    .eq("storage_path", storagePath);
  if (error) throw error;
}

export async function listActivitiesForLinking(): Promise<
  { id: string; name: string; date: string }[]
> {
  const { data, error } = await supabase
    .from("activities")
    .select("id, name, date")
    .order("date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
