"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

export const DEFAULT_PAGE_SIZE = 20;

export function usePagination<T>(
  items: T[],
  pageSize: number = DEFAULT_PAGE_SIZE,
) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);
  return { page: currentPage, pageCount, setPage, pageItems };
}

function getPageList(current: number, total: number): (number | "ellipsis")[] {
  const delta = 1;
  const range: number[] = [];
  for (let i = 1; i <= total; i++) {
    if (
      i === 1 ||
      i === total ||
      (i >= current - delta && i <= current + delta)
    ) {
      range.push(i);
    }
  }

  const withDots: (number | "ellipsis")[] = [];
  let prev = 0;
  for (const i of range) {
    if (prev) {
      if (i - prev === 2) withDots.push(prev + 1);
      else if (i - prev > 2) withDots.push("ellipsis");
    }
    withDots.push(i);
    prev = i;
  }
  return withDots;
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;

  const pages = getPageList(page, pageCount);

  return (
    <div className="mt-4 flex items-center justify-center gap-1">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Page précédente"
        className="rounded-full p-2 text-foreground/60 transition-colors hover:bg-black/[.05] disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/[.08]"
      >
        <ChevronLeft size={16} />
      </button>
      {pages.map((p, index) =>
        p === "ellipsis" ? (
          <span
            key={`ellipsis-${index}`}
            className="px-2 text-sm text-foreground/40"
          >
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            aria-label={`Page ${p}`}
            aria-current={p === page ? "page" : undefined}
            className={`flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm font-medium transition-colors ${
              p === page
                ? "bg-primary text-white"
                : "text-foreground/70 hover:bg-black/[.05] dark:hover:bg-white/[.08]"
            }`}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pageCount}
        aria-label="Page suivante"
        className="rounded-full p-2 text-foreground/60 transition-colors hover:bg-black/[.05] disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/[.08]"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
