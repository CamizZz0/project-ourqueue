import { API_BASE_URL } from "./api";

// Kalau tidak ada event (termasuk ping dari server) selama ini, koneksi dianggap macet.
const WATCHDOG_MS = 35000;
// Kalau stream gagal terus sejak awal (mis. durasi function dipotong), menyerah dan
// biar polling yang jadi sumber update.
const MAX_ERRORS_BEFORE_GIVING_UP = 5;

export function supportsEntryStream() {
  return typeof EventSource !== "undefined";
}

/**
 * Buka stream SSE status tiket peserta.
 *
 * handlers:
 * - onTicket(state)        → { tiket, sisa_antrean_di_depan, estimasi_menit }
 * - onGone()               → tiket sudah tidak ada di server
 * - onStatusChange(status) → "connecting" | "live" | "error"
 * - onError(reason)
 */
export function openTicketStream(participantToken, handlers = {}) {
  const { onTicket, onGone, onStatusChange, onError } = handlers;

  let closed = false;
  let everLive = false;
  let errorCount = 0;
  let watchdog = null;

  const source = new EventSource(
    `${API_BASE_URL}/entries/${encodeURIComponent(participantToken)}/stream`
  );

  const close = () => {
    closed = true;
    if (watchdog) clearTimeout(watchdog);
    source.close();
  };

  // EventSource tidak memberi tahu kalau koneksi diam-diam macet (mis. ditahan proxy),
  // jadi detak dari server kita pakai sebagai patokan.
  const armWatchdog = () => {
    if (watchdog) clearTimeout(watchdog);
    watchdog = setTimeout(() => {
      if (closed) return;
      console.warn("[sse] tidak ada event, koneksi dianggap macet");
      close();
      onStatusChange?.("error");
      onError?.("watchdog-timeout");
    }, WATCHDOG_MS);
  };

  source.addEventListener("open", () => {
    if (closed) return;
    onStatusChange?.("connecting");
    armWatchdog();
  });

  source.addEventListener("ticket", (event) => {
    if (closed) return;
    armWatchdog();
    everLive = true;
    errorCount = 0;
    onStatusChange?.("live");
    try {
      onTicket?.(JSON.parse(event.data));
    } catch (e) {
      console.warn("[sse] payload tidak bisa dibaca:", e.message);
    }
  });

  source.addEventListener("ping", () => {
    if (closed) return;
    armWatchdog();
  });

  source.addEventListener("gone", () => {
    if (closed) return;
    close();
    onGone?.();
  });

  // EventSource menyambung ulang sendiri setelah error; selama itu halaman kembali
  // memakai polling (lihat QueueGuestPage), jadi user tetap dapat update.
  source.addEventListener("error", () => {
    if (closed) return;
    errorCount += 1;
    onStatusChange?.("error");
    onError?.("stream-error");
    if (!everLive && errorCount >= MAX_ERRORS_BEFORE_GIVING_UP) {
      console.warn("[sse] stream tidak bisa dipakai, pakai polling saja");
      close();
    }
  });

  armWatchdog();

  return { close, isClosed: () => closed };
}
