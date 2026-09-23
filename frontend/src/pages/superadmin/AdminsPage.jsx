import React, { useEffect, useState, useCallback, useRef } from "react";
import { Search, Eye, Power, Trash2, Loader2 } from "lucide-react";
import api from "../../utils/api";
import Pagination from "../../components/superadmin/Pagination";
import AdminDetailDrawer from "../../components/superadmin/AdminDetailDrawer";
import ConfirmModal from "../../components/common/ConfirmModal";

export default function AdminsPage() {
  const [admins, setAdmins] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [detailId, setDetailId] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'toggle' | 'delete', admin }
  const [actionLoading, setActionLoading] = useState(false);

  const debounceRef = useRef(null);

  const fetchAdmins = useCallback(async (targetPage, targetSearch) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/superadmin/admins", {
        params: { page: targetPage, limit: 10, search: targetSearch || undefined },
      });
      setAdmins(res.data.admins);
      setMeta(res.data.meta);
    } catch (err) {
      setError(err.message || "Gagal memuat daftar admin.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins(page, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearchChange = (value) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchAdmins(1, value);
    }, 300);
  };

  const handleToggleStatus = async () => {
    const admin = confirmAction.admin;
    setActionLoading(true);
    try {
      await api.patch(`/superadmin/admins/${admin.id}/status`, { is_active: !admin.is_active });
      setConfirmAction(null);
      fetchAdmins(page, search);
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    const admin = confirmAction.admin;
    setActionLoading(true);
    try {
      await api.delete(`/superadmin/admins/${admin.id}`);
      setConfirmAction(null);
      fetchAdmins(page, search);
    } catch (err) {
      alert(err.message);
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-ink">Admin</h1>
          <p className="text-sm text-ink-soft mt-1">Kelola seluruh akun admin yang terdaftar.</p>
        </div>
        <div className="relative w-full sm:w-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Cari nama atau email..."
            className="text-sm rounded-lg border border-mist-dark pl-8 pr-3.5 py-2.5 outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent w-full sm:w-64"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-ink/10 border border-ink/30 text-ink text-sm px-3 py-2 mb-4">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-accent" size={26} />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-mist overflow-hidden overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="bg-mist/50 text-left text-xs uppercase text-ink-soft">
                  <th className="px-4 py-3 font-semibold">Nama</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Antrean</th>
                  <th className="px-4 py-3 font-semibold">Terdaftar</th>
                  <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {admins.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-ink-soft">
                      Tidak ada admin ditemukan.
                    </td>
                  </tr>
                )}
                {admins.map((a) => (
                  <tr key={a.id} className="border-t border-mist hover:bg-paper">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{a.nama}</p>
                      <p className="text-xs text-ink-soft">{a.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-ink text-white capitalize">
                        {a.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${
                          a.is_active ? "bg-accent-light text-ink" : "bg-mist text-ink-soft"
                        }`}
                      >
                        {a.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{a.queue_count ?? 0}</td>
                    <td className="px-4 py-3 text-ink-soft">
                      {new Date(a.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          title="Lihat detail"
                          onClick={() => setDetailId(a.id)}
                          className="text-ink-soft hover:text-ink hover:bg-mist rounded-md p-1.5"
                        >
                          <Eye size={15} />
                        </button>
                        {a.role !== "superadmin" && (
                          <>
                            <button
                              title={a.is_active ? "Nonaktifkan" : "Aktifkan"}
                              onClick={() => setConfirmAction({ type: "toggle", admin: a })}
                              className="text-ink-soft hover:text-ink hover:bg-mist rounded-md p-1.5"
                            >
                              <Power size={15} />
                            </button>
                            <button
                              title="Hapus"
                              onClick={() => setConfirmAction({ type: "delete", admin: a })}
                              className="text-ink-soft hover:text-ink hover:bg-mist rounded-md p-1.5"
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination meta={meta} onPageChange={setPage} itemLabel="admin" />
        </>
      )}

      {detailId && <AdminDetailDrawer adminId={detailId} onClose={() => setDetailId(null)} />}

      {confirmAction?.type === "toggle" && (
        <ConfirmModal
          title={confirmAction.admin.is_active ? "Nonaktifkan akun ini?" : "Aktifkan akun ini?"}
          description={`${confirmAction.admin.nama} (${confirmAction.admin.email})${
            confirmAction.admin.is_active ? " tidak akan bisa login setelah dinonaktifkan." : " akan bisa login kembali."
          }`}
          confirmLabel={confirmAction.admin.is_active ? "Nonaktifkan" : "Aktifkan"}
          loading={actionLoading}
          onConfirm={handleToggleStatus}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {confirmAction?.type === "delete" && (
        <ConfirmModal
          title="Hapus akun admin ini?"
          description={`${confirmAction.admin.nama} akan dihapus permanen. Aksi ini gagal jika admin masih memiliki antrean aktif.`}
          confirmLabel="Hapus"
          danger
          loading={actionLoading}
          onConfirm={handleDelete}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}