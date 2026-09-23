const DEFAULT_MANIFEST_HREF = "/manifest.json";

function applyManifestHref(href) {
  if (typeof document === "undefined") return;
  let link = document.querySelector('link[rel="manifest"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "manifest";
    document.head.appendChild(link);
  }
  if (link.getAttribute("href") !== href) link.setAttribute("href", href);
}

// Pakai manifest yang dibuat khusus untuk halaman peserta (lihat api/manifest.js),
// supaya ikon "Tambah ke Layar Utama" membuka halaman tiket, bukan halaman depan.
export function setParticipantManifest(startPath) {
  applyManifestHref(`/api/manifest?start=${encodeURIComponent(startPath)}`);
}

export function resetManifest() {
  applyManifestHref(DEFAULT_MANIFEST_HREF);
}
