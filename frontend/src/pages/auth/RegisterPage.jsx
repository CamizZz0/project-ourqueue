import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ListOrdered, UserPlus, Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import PasswordInput from "../../components/common/PasswordInput";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nama: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }

    setLoading(true);
    try {
      await register(form.nama, form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Gagal mendaftar. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <span className="w-12 h-12 rounded-2xl bg-accent text-white flex items-center justify-center mb-4">
            <ListOrdered size={24} strokeWidth={2.5} />
          </span>
          <h1 className="text-2xl font-extrabold text-ink">Buat akun OurQueue</h1>
          <p className="text-sm text-ink-soft mt-1 text-center">
            Satu akun, banyak antrean, tanpa ribet.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-mist p-6 space-y-4 shadow-sm">
          {error && (
            <div className="rounded-lg bg-ink/10 border border-ink/30 text-ink text-sm px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5">Nama</label>
            <input
              type="text"
              name="nama"
              required
              value={form.nama}
              onChange={handleChange}
              placeholder="Nama lengkap kamu"
              className="w-full rounded-lg border border-mist-dark px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5">Email</label>
            <input
              type="email"
              name="email"
              required
              value={form.email}
              onChange={handleChange}
              placeholder="nama@email.com"
              className="w-full rounded-lg border border-mist-dark px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5">Password</label>
            <PasswordInput
              name="password"
              required
              value={form.password}
              onChange={handleChange}
              placeholder="Minimal 6 karakter"
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent text-white font-semibold py-2.5 hover:bg-accent-dark transition-colors disabled:opacity-60"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
            {loading ? "Memproses..." : "Daftar"}
          </button>
        </form>

        <p className="text-center text-sm text-ink-soft mt-6">
          Sudah punya akun?{" "}
          <Link to="/login" className="text-accent font-semibold hover:underline">
            Masuk di sini
          </Link>
        </p>
      </div>
    </div>
  );
}