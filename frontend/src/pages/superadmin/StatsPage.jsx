import React, { useEffect, useState } from "react";
import { Users, Layers, Activity, Ticket, Loader2 } from "lucide-react";
import api from "../../utils/api";

const STAT_CARDS = [
  { key: "total_admin", label: "Total Admin", icon: Users },
  { key: "total_queues", label: "Total Antrean", icon: Layers },
  { key: "active_queues", label: "Antrean Aktif", icon: Activity },
  { key: "total_tickets", label: "Total Tiket", icon: Ticket },
];

export default function StatsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/superadmin/stats")
      .then((res) => setStats(res.data))
      .catch((err) => setError(err.message || "Gagal memuat statistik."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-ink">Dashboard Superadmin</h1>
        <p className="text-sm text-ink-soft mt-1">Ringkasan seluruh aktivitas platform OurQueue.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-accent" size={26} />
        </div>
      ) : error ? (
        <div className="rounded-lg bg-ink/10 border border-ink/30 text-ink text-sm px-3 py-2">{error}</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STAT_CARDS.map(({ key, label, icon: Icon }) => (
            <div
              key={key}
              className="bg-white rounded-2xl border border-mist p-5 hover:border-accent hover:shadow-md transition-all"
            >
              <span className="w-10 h-10 rounded-xl bg-accent-light text-accent flex items-center justify-center mb-3">
                <Icon size={18} />
              </span>
              <p className="text-xs font-semibold uppercase text-ink-soft mb-1">{label}</p>
              <p className="ticket-number text-3xl font-extrabold text-ink">{stats?.[key] ?? 0}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}