import React from "react";
import { useParams } from "react-router-dom";

export default function QueueGuestPage() {
  const { qrToken } = useParams();

  return (
    <div className="p-8 max-w-md mx-auto text-center">
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Halaman Peserta Antrean</h1>
      <p className="text-slate-600 mb-4">
        Halaman publik untuk pengunjung yang melakukan scan QR code.
      </p>
      <div className="p-6 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500">
        Token Antrean: <strong className="text-slate-800">{qrToken || "-"}</strong>
        <p className="mt-2">[Form ambil tiket dan live nomor panggilan akan dibuat di tahap peserta]</p>
      </div>
    </div>
  );
}
