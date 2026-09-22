import React from "react";
import { Loader2 } from "lucide-react";

export default function ConfirmModal({ title, description, confirmLabel = "Ya, lanjutkan", danger, loading, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-mist p-6">
        <h2 className="font-bold text-ink text-lg mb-1.5">{title}</h2>
        {description && <p className="text-sm text-ink-soft mb-5">{description}</p>}
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-lg border border-mist-dark text-ink font-semibold py-2.5 hover:border-ink transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg text-white font-semibold py-2.5 transition-colors disabled:opacity-60 ${
              danger ? "bg-ink hover:bg-ink/80" : "bg-accent hover:bg-accent-dark"
            }`}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}