import React from "react";
import { Link } from "react-router-dom";

export default function RegisterPage() {
  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Halaman Register</h1>
      <p className="text-slate-600 mb-4">Placeholder form pendaftaran akun baru.</p>
      <div className="p-4 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500">
        [Form Register akan dikembangkan di tahap autentikasi]
      </div>
      <div className="mt-4 text-sm">
        Sudah punya akun?{" "}
        <Link to="/login" className="text-indigo-600 underline">
          Masuk di sini
        </Link>
      </div>
    </div>
  );
}
