"use client";

import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  File,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  Pencil,
  Plus,
  Presentation,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { glofters } from "@/app/fonts/glofters";
import Breadcrumb from "@/components/breadcrumb";
import RequireFeature from "@/components/require-feature";
import {
  deleteDocument,
  deleteFolder,
  linkDocument,
  listActivitiesForLinking,
  listDocumentLinks,
  listDocuments,
  moveDocument,
  renameDocument,
  renameFolder,
  replaceDocument,
  unlinkDocument,
  uploadDocument,
  type DocumentEntry,
  type DocumentFile,
  type DocumentFolder,
  type DocumentLink,
} from "@/lib/document-library";
import { getModuleAccessLevels } from "@/lib/features";
import { sanitizeSegment } from "@/lib/media-library";
import { getOwnProfile } from "@/lib/profile";

const DOCUMENT_PATH_MIME = "application/x-document-path";

const PDF_EXTENSIONS = new Set(["pdf"]);
const WORD_EXTENSIONS = new Set(["doc", "docx", "odt", "rtf"]);
const EXCEL_EXTENSIONS = new Set(["xls", "xlsx", "csv"]);
const POWERPOINT_EXTENSIONS = new Set(["ppt", "pptx"]);
const ARCHIVE_EXTENSIONS = new Set(["zip", "rar", "7z"]);
const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg"]);

function extensionOf(name: string): string {
  const dotIndex = name.lastIndexOf(".");
  return dotIndex > 0 ? name.slice(dotIndex + 1).toLowerCase() : "";
}

function DocumentIcon({ name }: { name: string }) {
  const ext = extensionOf(name);
  if (PDF_EXTENSIONS.has(ext)) {
    return <FileText size={24} className="flex-shrink-0 text-red-500" />;
  }
  if (WORD_EXTENSIONS.has(ext)) {
    return <FileText size={24} className="flex-shrink-0 text-blue-500" />;
  }
  if (EXCEL_EXTENSIONS.has(ext)) {
    return (
      <FileSpreadsheet size={24} className="flex-shrink-0 text-green-600" />
    );
  }
  if (POWERPOINT_EXTENSIONS.has(ext)) {
    return <Presentation size={24} className="flex-shrink-0 text-orange-500" />;
  }
  if (ARCHIVE_EXTENSIONS.has(ext)) {
    return <FileArchive size={24} className="flex-shrink-0 text-amber-600" />;
  }
  if (IMAGE_EXTENSIONS.has(ext)) {
    return <FileImage size={24} className="flex-shrink-0 text-violet-500" />;
  }
  return <File size={24} className="flex-shrink-0 text-foreground/50" />;
}

type SortColumn = "name" | "modified";
type SortDirection = "asc" | "desc";

function formatDocumentDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DocumentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [entries, setEntries] = useState<DocumentEntry[]>([]);
  const [currentPath, setCurrentPath] = useState(
    () => searchParams.get("path") ?? "",
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [links, setLinks] = useState<DocumentLink[]>([]);
  const [activities, setActivities] = useState<
    { id: string; name: string; date: string }[]
  >([]);
  const [isDragOverArea, setIsDragOverArea] = useState(false);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const areaDragDepthRef = useRef(0);
  const folderDragDepthRef = useRef(0);
  const [sortColumn, setSortColumn] = useState<SortColumn>("modified");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [canWrite, setCanWrite] = useState(true);

  useEffect(() => {
    getOwnProfile().then((profile) => {
      if (!profile) return;
      getModuleAccessLevels(profile).then((levels) => {
        setCanWrite(levels["documents"] === "ecriture");
      });
    });
  }, []);

  useEffect(() => {
    const query = currentPath ? `?path=${encodeURIComponent(currentPath)}` : "";
    router.replace(`/campagnes/documents${query}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- router is stable; only currentPath should trigger a URL sync
  }, [currentPath]);

  useEffect(() => {
    // Sans ce filet de sécurité, déposer un fichier en dehors d'une zone
    // gérée fait naviguer le navigateur vers ce fichier.
    const preventDefault = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
    };
    window.addEventListener("dragover", preventDefault);
    window.addEventListener("drop", preventDefault);
    return () => {
      window.removeEventListener("dragover", preventDefault);
      window.removeEventListener("drop", preventDefault);
    };
  }, []);

  const fetchEntries = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [list, linkList] = await Promise.all([
        listDocuments(currentPath),
        listDocumentLinks(),
      ]);
      setEntries(list);
      setLinks(linkList);
    } catch {
      setError("Impossible de charger les documents.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchEntries sets a loading flag ahead of an async fetch
    fetchEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchEntries is stable for a given currentPath
  }, [currentPath]);

  useEffect(() => {
    listActivitiesForLinking().then(setActivities);
  }, []);

  const handleEnterFolder = (path: string) => setCurrentPath(path);
  const handleGoBack = () =>
    setCurrentPath((prev) =>
      prev.includes("/") ? prev.slice(0, prev.lastIndexOf("/")) : "",
    );

  const handleNewFolder = async () => {
    if (!canWrite) return;
    const name = window.prompt("Nom du dossier :");
    if (!name) return;
    const folder = sanitizeSegment(name);
    // Un dossier n'existe dans Supabase Storage que s'il contient un fichier ;
    // on entre simplement dedans, il apparaîtra dans la liste dès le premier
    // téléversement.
    setCurrentPath(currentPath ? `${currentPath}/${folder}` : folder);
  };

  const uploadFilesInto = async (files: FileList | File[], folder: string) => {
    if (!canWrite) return;
    setError(null);
    setIsUploading(true);
    try {
      await Promise.all(
        Array.from(files).map((file) => uploadDocument(file, folder)),
      );
      await fetchEntries();
    } catch {
      setError("Échec du téléversement d'un ou plusieurs fichiers.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    e.target.value = "";
    if (!files || files.length === 0) return;
    await uploadFilesInto(files, currentPath);
  };

  const handleReplaceFile = async (
    file: DocumentFile,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newFile = e.target.files?.[0];
    e.target.value = "";
    if (!newFile || !canWrite) return;
    setError(null);
    setIsUploading(true);
    try {
      await replaceDocument(file.path, newFile);
      await fetchEntries();
    } catch {
      setError("Échec du remplacement du fichier.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAreaDragEnter = (e: React.DragEvent) => {
    if (!canWrite || !e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    areaDragDepthRef.current += 1;
    setIsDragOverArea(true);
  };

  const handleAreaDragOver = (e: React.DragEvent) => {
    if (!canWrite || !e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
  };

  const handleAreaDragLeave = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    areaDragDepthRef.current = Math.max(0, areaDragDepthRef.current - 1);
    if (areaDragDepthRef.current === 0) setIsDragOverArea(false);
  };

  const handleAreaDrop = async (e: React.DragEvent) => {
    if (!canWrite || !e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    areaDragDepthRef.current = 0;
    setIsDragOverArea(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) await uploadFilesInto(files, currentPath);
  };

  const handleFolderDragEnter = (e: React.DragEvent, folderPath: string) => {
    if (!canWrite) return;
    e.preventDefault();
    e.stopPropagation();
    folderDragDepthRef.current += 1;
    setDragOverFolder(folderPath);
  };

  const handleFolderDragOver = (e: React.DragEvent) => {
    if (!canWrite) return;
    e.preventDefault();
    e.stopPropagation();
  };

  const handleFolderDragLeave = (e: React.DragEvent) => {
    if (!canWrite) return;
    e.preventDefault();
    e.stopPropagation();
    folderDragDepthRef.current = Math.max(0, folderDragDepthRef.current - 1);
    if (folderDragDepthRef.current === 0) setDragOverFolder(null);
  };

  const handleFolderDrop = async (e: React.DragEvent, folderPath: string) => {
    if (!canWrite) return;
    e.preventDefault();
    e.stopPropagation();
    folderDragDepthRef.current = 0;
    setDragOverFolder(null);

    const movedPath = e.dataTransfer.getData(DOCUMENT_PATH_MIME);
    if (movedPath) {
      try {
        await moveDocument(movedPath, folderPath);
        await fetchEntries();
      } catch {
        alert("Échec du déplacement.");
      }
      return;
    }

    const files = e.dataTransfer.files;
    if (files.length > 0) await uploadFilesInto(files, folderPath);
  };

  const handleDeleteFile = async (file: DocumentFile) => {
    if (!canWrite) return;
    if (!window.confirm(`Supprimer "${file.name}" ?`)) return;
    try {
      await deleteDocument(file.path);
      setEntries((prev) => prev.filter((e) => e.path !== file.path));
    } catch {
      alert("Échec de la suppression.");
    }
  };

  const handleDeleteFolder = async (folder: DocumentFolder) => {
    if (!canWrite) return;
    if (
      !window.confirm(`Supprimer le dossier "${folder.name}" et son contenu ?`)
    )
      return;
    try {
      await deleteFolder(folder.path);
      setEntries((prev) => prev.filter((e) => e.path !== folder.path));
    } catch {
      alert("Échec de la suppression.");
    }
  };

  const handleRenameFile = async (file: DocumentFile) => {
    if (!canWrite) return;
    const newName = window.prompt("Nouveau nom du fichier :", file.name);
    if (!newName || newName === file.name) return;
    try {
      await renameDocument(file.path, newName);
      await fetchEntries();
    } catch {
      alert("Échec du renommage.");
    }
  };

  const handleRenameFolder = async (folder: DocumentFolder) => {
    if (!canWrite) return;
    const newName = window.prompt("Nouveau nom du dossier :", folder.name);
    if (!newName || newName === folder.name) return;
    try {
      await renameFolder(folder.path, newName);
      await fetchEntries();
    } catch {
      alert("Échec du renommage.");
    }
  };

  const handleLinkChange = async (path: string, activityId: string) => {
    if (!canWrite) return;
    try {
      if (activityId) {
        await linkDocument(path, activityId);
      } else {
        await unlinkDocument(path);
      }
      await fetchEntries();
    } catch {
      alert("Échec de la mise à jour du lien.");
    }
  };

  const toggleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection(column === "modified" ? "desc" : "asc");
    }
  };

  const folders = entries.filter(
    (e): e is DocumentFolder => e.type === "folder",
  );
  const files = entries.filter((e): e is DocumentFile => e.type === "file");
  const sortedFiles = [...files].sort((a, b) => {
    const cmp =
      sortColumn === "name"
        ? a.name.localeCompare(b.name)
        : a.modifiedAt.localeCompare(b.modifiedAt);
    return sortDirection === "asc" ? cmp : -cmp;
  });

  return (
    <div>
      <h1 className={`${glofters.className} text-3xl text-foreground`}>
        Gestion documentaire
      </h1>
      <Breadcrumb />

      {canWrite && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleNewFolder}
            className="flex items-center gap-2 rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
          >
            <Plus size={16} />
            Nouveau dossier
          </button>
          <label className="flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0c4390]">
            <Upload size={16} />
            {isUploading ? "Téléversement…" : "Téléverser"}
            <input
              type="file"
              multiple
              disabled={isUploading}
              onChange={handleUpload}
              className="hidden"
            />
          </label>
        </div>
      )}

      <div
        onDragEnter={handleAreaDragEnter}
        onDragOver={handleAreaDragOver}
        onDragLeave={handleAreaDragLeave}
        onDrop={handleAreaDrop}
        className={`mt-6 rounded-2xl border-2 bg-white p-6 shadow-sm transition-colors dark:bg-zinc-900 ${
          isDragOverArea
            ? "border-dashed border-primary bg-primary/5"
            : "border-transparent"
        }`}
      >
        <div className="mb-4 flex items-center gap-2">
          {currentPath && (
            <button
              type="button"
              onClick={handleGoBack}
              aria-label="Retour"
              className="rounded-full p-1 hover:bg-black/[.04] dark:hover:bg-white/[.08]"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <span className="text-sm text-foreground/60">
            {currentPath || "Dossier racine"}
          </span>
        </div>

        {isLoading && (
          <p className="text-sm text-foreground/60">Chargement…</p>
        )}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {!isLoading && !error && folders.length === 0 && files.length === 0 && (
          <p className="text-sm text-foreground/60">
            Ce dossier est vide.
          </p>
        )}

        {!isLoading && !error && (folders.length > 0 || files.length > 0) && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-black/[.08] text-foreground/60 dark:border-white/[.08]">
                  <th className="py-2 pr-3 font-medium">
                    <button
                      type="button"
                      onClick={() => toggleSort("name")}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Nom
                      {sortColumn === "name" &&
                        (sortDirection === "asc" ? (
                          <ChevronUp size={14} />
                        ) : (
                          <ChevronDown size={14} />
                        ))}
                    </button>
                  </th>
                  <th className="py-2 pr-3 font-medium">
                    <button
                      type="button"
                      onClick={() => toggleSort("modified")}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      Modifié
                      {sortColumn === "modified" &&
                        (sortDirection === "asc" ? (
                          <ChevronUp size={14} />
                        ) : (
                          <ChevronDown size={14} />
                        ))}
                    </button>
                  </th>
                  <th className="py-2 pr-3 font-medium">Modifié par</th>
                  <th className="py-2 pl-3" />
                </tr>
              </thead>
              <tbody>
                {folders.map((folder) => (
                  <FolderRow
                    key={folder.path}
                    folder={folder}
                    canWrite={canWrite}
                    isDragOver={dragOverFolder === folder.path}
                    onDragEnter={(e) => handleFolderDragEnter(e, folder.path)}
                    onDragOver={handleFolderDragOver}
                    onDragLeave={handleFolderDragLeave}
                    onDrop={(e) => handleFolderDrop(e, folder.path)}
                    onEnter={() => handleEnterFolder(folder.path)}
                    onRename={() => handleRenameFolder(folder)}
                    onDelete={() => handleDeleteFolder(folder)}
                  />
                ))}
                {sortedFiles.map((file) => (
                  <DocumentRow
                    key={file.path}
                    file={file}
                    canWrite={canWrite}
                    link={links.find((l) => l.storage_path === file.path)}
                    activities={activities}
                    onRename={() => handleRenameFile(file)}
                    onReplace={(e) => handleReplaceFile(file, e)}
                    onDelete={() => handleDeleteFile(file)}
                    onLinkChange={(activityId) =>
                      handleLinkChange(file.path, activityId)
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function FolderRow({
  folder,
  canWrite,
  isDragOver,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  onEnter,
  onRename,
  onDelete,
}: {
  folder: DocumentFolder;
  canWrite: boolean;
  isDragOver: boolean;
  onDragEnter: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onEnter: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <tr
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`border-b border-black/[.06] last:border-b-0 transition-colors dark:border-white/[.06] ${
        isDragOver
          ? "bg-primary/10"
          : "hover:bg-black/[.02] dark:hover:bg-white/[.03]"
      }`}
    >
      <td className="py-2 pr-3">
        <button
          type="button"
          onClick={onEnter}
          className="link-button flex items-center gap-2 text-left"
        >
          <Folder size={24} className="flex-shrink-0 text-foreground/40" />
          <span className="truncate text-sm text-foreground hover:underline">
            {folder.name}
          </span>
        </button>
      </td>
      <td className="py-2 pr-3 text-sm text-foreground/40">—</td>
      <td className="py-2 pr-3 text-sm text-foreground/40">—</td>
      <td className="py-2 pl-3 text-right">
        <div className="flex items-center justify-end gap-1">
          {canWrite && (
            <button
              type="button"
              onClick={onRename}
              aria-label="Renommer"
              className="rounded-full p-1.5 text-foreground/50 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
            >
              <Pencil size={16} />
            </button>
          )}
          {canWrite && (
            <button
              type="button"
              onClick={onDelete}
              aria-label="Supprimer"
              className="rounded-full p-1.5 text-foreground/50 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function DocumentRow({
  file,
  canWrite,
  link,
  activities,
  onRename,
  onReplace,
  onDelete,
  onLinkChange,
}: {
  file: DocumentFile;
  canWrite: boolean;
  link: DocumentLink | undefined;
  activities: { id: string; name: string; date: string }[];
  onRename: () => void;
  onReplace: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDelete: () => void;
  onLinkChange: (activityId: string) => void;
}) {
  return (
    <tr
      draggable={canWrite}
      onDragStart={(e) => {
        e.dataTransfer.setData(DOCUMENT_PATH_MIME, file.path);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="cursor-grab border-b border-black/[.06] last:border-b-0 hover:bg-black/[.02] active:cursor-grabbing dark:border-white/[.06] dark:hover:bg-white/[.03]"
    >
      <td className="py-2 pr-3">
        <div className="flex items-center gap-2">
          <DocumentIcon name={file.name} />
          <div className="min-w-0">
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-sm text-foreground hover:underline"
            >
              {file.name}
            </a>
            {link && (
              <p className="truncate text-xs text-foreground/50">
                Lié à : {link.activity_name}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap py-2 pr-3 text-sm text-foreground/70">
        {formatDocumentDate(file.modifiedAt)}
      </td>
      <td className="whitespace-nowrap py-2 pr-3 text-sm text-foreground/70">
        {file.uploadedByName ?? "—"}
      </td>
      <td className="py-2 pl-3 text-right">
        <div className="flex items-center justify-end gap-1">
          {canWrite && (
            <select
              value={link?.activity_id ?? ""}
              onChange={(e) => onLinkChange(e.target.value)}
              aria-label="Lier à une campagne"
              className="max-w-[7rem] rounded border border-black/[.08] bg-white px-1 py-1 text-xs text-foreground dark:border-white/[.145] dark:bg-zinc-800"
            >
              <option value="">— Aucune campagne —</option>
              {activities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          )}
          {canWrite && (
            <button
              type="button"
              onClick={onRename}
              aria-label="Renommer"
              className="rounded-full p-1.5 text-foreground/50 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
            >
              <Pencil size={16} />
            </button>
          )}
          {canWrite && (
            <label
              aria-label="Remplacer le fichier"
              className="cursor-pointer rounded-full p-1.5 text-foreground/50 transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
            >
              <RefreshCw size={16} />
              <input type="file" className="hidden" onChange={onReplace} />
            </label>
          )}
          {canWrite && (
            <button
              type="button"
              onClick={onDelete}
              aria-label="Supprimer"
              className="rounded-full p-1.5 text-foreground/50 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function DocumentsPage() {
  return (
    <RequireFeature feature="documents">
      <Suspense
        fallback={<p className="text-sm text-foreground/60">Chargement…</p>}
      >
        <DocumentsContent />
      </Suspense>
    </RequireFeature>
  );
}
