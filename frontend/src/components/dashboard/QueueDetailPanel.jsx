import React, { useEffect, useState, useCallback } from "react";
import {
  X,
  QrCode,
  Copy,
  Check,
  PhoneCall,
  CheckCircle2,
  SkipForward,
  Pause,
  Play,
  Ban,
  Loader2,
} from "lucide-react";
import api from "../../utils/api";

const STATUS_LABEL = {
  waiting: { text: "Menunggu", cls: "bg-mist text-ink-soft" },
  calling: { text: "Dipanggil", cls: "bg-accent-light text-ink" },
  completed: { text: "Selesai", cls: "bg-mist-dark text-ink" },
  skipped: { text: "Dilewati", cls: "bg-ink/5 text-ink-soft line-through" },
};

export default function QueueDetailPanel({ queueId, onClose, onQueueChanged }) {
  const [queue, setQueue] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const publicUrl = queue ? `${window.location.origin}/q/${queue.qr_code_token}` : "";
  const qrImageUrl = queue
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(publicUrl)}`
    : "";

  const fetchDetail = useCallback(async () => {
    try {
      const res = await api.get(`/entries/queue/${queueId}`);
      setQueue(res.data.queue);
      setEntries(res.data.entries);
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
      await api.post(`/entries/queue/${queueId}/call-next`);
      await fetchDetail();
    } catch (err) {
      alert(err.message || "Tidak ada peserta yang menunggu.");
    } finally {
      setActionLoading(false);
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

  const handleQueueStatus = async (status) => {
    try {
      const res = await api.patch(`/queues/${queueId}/status`, { status });
      setQueue(res.data.queue);
      onQueueChanged?.();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const nowCalling = entries.find((e) => e.status === "calling");
  const waitingList = entries.filter((e) => e.status === "waiting");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm px-4 py-8">
      <div className="w-full max-w-3xl max-h-full overflow-y-auto bg-white rounded-2xl shadow-xl border border-mist">
        <div className="flex items-start justify-between px-6 py-4 border-b border-mist sticky top-0 bg-white rounded-t-2xl">
          <div>
            <h2 className="font-bold text-ink text-lg">{queue?.nama_antrean || "Memuat..."}</h2>
            {queue?.deskripsi && <p className="text-sm text-ink-soft mt-0.5">{queue.deskripsi}</p>}
          </div>
          <button onClick={onClose} className="text-ink-soft hover:text-ink">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="p-10 flex justify-center">
            <Loader2 className="animate-spin text-accent" size={28} />
          </div>
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
            </div>

            <div>
              <div className="rounded-xl bg-accent-light p-5 flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-accent mb-1">Sedang dipanggil</p>
                  <p className="ticket-number text-4xl font-bold text-ink">
                    {nowCalling ? `#${nowCalling.nomor_antrean}` : "—"}
                  </p>
                </div>
                <button
                  onClick={handleCallNext}
                  disabled={actionLoading || waitingList.length === 0}
                  className="flex items-center gap-2 rounded-lg bg-accent text-white font-semibold px-4 py-2.5 hover:bg-accent-dark transition-colors disabled:opacity-40"
                >
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <PhoneCall size={16} />}
                  Panggil berikutnya
                </button>
              </div>

              <p className="text-xs font-semibold uppercase text-ink-soft mb-2">
                Daftar peserta ({entries.length})
              </p>
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {entries.length === 0 && (
                  <p className="text-sm text-ink-soft py-6 text-center">Belum ada peserta.</p>
                )}
                {entries.map((entry) => {
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