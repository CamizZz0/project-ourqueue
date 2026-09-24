// Validasi payload state tiket dari network SEBELUM dipakai mengupdate UI.
//
// Latar: angka "orang di depan" sempat 1 -> 0 padahal antrean tidak maju.
// Satu sumber yang terbukti bisa menimpa state adalah payload yang tidak valid
// / tidak lengkap / milik tiket lain (cache basi antar-tab, respons tertukar,
// respons error yang lolos sebagai JSON). Penjaga ini menolak semuanya TANPA
// menyentuh state, supaya angka tidak pernah nol hanya karena data rusak.
//
// Penting: penolakan hanya untuk payload RUSAK. Payload VALID dengan angka
// yang turun (transisi antrean asli) tetap diteruskan apa adanya — angka
// tidak dibuat statis.
//
// Mengembalikan true jika payload layak dipakai:
// - objek dengan tiket { participant_token, nomor_antrean, status }
// - participant_token tiket SAMA dengan token yang diminta (anti-tertukar)
// - sisa_antrean_di_depan & estimasi_menit berupa angka finite (menolak
//   string, null, undefined, NaN, Infinity)
export function isValidTicketPayload(data, expectedToken) {
  if (!data || typeof data !== "object") return false;
  const tiket = data.tiket;
  if (!tiket || typeof tiket !== "object") return false;
  if (typeof expectedToken === "string" && expectedToken !== "") {
    if (tiket.participant_token !== expectedToken) return false;
  }
  if (typeof tiket.nomor_antrean !== "number" || !Number.isFinite(tiket.nomor_antrean)) return false;
  if (typeof tiket.status !== "string" || tiket.status === "") return false;
  if (typeof data.sisa_antrean_di_depan !== "number" || !Number.isFinite(data.sisa_antrean_di_depan)) return false;
  if (typeof data.estimasi_menit !== "number" || !Number.isFinite(data.estimasi_menit)) return false;
  return true;
}
