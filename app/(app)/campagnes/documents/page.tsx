"use client";

import {
  ArrowLeft,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
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
  unlinkDocument,
  uploadDocument,
  type DocumentEntry,
  type DocumentFile,
  type DocumentFolder,
  type DocumentLink,
} from "@/lib/document-library";
import { sanitizeSegment } from "@/lib/media-library";

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg"]);
const SPREADSHEET_EXTENSIONS = new Set(["xls", "xlsx", "csv"]);
const TEXT_EXTENSIONS = new Set(["pdf", "doc", "docx", "txt", "rtf", "odt"]);

function extensionOf(name: string): string {
  const dotIndex = name.lastIndexOf(".");
  return dotIndex > 0 ? name.slice(dotIndex + 1).toLowerCase() : "";
}

function DocumentIcon({ name }: { name: string }) {
  const ext = extensionOf(name);
  const className = "flex-shrink-0 text-foreground/50";
  if (IMAGE_EXTENSIONS.has(ext)) return <FileImage size={24} className={className} />;
  if (SPREADSHEET_EXTENSIONS.has(ext)) {
    return <FileSpreadsheet size={24} className={className} />;
  }
  if (TEXT_EXTENSIONS.has(ext)) return <FileText size={24} className={className} />;
  return <File size={24} className={className} />;
}

function DocumentsContent() {
  const [entries, setEntries] = useState<DocumentEntry[]>([]);
  const [currentPath, setCurrentPath] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [links, setLinks] = useState<DocumentLink[]>([]);
  const [activities, setActivities] = useState<
    { id: string; name: string; date: string }[]
  >([]);

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
    const name = window.prompt("Nom du dossier :");
    if (!name) return;
    const folder = sanitizeSegment(name);
    // Un dossier n'existe dans Supabase Storage que s'il contient un fichier ;
    // on entre simplement dedans, il apparaîtra dans la liste dès le premier
    // téléversement.
    setCurrentPath(currentPath ? `${currentPath}/${folder}` : folder);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    e.target.value = "";
    if (!files || files.length === 0) return;
    setError(null);
    setIsUploading(true);
    try {
      await Promise.all(
        Array.from(files).map((file) => uploadDocument(file, currentPath)),
      );
      await fetchEntries();
    } catch {
      setError("Échec du téléversement d'un ou plusieurs fichiers.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFile = async (file: DocumentFile) => {
    if (!window.confirm(`Supprimer "${file.name}" ?`)) return;
    try {
      await deleteDocument(file.path);
      setEntries((prev) => prev.filter((e) => e.path !== file.path));
    } catch {
      alert("Échec de la suppression.");
    }
  };

  const handleDeleteFolder = async (folder: DocumentFolder) => {
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

  const handleLinkChange = async (path: string, activityId: string) => {
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

  return (
    <div>
      <h1 className={`${glofters.className} text-3xl text-foreground`}>
        Gestion documentaire
      </h1>
      <Breadcrumb />

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

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
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
        {!isLoading && !error && entries.length === 0 && (
          <p className="text-sm text-foreground/60">
            Ce dossier est vide.
          </p>
        )}

        {!isLoading && !error && entries.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {entries.map((entry) =>
              entry.type === "folder" ? (
                <div
                  key={entry.path}
                  className="group relative flex flex-col items-center justify-center gap-2 rounded-lg border border-black/[.08] bg-black/[.02] p-4 dark:border-white/[.145] dark:bg-white/[.03]"
                >
                  <button
                    type="button"
                    onClick={() => handleDeleteFolder(entry)}
                    aria-label="Supprimer le dossier"
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEnterFolder(entry.path)}
                    className="flex flex-col items-center gap-2"
                  >
                    <Folder size={36} className="text-foreground/40" />
                    <span className="max-w-full truncate text-xs text-foreground/70">
                      {entry.name}
                    </span>
                  </button>
                </div>
              ) : (
                <DocumentCard
                  key={entry.path}
                  file={entry}
                  link={links.find((l) => l.storage_path === entry.path)}
                  activities={activities}
                  onDelete={() => handleDeleteFile(entry)}
                  onLinkChange={(activityId) =>
                    handleLinkChange(entry.path, activityId)
                  }
                />
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentCard({
  file,
  link,
  activities,
  onDelete,
  onLinkChange,
}: {
  file: DocumentFile;
  link: DocumentLink | undefined;
  activities: { id: string; name: string; date: string }[];
  onDelete: () => void;
  onLinkChange: (activityId: string) => void;
}) {
  return (
    <div className="group relative flex flex-col gap-2 rounded-lg border border-black/[.08] p-3 dark:border-white/[.145]">
      <button
        type="button"
        onClick={onDelete}
        aria-label="Supprimer"
        className="absolute right-1 top-1 rounded-full p-1.5 text-foreground/40 opacity-0 transition-opacity hover:bg-black/[.05] group-hover:opacity-100 dark:hover:bg-white/[.08]"
      >
        <Trash2 size={14} />
      </button>
      <a
        href={file.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2"
      >
        <DocumentIcon name={file.name} />
        <span className="truncate text-sm text-foreground hover:underline">
          {file.name}
        </span>
      </a>
      <select
        value={link?.activity_id ?? ""}
        onChange={(e) => onLinkChange(e.target.value)}
        className="rounded border border-black/[.08] bg-white px-2 py-1 text-xs text-foreground dark:border-white/[.145] dark:bg-zinc-800"
      >
        <option value="">— Aucune campagne —</option>
        {activities.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <RequireFeature feature="documents">
      <DocumentsContent />
    </RequireFeature>
  );
}
