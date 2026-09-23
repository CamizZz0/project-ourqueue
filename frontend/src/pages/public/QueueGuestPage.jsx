import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { Loader2, Ticket, Users, AlertCircle, CheckCircle2, SkipForward, Bell } from "lucide-react";
import api from "../../utils/api";
import { registerSW, subscribePush, isPushSupported } from "../../utils/push";

const FIELD_LABELS = {
  nama: "Nama",
  nomor_telepon: "Nomor HP",
  nomor_id: "Nomor / ID",
};

const STATUS_COPY = {
  waiting: { title: "Menunggu giliran", cls: "text-accent", icon: Ticket },
  calling: { title: "Giliran kamu sekarang!", cls: "text-ink", icon: AlertCircle },
  completed: { title: "Sudah selesai dilayani", cls: "text-ink-soft", icon: CheckCircle2 },
  skipped: { title: "Dilewati", cls: "text-ink-soft", icon: SkipForward },
  cancelled: { title: "Dibatalkan", cls: "text-ink-soft", icon: SkipForward },
};

export default function QueueGuestPage() {
  const { qrToken } = useParams();
  const storageKey = `ourqueue_ticket_${qrToken}`;

  const [queue, setQueue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [aheadCount, setAheadCount] = useState(0);
  // idle | checking | granted | denied | unsupported | sync-failed
  const [pushState, setPushState] = useState("idle");
  const prevStatusRef = useRef(null);

  useEffect(() => {
    api
      .get(`/queues/qr/${qrToken}`)
      .then((res) => setQueue(res.data.queue))
      .catch((err) => setError(err.message || "Antrean tidak ditemukan."))
      .finally(() => setLoading(false));
  }, [qrToken]);

  useEffect(() => {
    registerSW();
    if (!isPushSupported()) setPushState("unsupported");
    else if (Notification.permission === "denied") setPushState("denied");
    // Permission granted di browser belum tentu subscription-nya ada di server
    // (mis. habis pindah ke deployment baru), jadi tunggu hasil sinkronisasi.
    else if (Notification.permission === "granted") setPushState("checking");
  }, []);

  // Permission granted di browser belum cukup: server harus punya subscription-nya.
  // Kalau sinkronisasi gagal, tampilkan pesan supaya user bisa coba lagi.
  const applyPushResult = useCallback((r) => {
    if (r.ok && r.synced) return setPushState("granted");
    if (r.reason === "denied") return setPushState("denied");
    if (r.reason === "unsupported") return setPushState("unsupported");
    if (r.reason === "default") return setPushState("idle");
    return setPushState("sync-failed");
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem(storageKey);
    if (savedToken) {
      fetchTicket(savedToken);
      // re-subscribe di background agar push tetap aktif meski pernah tutup tab
      if (isPushSupported() && Notification.permission === "granted") {
        subscribePush(savedToken).then(applyPushResult);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrToken]);

  const fetchTicket = useCallback(async (participantToken) => {
    try {
      const res = await api.get(`/entries/${participantToken}`);
      const newTicket = res.data.tiket;
      // deteksi transisi waiting -> calling untuk notif in-app fallback (tab terbuka)
      if (prevStatusRef.current === "waiting" && newTicket.status === "calling" && Notification.permission === "granted" && document.hidden === false) {
        try { new Notification(`Giliran kamu! #${newTicket.nomor_antrean}`, { body: `${queue?.nama_antrean || "Antrean"} — silakan menuju loket`, icon: "/favicon.svg" }); } catch {}
      }
      prevStatusRef.current = newTicket.status;
      setTicket(newTicket);
      setAheadCount(res.data.sisa_antrean_di_depan);
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey, queue?.nama_antrean]);

  useEffect(() => {
    if (!ticket || ticket.status === "completed" || ticket.status === "skipped") return;
    const interval = setInterval(() => fetchTicket(ticket.participant_token), 4000);
    return () => clearInterval(interval);
  }, [ticket, fetchTicket]);

  const handleFieldChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleEnablePush = async () => {
    if (!ticket) return;
    setPushState("checking");
    const r = await subscribePush(ticket.participant_token);
    applyPushResult(r);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await api.post("/entries", {
        queue_id: queue.id,
        data_peserta: formData,
      });
      const token = res.data.entry.participant_token;
      localStorage.setItem(storageKey, token);
      setTicket(res.data.entry);
      prevStatusRef.current = res.data.entry.status;
      setAheadCount(res.data.entry.nomor_antrean - 1);
      // langsung coba subscribe push di background (tidak blokir UX)
      if (isPushSupported()) {
        subscribePush(token).then(applyPushResult);
      }
    } catch (err) {
      setError(err.message || "Gagal mengambil nomor antrean.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  if (error && !queue) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <AlertCircle className="text-ink mb-3" size={32} />
        <p className="text-ink font-semibold">{error}</p>
      </div>
    );
  }

  if (ticket) {
    const copy = STATUS_COPY[ticket.status] || STATUS_COPY.waiting;
    const Icon = copy.icon;
    return (
      <div className="max-w-sm mx-auto px-4 py-14">
        <div className="bg-white rounded-2xl border border-mist shadow-sm overflow-hidden">
          <div className="bg-accent-light px-6 py-8 text-center">
            <p className="text-sm font-semibold text-accent mb-1">{queue?.nama_antrean}</p>
            <p className="ticket-number text-6xl font-bold text-ink">#{ticket.nomor_antrean}</p>
          </div>
          <div className="px-6 py-5 text-center border-t border-mist">
            <div className={`flex items-center justify-center gap-2 font-semibold mb-2 ${copy.cls}`}>
              <Icon size={18} />
              {copy.title}
            </div>
            {ticket.status === "waiting" && (
              <p className="text-sm text-ink-soft flex items-center justify-center gap-1.5">
                <Users size={14} />
                {aheadCount} orang di depan kamu
              </p>
            )}
            {ticket.status === "calling" && (
              <p className="text-sm text-ink-soft">Silakan menuju loket sekarang.</p>
            )}
          </div>
        </div>
        {ticket.status === "waiting" && pushState === "checking" && (
          <p className="text-center text-xs text-ink-soft mt-3 flex items-center justify-center gap-1">
            <Bell size={12} /> Memeriksa status notifikasi...
          </p>
        )}
        {ticket.status === "waiting" && (pushState === "idle" || pushState === "sync-failed") && (
          <div className="mt-4 rounded-xl border border-mist bg-white p-3 flex items-center justify-between gap-3">
            <div className="text-left">
              <p className="text-sm font-semibold text-ink flex items-center gap-1.5"><Bell size={14} /> Aktifkan notifikasi</p>
              <p className="text-xs text-ink-soft">
                {pushState === "sync-failed"
                  ? "Gagal tersambung ke server. Coba aktifkan lagi."
                  : "Biar tetap dipanggil meski tab tertutup."}
              </p>
            </div>
            <button onClick={handleEnablePush} className="shrink-0 rounded-lg bg-accent text-white text-sm font-semibold px-3 py-1.5 hover:bg-accent-dark">
              Aktifkan
            </button>
          </div>
        )}
        {pushState === "granted" && ticket.status === "waiting" && (
          <p className="text-center text-xs text-ink-soft mt-3 flex items-center justify-center gap-1"><Bell size={12} /> Notifikasi aktif — kamu akan dipanggil meski tab tertutup.</p>
        )}
        {pushState === "denied" && (
          <p className="text-center text-xs text-ink-soft mt-3">Notifikasi diblokir. Aktifkan di pengaturan browser.</p>
        )}
        <p className="text-center text-xs text-ink-soft mt-4">
          Halaman ini otomatis diperbarui. Boleh ditutup dan dibuka lagi kapan saja.
        </p>
      </div>
    );
  }

  const enabledFields = Array.isArray(queue?.enabled_fields) ? queue.enabled_fields : [];
  const isNotAcceptingEntries = queue?.status !== "active";

  return (
    <div className="max-w-sm mx-auto px-4 py-14">
      <div className="text-center mb-6">
        <span className="inline-flex w-12 h-12 rounded-2xl bg-accent text-white items-center justify-center mb-4">
          <Ticket size={22} />
        </span>
        <h1 className="text-xl font-extrabold text-ink">{queue?.nama_antrean}</h1>
        {queue?.deskripsi && <p className="text-sm text-ink-soft mt-1">{queue.deskripsi}</p>}
      </div>

      {isNotAcceptingEntries ? (
        <div className="bg-white rounded-2xl border border-mist p-6 text-center">
          <p className="text-ink-soft text-sm">
            {queue?.status === "paused"
            ? "Antrean sedang dijeda sementara. Coba scan lagi beberapa saat lagi."
            : "Antrean ini sudah ditutup dan tidak menerima pendaftaran baru."}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-mist p-6 space-y-4 shadow-sm">
          {error && (
            <div className="rounded-lg bg-ink/10 border border-ink/30 text-ink text-sm px-3 py-2">
              {error}
            </div>
          )}

          {enabledFields.length === 0 ? (
            <p className="text-sm text-ink-soft text-center py-2">Cukup tekan tombol di bawah untuk ambil nomor.</p>
          ) : (
            enabledFields.map((field) => (
              <div key={field}>
                <label className="block text-sm font-semibold text-ink mb-1.5">
                  {FIELD_LABELS[field] || field}
                </label>
                <input
                  type="text"
                  required
                  value={formData[field] || ""}
                  onChange={(e) => handleFieldChange(field, e.target.value)}
                  className="w-full rounded-lg border border-mist-dark px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition"
                />
              </div>
            ))
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent text-white font-semibold py-2.5 hover:bg-accent-dark transition-colors disabled:opacity-60"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Ticket size={18} />}
            {submitting ? "Memproses..." : "Ambil nomor antrean"}
          </button>
        </form>
      )}
    </div>
  );
}