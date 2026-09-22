import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({ meta, onPageChange, itemLabel = "data" }) {
  if (!meta) return null;
  const { page, totalPages, total } = meta;

  return (
    <div className="flex items-center justify-between text-sm border-t border-mist pt-4 mt-2">
      <p className="text-ink-soft">
        Menampilkan halaman {page} dari {totalPages || 1} ({total ?? 0} {itemLabel})
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="flex items-center gap-1 rounded-lg border border-mist-dark px-2.5 py-1.5 text-ink-soft hover:border-accent hover:text-accent disabled:opacity-40 disabled:hover:border-mist-dark disabled:hover:text-ink-soft transition-colors"
        >
          <ChevronLeft size={14} /> Prev
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= (totalPages || 1)}
          className="flex items-center gap-1 rounded-lg border border-mist-dark px-2.5 py-1.5 text-ink-soft hover:border-accent hover:text-accent disabled:opacity-40 disabled:hover:border-mist-dark disabled:hover:text-ink-soft transition-colors"
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}