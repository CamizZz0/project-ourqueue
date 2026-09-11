import React from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Home } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="inline-flex p-4 rounded-full bg-rose-50 text-rose-600">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
          404 - Halaman Tidak Ditemukan
        </h1>
        <p className="text-sm text-slate-500 leading-relaxed">
          Halaman atau tautan antrean yang Anda tuju tidak ditemukan atau sudah ditutup.
        </p>
        <div className="pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md shadow-indigo-200 transition-all"
          >
            <Home className="w-4 h-4" />
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}

