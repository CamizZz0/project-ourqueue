import React, { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import api from "../../utils/api";

const STATUS_BADGE = {
  active: "bg-accent-light text-ink",
  paused: "bg-mist text-ink-soft",
  closed: "bg-mist text-ink-soft",
};

const STATUS_LABEL_ID = {
  active: "Aktif",
  paused: "Dijeda",
  closed: "Ditutup",
};

export default function AdminDetailDrawer({ adminId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    api
      .get(`/superadmin/admins/${adminId}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message || "Gagal memuat detail admin."))
      .finally(() => setLoading(false));
  }, [adminId]);

  const admin = data?.admin;
  const queues = data?.queues || [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/40 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-white h-full overflow-y-auto rounded-l-2xl shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-mist sticky top-0 bg-white z-10">
          <h2 className="font-bold text-ink text-lg">Detail Admin</h2>
          <button onClick={onClose} className="text-ink-soft hover:text-ink">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="p-10 flex justify-center">
            <Loader2 className="animate-spin text-accent" size={26} />
          </div>
        ) : error ? (
          <div className="p-6">
            <div className="rounded-lg bg-ink/10 border border-ink/30 text-ink text-sm px-3 py-2">{error}</div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="bg-mist/40 rounded-2xl p-5">
              <p className="font-bold text-ink text-lg">{admin?.nama}</p>
              <p className="text-sm text-ink-soft">{admin?.email}</p>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-ink text-white capitalize">
                  {admin?.role}
                </span>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    admin?.is_active ? "bg-accent-light text-ink" : "bg-mist text-ink-soft"
                  }`}
                >
                  {admin?.is_active ? "Aktif" : "Nonaktif"}
                </span>
              </div>
              <p className="text-xs text-ink-soft mt-3">
                Terdaftar:{" "}
                {admin?.created_at &&
                  new Date(admin.created_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-ink-soft mb-2">
                Antrean dimiliki ({data?.queue_count ?? queues.length})
              </p>
              <div className="space-y-2">
                {queues.length === 0 && (
                  <p className="text-sm text-ink-soft py-6 text-center">Belum punya antrean.</p>
                )}
                {queues.map((q) => (
                  <div key={q.id} className="flex items-center justify-between rounded-lg border border-mist px-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-ink">{q.nama_antrean}</p>
                      <p className="text-xs text-ink-soft">{q.total_tickets ?? 0} tiket total</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_BADGE[q.status] || "bg-mist text-ink-soft"}`}>
                      {STATUS_LABEL_ID[q.status] || q.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}