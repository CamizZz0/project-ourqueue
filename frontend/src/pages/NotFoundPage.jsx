import React from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Home } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="inline-flex p-4 rounded-full bg-ink/10 text-ink">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-extrabold text-ink tracking-tight">
          404 - Halaman Tidak Ditemukan
        </h1>
        <p className="text-sm text-ink-soft leading-relaxed">
          Halaman atau tautan antrean yang Anda tuju tidak ditemukan atau sudah ditutup.
        </p>
        <div className="pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-dark text-white text-sm font-semibold shadow-md shadow-accent/20 transition-all"
          >
            <Home className="w-4 h-4" />
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}