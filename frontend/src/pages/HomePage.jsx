import React from "react";
import { Link } from "react-router-dom";
import { QrCode, ListOrdered, Users2, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div>
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-16 pb-14 text-center">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-accent bg-accent-light px-3 py-1.5 rounded-full mb-6">
          <QrCode size={14} />
          Antrean tanpa aplikasi, tanpa akun untuk peserta
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-ink leading-tight tracking-tight">
          Antrean digital yang
          <br />
          tinggal di-scan.
        </h1>
        <p className="text-ink-soft mt-5 max-w-lg mx-auto text-base leading-relaxed">
          Buat antrean untuk bisnis, layanan, atau acara kamu. Peserta cukup scan QR Code
          dan langsung dapat nomor — tanpa perlu daftar akun.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <Link
            to="/register"
            className="flex items-center gap-2 rounded-xl bg-accent text-white font-semibold px-6 py-3 hover:bg-accent-dark transition-colors"
          >
            Buat antrean pertamamu
            <ArrowRight size={17} />
          </Link>
          <Link
            to="/login"
            className="flex items-center gap-2 rounded-xl border border-mist-dark text-ink font-semibold px-6 py-3 hover:border-accent hover:text-accent transition-colors"
          >
            Masuk
          </Link>
        </div>
      </section>

      <section className="max-w-sm mx-auto px-4 pb-16">
        <div className="rounded-2xl border border-mist bg-white shadow-sm overflow-hidden">
          <div className="bg-accent-light px-6 py-8 text-center">
            <p className="text-sm font-semibold text-accent mb-1">Loket Pendaftaran</p>
            <p className="ticket-number text-6xl font-bold text-ink">#014</p>
          </div>
          <div className="px-6 py-4 text-center border-t border-mist text-sm text-ink-soft">
            3 orang di depan kamu
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-20 grid sm:grid-cols-3 gap-5">
        {[
          {
            icon: ListOrdered,
            title: "Banyak antrean, satu akun",
            desc: "Kelola beberapa antrean sekaligus untuk kebutuhan yang berbeda-beda.",
          },
          {
            icon: QrCode,
            title: "Cukup scan, tanpa akun",
            desc: "Peserta langsung dapat nomor dengan scan QR Code, tanpa proses registrasi.",
          },
          {
            icon: Users2,
            title: "Pantau langsung dari dashboard",
            desc: "Panggil peserta berikutnya dan lihat status antrean yang diperbarui otomatis.",
          },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-2xl border border-mist p-5 bg-white">
            <span className="w-10 h-10 rounded-xl bg-accent-light text-accent flex items-center justify-center mb-3">
              <Icon size={18} />
            </span>
            <h3 className="font-bold text-ink mb-1">{title}</h3>
            <p className="text-sm text-ink-soft leading-relaxed">{desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}