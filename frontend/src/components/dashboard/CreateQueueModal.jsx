import React, { useState } from "react";
import { X, Loader2 } from "lucide-react";
import api from "../../utils/api";

const FIELD_OPTIONS = [
  { key: "nama", label: "Nama" },
  { key: "nomor_telepon", label: "Nomor HP" },
  { key: "nomor_id", label: "Nomor / ID" },
];

export default function CreateQueueModal({ onClose, onCreated }) {
  const [namaAntrean, setNamaAntrean] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [fields, setFields] = useState(["nama"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleField = (key) => {
    setFields((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev;
        return prev.filter((f) => f !== key);
      }
      return [...prev, key];
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!namaAntrean.trim()) {
      setError("Nama antrean wajib diisi.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/queues", {
        nama_antrean: namaAntrean.trim(),
        deskripsi: deskripsi.trim(),
        enabled_fields: fields,
      });
      onCreated(res.data.queue);
    } catch (err) {
      setError(err.message || "Gagal membuat antrean.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm px-3 sm:px-4">
      <div className="w-full max-w-md bg-white rounded-xl sm:rounded-2xl shadow-xl border border-mist max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-mist sticky top-0 bg-white rounded-t-xl sm:rounded-t-2xl z-10">
          <h2 className="font-bold text-ink text-lg">Buat antrean baru</h2>
          <button onClick={onClose} className="text-ink-soft hover:text-ink">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-4 sm:px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-lg bg-ink/10 border border-ink/30 text-ink text-sm px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5">Nama antrean</label>
            <input
              type="text"
              value={namaAntrean}
              onChange={(e) => setNamaAntrean(e.target.value)}
              placeholder="Contoh: Loket Pendaftaran KRS"
              className="w-full rounded-lg border border-mist-dark px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5">
              Deskripsi <span className="text-ink-soft font-normal">(opsional)</span>
            </label>
            <textarea
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              rows={2}
              placeholder="Keterangan singkat untuk peserta"
              className="w-full rounded-lg border border-mist-dark px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5">Data yang diisi peserta</label>
            <div className="flex flex-wrap gap-2">
              {FIELD_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.key}
                  onClick={() => toggleField(opt.key)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    fields.includes(opt.key)
                      ? "bg-accent text-white border-accent"
                      : "bg-white text-ink-soft border-mist-dark hover:border-accent"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-ink-soft mt-1.5">
              {fields.length === 0
                ? "Tidak ada data — peserta cukup ambil nomor tanpa isi apa pun."
                : "Peserta wajib mengisi field yang dipilih."}
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent text-white font-semibold py-2.5 hover:bg-accent-dark transition-colors disabled:opacity-60"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {loading ? "Membuat..." : "Buat antrean"}
          </button>
        </form>
      </div>
    </div>
  );
}