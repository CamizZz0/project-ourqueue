import React from "react";
import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="p-8 max-w-xl mx-auto text-center space-y-4">
      <h1 className="text-3xl font-bold text-slate-800">OurQueue Front-End</h1>
      <p className="text-slate-600 text-sm">
        Setup awal routing dan koneksi dasar selesai. Pilih halaman di bawah untuk memeriksa rute:
      </p>
      <div className="flex flex-wrap justify-center gap-3 pt-2 text-sm">
        <Link to="/login" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
          Ke Login
        </Link>
        <Link to="/dashboard" className="px-4 py-2 bg-slate-200 text-slate-800 rounded hover:bg-slate-300">
          Ke Dashboard
        </Link>
        <Link to="/q/demo-123" className="px-4 py-2 bg-slate-200 text-slate-800 rounded hover:bg-slate-300">
          Ke Halaman Peserta
        </Link>
      </div>
    </div>
  );
}
