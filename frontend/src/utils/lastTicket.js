// Jadi tiket terakhir yang dibuka di perangkat ini.
// Dipakai halaman depan ("/") untuk mengarahkan peserta ke tiketnya sendiri — perlu
// karena app yang dipasang ke Home Screen di Android memakai start_url "/" dan
// membuka halaman depan, bukan halaman tiket.

const LAST_TICKET_KEY = "ourqueue_last_ticket";
const AUTH_TOKEN_KEY = "token";

function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function rememberLastTicket(path) {
  try {
    localStorage.setItem(LAST_TICKET_KEY, path);
  } catch {}
}

export function forgetLastTicket() {
  try {
    localStorage.removeItem(LAST_TICKET_KEY);
  } catch {}
}

export function getLastTicket() {
  return safeGet(LAST_TICKET_KEY);
}

// Admin yang sudah login jangan pernah dialihkan ke halaman peserta.
export function hasAdminSession() {
  return !!safeGet(AUTH_TOKEN_KEY);
}
