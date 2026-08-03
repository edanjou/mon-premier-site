import { sanitizeSegment } from "@/lib/media-library";
import { supabase } from "@/lib/supabase";

const BUCKET = "documents";

export type DocumentFile = {
  type: "file";
  name: string;
  path: string;
  url: string;
  modifiedAt: string;
  uploadedByName: string | null;
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

type RawProfileJoin =
  | { first_name: string | null; last_name: string | null }
  | { first_name: string | null; last_name: string | null }[]
  | null;

type RawDocumentMetadata = {
  storage_path: string;
  profiles: RawProfileJoin;
};

async function fetchUploadedByNames(
  paths: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (paths.length === 0) return map;

  const { data, error } = await supabase
    .from("document_metadata")
    .select("storage_path, profiles(first_name, last_name)")
    .in("storage_path", paths);
  if (error) throw error;

  for (const row of (data ?? []) as RawDocumentMetadata[]) {
    const profile = Array.isArray(row.profiles)
      ? (row.profiles[0] ?? null)
      : row.profiles;
    const name = [profile?.first_name, profile?.last_name]
      .filter(Boolean)
      .join(" ");
    if (name) map.set(row.storage_path, name);
  }
  return map;
}

export async function listDocuments(prefix = ""): Promise<DocumentEntry[]> {
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
    sortBy: { column: "name", order: "asc" },
  });
  if (error) throw error;

  const items = (data ?? []).filter(
    (item) => item.name !== ".emptyFolderPlaceholder",
  );
  const filePaths = items
    .filter((item) => item.id !== null)
    .map((item) => joinPath(prefix, item.name));
  const uploadedByNames = await fetchUploadedByNames(filePaths);

  const entries = items.map((item): DocumentEntry => {
    const path = joinPath(prefix, item.name);
    if (item.id === null) {
      return { type: "folder", name: item.name, path };
    }
    return {
      type: "file",
      name: item.name,
      path,
      url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl,
      modifiedAt: item.updated_at ?? item.created_at ?? "",
      uploadedByName: uploadedByNames.get(path) ?? null,
    };
  });

  return entries.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

async function recordUpload(
  path: string,
  filename: string,
): Promise<DocumentFile> {
  const modifiedAt = new Date().toISOString();
  const { data: userData } = await supabase.auth.getUser();
  const { data: metadataRow } = await supabase
    .from("document_metadata")
    .upsert(
      {
        storage_path: path,
        uploaded_by: userData.user?.id ?? null,
        updated_at: modifiedAt,
      },
      { onConflict: "storage_path" },
    )
    .select("profiles(first_name, last_name)")
    .single();
  const profile = Array.isArray(metadataRow?.profiles)
    ? (metadataRow.profiles[0] ?? null)
    : (metadataRow?.profiles ?? null);
  const uploadedByName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    null;

  const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  return {
    type: "file",
    name: filename,
    path,
    url,
    modifiedAt,
    uploadedByName,
  };
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

  return recordUpload(path, filename);
}

export async function replaceDocument(
  path: string,
  file: File,
): Promise<DocumentFile> {
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });
  if (error) throw error;

  const filename = path.slice(path.lastIndexOf("/") + 1);
  return recordUpload(path, filename);
}

async function updateStoragePathReferences(
  fromPath: string,
  toPath: string,
): Promise<void> {
  await supabase
    .from("document_links")
    .update({ storage_path: toPath })
    .eq("storage_path", fromPath);
  await supabase
    .from("document_metadata")
    .update({ storage_path: toPath })
    .eq("storage_path", fromPath);
}

export async function moveDocument(
  fromPath: string,
  toFolder: string,
): Promise<void> {
  const filename = fromPath.slice(fromPath.lastIndexOf("/") + 1);
  const toPath = joinPath(toFolder, filename);
  if (toPath === fromPath) return;

  const { error } = await supabase.storage
    .from(BUCKET)
    .move(fromPath, toPath);
  if (error) throw error;

  await updateStoragePathReferences(fromPath, toPath);
}

export async function renameDocument(
  path: string,
  newName: string,
): Promise<void> {
  const folder = path.includes("/")
    ? path.slice(0, path.lastIndexOf("/"))
    : "";
  const dotIndex = newName.lastIndexOf(".");
  const base = dotIndex > 0 ? newName.slice(0, dotIndex) : newName;
  const ext = dotIndex > 0 ? newName.slice(dotIndex) : "";
  const toPath = joinPath(folder, `${sanitizeSegment(base)}${ext.toLowerCase()}`);
  if (toPath === path) return;

  const { error } = await supabase.storage.from(BUCKET).move(path, toPath);
  if (error) throw error;

  await updateStoragePathReferences(path, toPath);
}

export async function renameFolder(
  path: string,
  newName: string,
): Promise<void> {
  const parent = path.includes("/")
    ? path.slice(0, path.lastIndexOf("/"))
    : "";
  const newPath = joinPath(parent, sanitizeSegment(newName));
  if (newPath === path) return;

  const { data, error } = await supabase.storage.from(BUCKET).list(path);
  if (error) throw error;

  const items = (data ?? []).filter((item) => item.id !== null);
  await Promise.all(
    items.map(async (item) => {
      const fromPath = joinPath(path, item.name);
      const toPath = joinPath(newPath, item.name);
      const { error: moveError } = await supabase.storage
        .from(BUCKET)
        .move(fromPath, toPath);
      if (moveError) throw moveError;
      await updateStoragePathReferences(fromPath, toPath);
    }),
  );
}

export async function deleteDocument(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
  await supabase.from("document_links").delete().eq("storage_path", path);
  await supabase.from("document_metadata").delete().eq("storage_path", path);
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

export type ActivityDocumentLink = {
  storage_path: string;
  name: string;
  url: string;
};

export async function listDocumentsForActivity(
  activityId: string,
): Promise<ActivityDocumentLink[]> {
  const { data, error } = await supabase
    .from("document_links")
    .select("storage_path")
    .eq("activity_id", activityId);
  if (error) throw error;

  return (data ?? []).map((row) => ({
    storage_path: row.storage_path,
    name: row.storage_path.slice(row.storage_path.lastIndexOf("/") + 1),
    url: supabase.storage.from(BUCKET).getPublicUrl(row.storage_path).data
      .publicUrl,
  }));
}

export async function countDocumentLinksByActivity(): Promise<
  Record<string, number>
> {
  const { data, error } = await supabase
    .from("document_links")
    .select("activity_id");
  if (error) throw error;

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.activity_id] = (counts[row.activity_id] ?? 0) + 1;
  }
  return counts;
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
