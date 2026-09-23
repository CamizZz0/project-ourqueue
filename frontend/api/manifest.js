// Manifest per-peserta.
//
// Chrome/Edge (Android & desktop) memakai `start_url` dari manifest saat memasang
// web app, jadi tanpa ini ikon "Tambah ke Layar Utama" membuka halaman depan,
// bukan halaman tiket peserta. iOS tidak membaca `start_url` (Safari memakai URL
// halaman saat dipasang), jadi manifest ini netral di sana.
//
// Dipanggil sebagai: /api/manifest?start=/q/<qrToken>?t=<participantToken>
// Token peserta ikut di start_url karena app yang dipasang punya storage sendiri —
// tanpa token itu, ikon di Home Screen membuka form pendaftaran (nomor baru).

const MAX_START_URL_LENGTH = 200;

function firstParam(value) {
  return Array.isArray(value) ? value[0] : value;
}

// Hanya izinkan path internal ("/..."): tolak "https://...", "//host", backslash,
// karakter kontrol, atau karakter aneh lain supaya tidak jadi open redirect.
// eslint-disable-next-line no-control-regex
const UNSAFE_PATH_CHARS = /[:\\\s\u0000-\u001f\u007f]/;

function safeStartUrl(raw) {
  const value = firstParam(raw);
  if (typeof value !== "string" || value === "") return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  if (UNSAFE_PATH_CHARS.test(value)) return "/";
  return value.slice(0, MAX_START_URL_LENGTH);
}

export default function handler(req, res) {
  const url = new URL(req.url || "/", `https://${req.headers?.host || "localhost"}`);

  const manifest = {
    name: "OurQueue",
    short_name: "OurQueue",
    description: "Antrean digital yang tinggal di-scan.",
    start_url: safeStartUrl(url.searchParams.get("start")),
    scope: "/",
    display: "standalone",
    background_color: "#fdfbf6",
    theme_color: "#ffbe00",
    icons: [
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };

  res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
  // Jangan di-cache lama: manifest ini bisa berubah kalau token antreannya berubah.
  res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
  res.status(200).send(JSON.stringify(manifest, null, 2));
}
