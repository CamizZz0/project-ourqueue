import React from "react";
import { Link } from "react-router-dom";

export default function LoginPage() {
  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Halaman Login</h1>
      <p className="text-slate-600 mb-4">Placeholder form login petugas/admin antrean.</p>
      <div className="p-4 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500">
        [Form Login akan dikembangkan di tahap autentikasi]
      </div>
      <div className="mt-4 text-sm">
        Belum punya akun?{" "}
        <Link to="/register" className="text-indigo-600 underline">
          Daftar di sini
        </Link>
      </div>
    </div>
  );
}
