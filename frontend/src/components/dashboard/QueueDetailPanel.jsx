import React, { useEffect, useState, useCallback } from "react";
import {
  X,
  Copy,
  Check,
  PhoneCall,
  RotateCcw,
  CheckCircle2,
  SkipForward,
  Trash2,
  Pause,
  Play,
  Ban,
  Loader2,
  Pencil,
  RefreshCw,
  RotateCw,
} from "lucide-react";
import api from "../../utils/api";

const STATUS_LABEL = {
  waiting: { text: "Menunggu", cls: "bg-mist text-ink-soft" },
  calling: { text: "Dipanggil", cls: "bg-accent-light text-ink" },
  completed: { text: "Selesai", cls: "bg-mist-dark text-ink" },
  skipped: { text: "Dilewati", cls: "bg-ink/5 text-ink-soft line-through" },
  cancelled: { text: "Dibatalkan", cls: "bg-ink/5 text-ink-soft line-through" },
};

const FIELD_OPTIONS = [
  { key: "nama", label: "Nama" },
  { key: "nomor_telepon", label: "Nomor HP" },
  { key: "nomor_id", label: "Nomor / ID" },
];

export default function QueueDetailPanel({ queueId, onClose, onQueueChanged }) {
  const [queue, setQueue] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ nama_antrean: "", deskripsi: "", enabled_fields: [] });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  const publicUrl = queue ? `${window.location.origin}/q/${queue.qr_code_token}` : "";
  const qrImageUrl = queue
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(publicUrl)}`
    : "";

  const fetchDetail = useCallback(async () => {
    try {
      const [detailRes, entriesRes] = await Promise.all([
        api.get(`/queues/${queueId}`),
        api.get(`/queues/${queueId}/entries`),
      ]);
      setQueue(detailRes.data.queue);
      setEntries(entriesRes.data.entries);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [queueId]);

  useEffect(() => {
    fetchDetail();
    const interval = setInterval(fetchDetail, 4000);
    return () => clearInterval(interval);
  }, [fetchDetail]);

  const handleCallNext = async () => {
    setActionLoading(true);
    try {
      await api.post(`/queues/${queueId}/call-next`);
      await fetchDetail();
    } catch (err) {
      alert(err.message || "Tidak ada peserta yang menunggu.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecall = async () => {
    try {
      await api.post(`/queues/${queueId}/recall`);
    } catch (err) {
      alert(err.message || "Tidak ada nomor yang sedang dipanggil.");
    }
  };

  const handleEntryStatus = async (entryId, status) => {
    try {
      await api.patch(`/entries/${entryId}/status`, { status });
      fetchDetail();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteEntry = async (entryId, nomorAntrean) => {
    if (!confirm(`Hapus tiket nomor ${nomorAntrean}? Aksi ini tidak bisa dibatalkan.`)) return;
    try {
      await api.delete(`/entries/${entryId}`);
      fetchDetail();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleQueueStatus = async (status) => {
    try {
      const res = await api.patch(`/queues/${queueId}/status`, { status });
      setQueue(res.data.queue);
      onQueueChanged?.();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReset = async () => {
    if (!confirm("Reset antrean ini? Semua tiket peserta akan dihapus dan nomor mulai dari awal lagi.")) return;
    try {
      await api.post(`/queues/${queueId}/reset`);
      fetchDetail();
      onQueueChanged?.();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRegenerateQr = async () => {
    if (!confirm("Buat QR Code baru? QR Code lama akan langsung tidak berlaku.")) return;
    try {
      const res = await api.post(`/queues/${queueId}/regenerate-qr`);
      setQueue(res.data.queue);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const openEdit = () => {
    setEditForm({
      nama_antrean: queue.nama_antrean,
      deskripsi: queue.deskripsi || "",
      enabled_fields: Array.isArray(queue.enabled_fields) ? queue.enabled_fields : [],
    });
    setEditError("");
    setEditing(true);
  };

  const toggleEditField = (key) => {
    setEditForm((prev) => {
      const has = prev.enabled_fields.includes(key);
      if (has && prev.enabled_fields.length === 1) return prev;
      return {
        ...prev,
        enabled_fields: has
          ? prev.enabled_fields.filter((f) => f !== key)
          : [...prev.enabled_fields, key],
      };
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setEditError("");
    if (!editForm.nama_antrean.trim()) {
      setEditError("Nama antrean wajib diisi.");
      return;
    }
    setEditSaving(true);
    try {
      const res = await api.put(`/queues/${queueId}`, {
        nama_antrean: editForm.nama_antrean.trim(),
        deskripsi: editForm.deskripsi.trim() || null,
        enabled_fields: editForm.enabled_fields,
      });
      setQueue(res.data.queue);
      setEditing(false);
      onQueueChanged?.();
    } catch (err) {
      setEditError(err.message || "Gagal menyimpan perubahan.");
    } finally {
      setEditSaving(false);
    }
  };

  const nowCalling = entries.find((e) => e.status === "calling");
  const waitingList = entries.filter((e) => e.status === "waiting");
  const isClosed = queue?.status === "closed";

  const toLocalDateStr = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };
  const todayStr = toLocalDateStr(new Date());
  const entriesOnDate = (dateStr) =>
    entries.filter((e) => toLocalDateStr(new Date(e.created_at)) === dateStr);
  const displayedEntries = selectedDate ? entriesOnDate(selectedDate) : entries;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm px-4 py-8">
      <div className="w-full max-w-3xl max-h-full overflow-y-auto bg-white rounded-2xl shadow-xl border border-mist">
        <div className="flex items-start justify-between px-6 py-4 border-b border-mist sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h2 className="font-bold text-ink text-lg">{queue?.nama_antrean || "Memuat..."}</h2>
            {queue?.deskripsi && <p className="text-sm text-ink-soft mt-0.5">{queue.deskripsi}</p>}
          </div>
          <div className="flex items-center gap-3">
            {queue && !editing && (
              <button
                onClick={openEdit}
                title="Edit antrean"
                className="text-ink-soft hover:text-ink flex items-center gap-1 text-sm"
              >
                <Pencil size={16} />
              </button>
            )}
            <button onClick={onClose} className="text-ink-soft hover:text-ink">
              <X size={20} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-10 flex justify-center">
            <Loader2 className="animate-spin text-accent" size={28} />
          </div>
        ) : editing ? (
          <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
            {editError && (
              <div className="rounded-lg bg-ink/10 border border-ink/30 text-ink text-sm px-3 py-2">
                {editError}
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-ink mb-1.5">Nama antrean</label>
              <input
                type="text"
                value={editForm.nama_antrean}
                onChange={(e) => setEditForm((p) => ({ ...p, nama_antrean: e.target.value }))}
                className="w-full rounded-lg border border-mist-dark px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink mb-1.5">
                Deskripsi <span className="text-ink-soft font-normal">(opsional)</span>
              </label>
              <textarea
                rows={2}
                value={editForm.deskripsi}
                onChange={(e) => setEditForm((p) => ({ ...p, deskripsi: e.target.value }))}
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
                    onClick={() => toggleEditField(opt.key)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      editForm.enabled_fields.includes(opt.key)
                        ? "bg-accent text-white border-accent"
                        : "bg-white text-ink-soft border-mist-dark hover:border-accent"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={editSaving}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-accent text-white font-semibold py-2.5 hover:bg-accent-dark transition-colors disabled:opacity-60"
              >
                {editSaving && <Loader2 size={16} className="animate-spin" />}
                Simpan perubahan
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="flex-1 rounded-lg border border-mist-dark text-ink font-semibold py-2.5 hover:border-ink transition-colors"
              >
                Batal
              </button>
            </div>
          </form>
        ) : (
          <div className="grid md:grid-cols-[220px_1fr] gap-6 p-6">
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-xl border border-mist p-3 bg-white">
                <img src={qrImageUrl} alt="QR Code antrean" width={180} height={180} />
              </div>
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center gap-1.5 text-sm rounded-lg border border-mist-dark px-3 py-2 hover:border-accent hover:text-accent transition-colors"
              >
                {copied ? <Check size={15} className="text-ink" /> : <Copy size={15} />}
                {copied ? "Tersalin!" : "Salin tautan"}
              </button>
              <button
                onClick={handleRegenerateQr}
                className="w-full flex items-center justify-center gap-1.5 text-xs rounded-lg border border-mist-dark px-3 py-2 hover:border-ink hover:text-ink transition-colors"
              >
                <RefreshCw size={13} /> Buat QR baru
              </button>

              <div className="w-full flex items-center gap-2 mt-2">
                {queue?.status === "active" ? (
                  <button
                    onClick={() => handleQueueStatus("paused")}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs rounded-lg border border-mist-dark px-2 py-2 hover:border-ink hover:text-ink transition-colors"
                  >
                    <Pause size={14} /> Jeda
                  </button>
                ) : (
                  <button
                    onClick={() => handleQueueStatus("active")}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs rounded-lg border border-mist-dark px-2 py-2 hover:border-accent hover:text-accent-dark transition-colors"
                  >
                    <Play size={14} /> Aktifkan
                  </button>
                )}
                <button
                  onClick={() => handleQueueStatus("closed")}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs rounded-lg border border-mist-dark px-2 py-2 hover:border-ink hover:text-ink transition-colors"
                >
                  <Ban size={14} /> Tutup
                </button>
              </div>

              <button
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-1.5 text-xs rounded-lg border border-mist-dark px-3 py-2 text-ink-soft hover:border-ink hover:text-ink transition-colors mt-1"
              >
                <RotateCw size={13} /> Reset antrean
              </button>

              {isClosed && (
                <p className="text-xs text-ink-soft text-center">
                  Antrean ditutup — peserta baru tidak bisa ambil nomor.
                </p>
              )}
            </div>

            <div>
              <div className="rounded-xl bg-accent-light p-5 flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-accent mb-1">Sedang dipanggil</p>
                  <p className="ticket-number text-4xl font-bold text-ink">
                    {nowCalling ? `#${nowCalling.nomor_antrean}` : "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {nowCalling && (
                    <button
                      onClick={handleRecall}
                      title="Panggil ulang nomor yang sama"
                      className="flex items-center gap-2 rounded-lg border border-accent-dark/30 text-ink font-semibold px-3 py-2.5 hover:bg-white/60 transition-colors"
                    >
                      <RotateCcw size={16} />
                    </button>
                  )}
                  <button
                    onClick={handleCallNext}
                    disabled={actionLoading || waitingList.length === 0 || queue?.status !== "active"}
                    className="flex items-center gap-2 rounded-lg bg-accent text-white font-semibold px-4 py-2.5 hover:bg-accent-dark transition-colors disabled:opacity-40"
                  >
                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <PhoneCall size={16} />}
                    Panggil berikutnya
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <p className="text-xs font-semibold uppercase text-ink-soft">
                  Daftar peserta ({displayedEntries.length})
                  {selectedDate && (
                    <span className="normal-case font-normal">
                      {" "}
                      —{" "}
                      {new Date(selectedDate).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="text-xs rounded-lg border border-mist-dark px-2 py-1 outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                  />
                  {selectedDate !== todayStr && (
                    <button
                      onClick={() => setSelectedDate(todayStr)}
                      className="text-xs font-medium px-2.5 py-1 rounded-full border border-mist-dark text-ink-soft hover:border-accent transition-colors"
                    >
                      Hari ini
                    </button>
                  )}
                  {selectedDate && (
                    <button
                      onClick={() => setSelectedDate("")}
                      className="text-xs font-medium px-2.5 py-1 rounded-full border border-mist-dark text-ink-soft hover:border-ink transition-colors"
                    >
                      Semua
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {displayedEntries.length === 0 && (
                  <p className="text-sm text-ink-soft py-6 text-center">
                    {selectedDate ? "Tidak ada peserta pada tanggal ini." : "Belum ada peserta."}
                  </p>
                )}
                {displayedEntries.map((entry) => {
                  const statusInfo = STATUS_LABEL[entry.status] || STATUS_LABEL.waiting;
                  return (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between rounded-lg border border-mist px-3 py-2"
                    >
                      <div className="flex items-center gap-3">
                        <span className="ticket-number font-bold text-ink w-10">#{entry.nomor_antrean}</span>
                        <span className="text-sm text-ink-soft">
                          {entry.data_peserta?.nama || entry.data_peserta?.nomor_id || "Tanpa nama"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusInfo.cls}`}>
                          {statusInfo.text}
                        </span>
                        {(entry.status === "waiting" || entry.status === "calling") && (
                          <>
                            <button
                              title="Tandai selesai"
                              onClick={() => handleEntryStatus(entry.id, "completed")}
                              className="text-ink hover:bg-accent-light rounded-md p-1"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                            <button
                              title="Lewati"
                              onClick={() => handleEntryStatus(entry.id, "skipped")}
                              className="text-ink-soft hover:bg-mist rounded-md p-1"
                            >
                              <SkipForward size={16} />
                            </button>
                          </>
                        )}
                        <button
                          title="Hapus tiket"
                          onClick={() => handleDeleteEntry(entry.id, entry.nomor_antrean)}
                          className="text-ink-soft/60 hover:text-ink hover:bg-mist rounded-md p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}