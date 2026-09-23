import React, { useEffect, useState, useCallback, useRef } from "react";
import { Search, Inbox, Loader2 } from "lucide-react";
import api from "../../utils/api";
import Pagination from "../../components/superadmin/Pagination";

const STATUS_FILTERS = [
  { value: "", label: "Semua" },
  { value: "active", label: "Aktif" },
  { value: "paused", label: "Dijeda" },
  { value: "closed", label: "Ditutup" },
];

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

export default function QueuesPage() {
  const [queuesList, setQueuesList] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const debounceRef = useRef(null);

  const fetchQueues = useCallback(async (targetPage, targetSearch, targetStatus) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/superadmin/queues", {
        params: {
          page: targetPage,
          limit: 10,
          search: targetSearch || undefined,
          status: targetStatus || undefined,
        },
      });
      setQueuesList(res.data.queues);
      setMeta(res.data.meta);
    } catch (err) {
      setError(err.message || "Gagal memuat daftar antrean.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueues(page, search, status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  const handleSearchChange = (value) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchQueues(1, value, status);
    }, 300);
  };

  const handleStatusChange = (value) => {
    setStatus(value);
    setPage(1);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-ink">Semua Antrean</h1>
          <p className="text-sm text-ink-soft mt-1">Pantau antrean dari seluruh admin di platform.</p>
        </div>
        <div className="relative w-full sm:w-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Cari nama antrean..."
            className="text-sm rounded-lg border border-mist-dark pl-8 pr-3.5 py-2.5 outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent w-full sm:w-64"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => handleStatusChange(f.value)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              status === f.value
                ? "bg-accent text-white border-accent"
                : "bg-white text-ink-soft border-mist-dark hover:border-accent"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg bg-ink/10 border border-ink/30 text-ink text-sm px-3 py-2 mb-4">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-accent" size={26} />
        </div>
      ) : queuesList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-mist-dark">
          <span className="w-14 h-14 rounded-2xl bg-accent-light text-accent flex items-center justify-center mb-4">
            <Inbox size={24} />
          </span>
          <p className="text-ink-soft text-sm">Tidak ada antrean ditemukan.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-mist overflow-hidden overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="bg-mist/50 text-left text-xs uppercase text-ink-soft">
                  <th className="px-4 py-3 font-semibold">Nama Antrean</th>
                  <th className="px-4 py-3 font-semibold">Pemilik</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Total Peserta</th>
                  <th className="px-4 py-3 font-semibold">Dibuat</th>
                </tr>
              </thead>
              <tbody>
                {queuesList.map((q) => (
                  <tr key={q.id} className="border-t border-mist hover:bg-paper">
                    <td className="px-4 py-3 font-medium text-ink">{q.nama_antrean}</td>
                    <td className="px-4 py-3">
                      <p className="text-ink-soft">{q.pemilik_nama}</p>
                      <p className="text-xs text-ink-soft/70">{q.pemilik_email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_BADGE[q.status] || "bg-mist text-ink-soft"}`}>
                        {STATUS_LABEL_ID[q.status] || q.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{q.total_peserta ?? 0}</td>
                    <td className="px-4 py-3 text-ink-soft">
                      {new Date(q.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination meta={meta} onPageChange={setPage} itemLabel="antrean" />
        </>
      )}
    </div>
  );
}