import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { Loader2, Ticket, Users, AlertCircle, CheckCircle2, SkipForward, Bell } from "lucide-react";
import api from "../../utils/api";
import { registerSW, subscribePush, isPushSupported } from "../../utils/push";
import { supportsEntryStream, openTicketStream } from "../../utils/entryStream";

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

// Status akhir: tiket tidak akan berubah lagi, jadi polling boleh dihentikan.
const FINAL_STATUSES = ["completed", "skipped", "cancelled"];

const POLL_INTERVAL_MS = 4000;
const MAX_POLL_INTERVAL_MS = 30000;
const FETCH_ATTEMPTS = 3;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Notifikasi in-app (fallback saat tab terbuka). SEMUA akses API Notification harus
// dijaga di dalam sini: di webview in-app (mis. buka lewat scan QR dari aplikasi
// Kamera iOS), `Notification` tidak ada sama sekali → kalau diakses langsung akan
// melempar ReferenceError dan menggagalkan update status tiket.
function notifyCallingInApp(ticket, namaAntrean) {
  try {
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    if (document.hidden) return;
    new Notification(`Giliran kamu! #${ticket.nomor_antrean}`, {
      body: `${namaAntrean || "Antrean"} — silakan menuju loket`,
      icon: "/favicon.svg",
    });
  } catch (e) {
    // iOS Safari tidak selalu mengizinkan konstruktor Notification (butuh push
    // lewat service worker), jadi kegagalan di sini tidak boleh mengganggu apa pun.
    console.warn("[tiket] notif in-app gagal:", e?.message || e);
  }
}

export default function QueueGuestPage() {
  const { qrToken } = useParams();
  const storageKey = `ourqueue_ticket_${qrToken}`;
  // Cache data tiket terakhir, supaya refresh tidak mengembalikan user ke form pendaftaran.
  const cachedTicketKey = `ourqueue_ticket_data_${qrToken}`;

  const [queue, setQueue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [aheadCount, setAheadCount] = useState(0);
  // true selama masih ada tiket tersimpan: form pendaftaran tidak boleh muncul
  // supaya user tidak mengambil nomor baru tanpa sengaja.
  const [hasSavedTicket, setHasSavedTicket] = useState(false);
  const [ticketError, setTicketError] = useState("");
  // Dipakai untuk memperlambat polling kalau server sedang bermasalah.
  const fetchFailuresRef = useRef(0);
  // idle | checking | granted | denied | unsupported | sync-failed
  const [pushState, setPushState] = useState("idle");
  // off | connecting | live | error — status koneksi SSE (update realtime)
  const [streamState, setStreamState] = useState("off");
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
    if (!savedToken) return;

    // Ada tiket tersimpan → halaman ini fokus ke tiket itu, bukan pendaftaran baru.
    setHasSavedTicket(true);

    // Tampilkan tiket terakhir dari cache dulu supaya tidak berkedip ke form
    // sambil menunggu respons server.
    try {
      const cached = JSON.parse(localStorage.getItem(cachedTicketKey) || "null");
      if (cached?.tiket) {
        setTicket(cached.tiket);
        setAheadCount(cached.sisa_antrean_di_depan ?? 0);
        prevStatusRef.current = cached.tiket.status ?? null;
      }
    } catch {}

    fetchTicket(savedToken);

    // re-subscribe di background agar push tetap aktif meski pernah tutup tab
    if (isPushSupported() && Notification.permission === "granted") {
      subscribePush(savedToken).then(applyPushResult);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrToken]);

  const retrySavedTicket = () => {
    const savedToken = localStorage.getItem(storageKey);
    if (savedToken) fetchTicket(savedToken);
  };

  // Tiket sudah selesai/dilewati/dibatalkan: baru boleh mendaftar nomor baru.
  const resetTicket = () => {
    localStorage.removeItem(storageKey);
    localStorage.removeItem(cachedTicketKey);
    setTicket(null);
    setAheadCount(0);
    setTicketError("");
    setHasSavedTicket(false);
    prevStatusRef.current = null;
  };

  // Satu pintu untuk semua update tiket, dipakai oleh polling DAN stream SSE.
  // Update state dilakukan sebelum apa pun yang menyentuh API notifikasi, supaya
  // kegagalan notifikasi tidak pernah bisa menggagalkan update status tiket.
  const applyTicketData = useCallback((newTicket, sisaAntreanDiDepan) => {
    if (!newTicket) return;

    const wasWaiting = prevStatusRef.current === "waiting";
    prevStatusRef.current = newTicket.status;
    setTicket((prev) => ({ ...prev, ...newTicket }));
    if (typeof sisaAntreanDiDepan === "number") setAheadCount(sisaAntreanDiDepan);
    setTicketError("");
    fetchFailuresRef.current = 0;

    // simpan sebagai cache supaya refresh menampilkan tiket ini lagi, bukan form
    try {
      const cached = JSON.parse(localStorage.getItem(cachedTicketKey) || "null");
      localStorage.setItem(
        cachedTicketKey,
        JSON.stringify({
          tiket: { ...(cached?.tiket || {}), ...newTicket },
          sisa_antrean_di_depan:
            typeof sisaAntreanDiDepan === "number"
              ? sisaAntreanDiDepan
              : cached?.sisa_antrean_di_depan ?? 0,
        })
      );
    } catch {}

    // Notif in-app saat transisi waiting -> calling
    if (wasWaiting && newTicket.status === "calling") {
      notifyCallingInApp(newTicket, queue?.nama_antrean);
    }
  }, [cachedTicketKey, queue?.nama_antrean]);

  // Tiket benar-benar sudah tidak ada di server (dihapus admin / antrean direset).
  // Error lain (jaringan, 429, 5xx) TIDAK boleh menghapus tiket: user jadi dilempar
  // ke form pendaftaran dan mengambil nomor baru (duplikat).
  const clearSavedTicket = useCallback(() => {
    localStorage.removeItem(storageKey);
    localStorage.removeItem(cachedTicketKey);
    setHasSavedTicket(false);
    setTicket(null);
    setTicketError("");
    prevStatusRef.current = null;
  }, [storageKey, cachedTicketKey]);

  const fetchTicket = useCallback(async (participantToken) => {
    // Serverless (cold start) + Neon kadang membuat satu request gagal begitu saja,
    // jadi coba beberapa kali dulu sebelum menampilkan error ke user.
    let lastError = null;

    for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt++) {
      try {
        const res = await api.get(`/entries/${participantToken}`);
        applyTicketData(res.data.tiket, res.data.sisa_antrean_di_depan);
        return;
      } catch (err) {
        lastError = err;
        // 404 = tiket memang sudah tidak ada, percuma diulang
        if (err?.statusCode === 404) break;
        if (attempt < FETCH_ATTEMPTS) await sleep(1200);
      }
    }

    console.warn("[tiket] gagal memuat status tiket:", lastError?.statusCode, lastError?.message);

    if (lastError?.statusCode === 404) {
      clearSavedTicket();
      return;
    }

    fetchFailuresRef.current += 1;
    setTicketError(lastError?.message || "Tidak bisa menghubungi server.");
  }, [applyTicketData, clearSavedTicket]);

  // SSE: sumber update utama. Stream-nya yang menjaga koneksi ke server, jadi
  // perubahan status sampai tanpa harus menembak request tiap 4 detik.
  useEffect(() => {
    const participantToken = ticket?.participant_token;
    if (!participantToken) return;
    // Status sudah final: tidak ada lagi yang perlu ditunggu.
    if (FINAL_STATUSES.includes(ticket.status)) return;
    if (!supportsEntryStream()) return;

    setStreamState("connecting");
    const stream = openTicketStream(participantToken, {
      onStatusChange: setStreamState,
      onTicket: (state) => applyTicketData(state?.tiket, state?.sisa_antrean_di_depan),
      onGone: clearSavedTicket,
      onError: () => setStreamState("error"),
    });

    return () => {
      stream.close();
      setStreamState("off");
    };
  }, [ticket?.participant_token, ticket?.status, applyTicketData, clearSavedTicket]);

  useEffect(() => {
    if (!ticket || FINAL_STATUSES.includes(ticket.status)) return;
    // Selama stream realtime hidup, polling dimatikan — ini inti penghematan
    // invocation function di Vercel.
    if (streamState === "live") return;
    const participantToken = ticket.participant_token;
    let timer = null;

    // Interval dinamis: kalau server sedang error, polling diperlambat supaya
    // tidak menambah beban, tapi kembali cepat begitu server sehat.
    const tick = async () => {
      await fetchTicket(participantToken);
      const backoff = Math.min(
        POLL_INTERVAL_MS * 2 ** Math.min(fetchFailuresRef.current, 3),
        MAX_POLL_INTERVAL_MS
      );
      timer = setTimeout(tick, fetchFailuresRef.current === 0 ? POLL_INTERVAL_MS : backoff);
    };
    timer = setTimeout(tick, POLL_INTERVAL_MS);

    // Tab yang di-background di-throttle browser (bisa jadi cuma 1x per menit),
    // jadi langsung refresh begitu user kembali ke halaman.
    const refreshWhenVisible = () => {
      if (!document.hidden) fetchTicket(participantToken);
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshWhenVisible);
    window.addEventListener("online", refreshWhenVisible);

    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshWhenVisible);
      window.removeEventListener("online", refreshWhenVisible);
    };
  }, [ticket, fetchTicket, streamState]);

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
      try {
        localStorage.setItem(
          cachedTicketKey,
          JSON.stringify({
            tiket: res.data.entry,
            sisa_antrean_di_depan: Math.max(res.data.entry.nomor_antrean - 1, 0),
          })
        );
      } catch {}
      setHasSavedTicket(true);
      setTicketError("");
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
        {ticket.status === "waiting" && pushState === "unsupported" && (
          <p className="text-center text-xs text-ink-soft mt-3">
            Notifikasi otomatis tidak didukung di browser ini — halaman ini tetap diperbarui sendiri.
          </p>
        )}
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
        {FINAL_STATUSES.includes(ticket.status) && (
          <button
            onClick={resetTicket}
            className="mt-4 w-full rounded-lg border border-mist-dark bg-white text-ink text-sm font-semibold py-2 hover:bg-mist transition-colors"
          >
            Ambil nomor baru
          </button>
        )}
        {ticketError && (
          <div className="mt-3 rounded-xl border border-mist bg-white p-3 text-center">
            <p className="text-xs text-ink-soft">
              Belum bisa terhubung ke server: <span className="font-semibold text-ink">{ticketError}</span>
            </p>
            <p className="text-xs text-ink-soft mt-1">
              Tiket di atas masih berlaku dan akan diperbarui otomatis.
            </p>
            <button
              onClick={retrySavedTicket}
              className="mt-2 rounded-lg border border-mist-dark text-ink text-xs font-semibold px-3 py-1.5 hover:bg-mist transition-colors"
            >
              Coba lagi
            </button>
          </div>
        )}
        <p className="text-center text-xs text-ink-soft mt-4">
          {streamState === "live" ? "Terhubung langsung (realtime). " : ""}
          Halaman ini otomatis diperbarui. Boleh ditutup dan dibuka lagi kapan saja.
        </p>
      </div>
    );
  }

  // Tiket tersimpan tapi datanya belum/tidak bisa dimuat: tampilkan status pemuatan
  // atau tombol coba lagi, JANGAN form pendaftaran.
  if (hasSavedTicket) {
    return (
      <div className="max-w-sm mx-auto px-4 py-14 text-center">
        {ticketError ? (
          <>
            <AlertCircle className="text-ink mx-auto mb-3" size={32} />
            <p className="text-sm font-semibold text-ink mb-1">Tiket kamu belum bisa dimuat</p>
            <p className="text-xs text-ink-soft mb-4">{ticketError}</p>
            <button
              onClick={retrySavedTicket}
              className="rounded-lg bg-accent text-white text-sm font-semibold px-4 py-2 hover:bg-accent-dark"
            >
              Coba lagi
            </button>
          </>
        ) : (
          <>
            <Loader2 className="animate-spin text-accent mx-auto" size={32} />
            <p className="text-sm text-ink-soft mt-3">Memuat tiket antrean kamu...</p>
          </>
        )}
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