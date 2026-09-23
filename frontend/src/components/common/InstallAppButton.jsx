import React, { useEffect, useState } from "react";
import { Download } from "lucide-react";

// Tombol "Pasang aplikasi antrean" untuk peserta.
//
// Penting: app yang dipasang merekam start_url pada saat pemasangan. Kalau peserta
// memasang dari halaman depan, ikonnya akan membuka halaman depan (bukan tiketnya),
// dan storage app Home Screen itu terpisah — jadi tiketnya tidak ikut terbawa.
// Karena itu pemasangannya harus terjadi di halaman tiket, dan tombol ini yang
// membuatnya satu-dua langkah saja.

function isStandalone() {
  if (typeof window === "undefined") return false;
  try {
    return (
      window.navigator.standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches
    );
  } catch {
    return false;
  }
}

function isIosSafari() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) || (ua.includes("Macintosh") && "ontouchend" in document);
  return ios && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
}

export default function InstallAppButton() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [showIosHint, setShowIosHint] = useState(false);
  const iosSafari = isIosSafari();

  useEffect(() => {
    const onPrompt = (event) => {
      // Tahan dulu prompt bawaan Chrome, kita tampilkan lewat tombol sendiri.
      event.preventDefault();
      setPromptEvent(event);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;
  // Di browser yang tidak mendukung install (mis. Safari desktop, webview in-app)
  // tombol ini tidak ada gunanya.
  if (!promptEvent && !iosSafari) return null;

  const handleClick = async () => {
    if (promptEvent) {
      promptEvent.prompt();
      try {
        await promptEvent.userChoice;
      } catch {}
      setPromptEvent(null);
      return;
    }
    setShowIosHint((visible) => !visible);
  };

  return (
    <div className="mt-3 rounded-xl border border-mist bg-white p-3 text-center">
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 rounded-lg border border-mist-dark text-ink text-xs font-semibold px-3 py-1.5 hover:bg-mist transition-colors"
      >
        <Download size={13} />
        Pasang aplikasi antrean
      </button>
      {showIosHint && (
        <p className="text-xs text-ink-soft mt-2 leading-relaxed">
          Ketuk tombol <span className="font-semibold text-ink">Share</span> di Safari, lalu pilih{" "}
          <span className="font-semibold text-ink">Tambah ke Layar Utama</span>. Setelah dipasang,
          notifikasi tetap masuk walau app-nya ditutup.
        </p>
      )}
    </div>
  );
}
