import React, { useEffect, useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { Plus, Users, QrCode, Loader2, Inbox, Trash2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import CreateQueueModal from "../../components/dashboard/CreateQueueModal";
import QueueDetailPanel from "../../components/dashboard/QueueDetailPanel";

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

export default function DashboardPage() {
  const { isAuthenticated } = useAuth();
  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [activeQueueId, setActiveQueueId] = useState(null);

  const fetchQueues = useCallback(async () => {
    try {
      const res = await api.get("/queues");
      setQueues(res.data.queues);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchQueues();
  }, [isAuthenticated, fetchQueues]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleCreated = (newQueue) => {
    setShowCreate(false);
    setQueues((prev) => [{ ...newQueue, waiting_count: 0, total_count: 0 }, ...prev]);
  };

  const handleDelete = async (e, queueId) => {
    e.stopPropagation();
    if (!confirm("Hapus antrean ini? Semua data peserta akan ikut terhapus.")) return;
    try {
      await api.delete(`/queues/${queueId}`);
      setQueues((prev) => prev.filter((q) => q.id !== queueId));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Antrean kamu</h1>
          <p className="text-sm text-ink-soft mt-1">Kelola semua antrean dari satu tempat.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-accent text-white font-semibold px-4 py-2.5 hover:bg-accent-dark transition-colors"
        >
          <Plus size={18} />
          Antrean baru
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-accent" size={28} />
        </div>
      ) : queues.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-mist-dark">
          <span className="w-14 h-14 rounded-2xl bg-accent-light text-accent flex items-center justify-center mb-4">
            <Inbox size={24} />
          </span>
          <h3 className="font-bold text-ink mb-1">Belum ada antrean</h3>
          <p className="text-sm text-ink-soft mb-5 max-w-xs">
            Buat antrean pertama kamu, lalu bagikan QR Code-nya ke peserta.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-lg bg-accent text-white font-semibold px-4 py-2.5 hover:bg-accent-dark transition-colors"
          >
            <Plus size={18} />
            Buat antrean
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {queues.map((q) => (
            <button
              key={q.id}
              onClick={() => setActiveQueueId(q.id)}
              className="text-left bg-white rounded-2xl border border-mist p-5 hover:border-accent hover:shadow-md transition-all group relative"
            >
              <div className="flex items-start justify-between mb-3">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_BADGE[q.status]}`}>
                  {STATUS_LABEL_ID[q.status]}
                </span>
                <button
                  onClick={(e) => handleDelete(e, q.id)}
                  className="text-ink-soft/50 hover:text-ink opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Hapus antrean"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <h3 className="font-bold text-ink mb-1 line-clamp-1">{q.nama_antrean}</h3>
              {q.deskripsi && <p className="text-sm text-ink-soft mb-4 line-clamp-2">{q.deskripsi}</p>}

              <div className="flex items-center gap-4 text-sm text-ink-soft pt-3 border-t border-mist">
                <span className="flex items-center gap-1.5">
                  <Users size={14} />
                  {q.waiting_count} menunggu
                </span>
                <span className="flex items-center gap-1.5">
                  <QrCode size={14} />
                  {q.total_count} total
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {showCreate && <CreateQueueModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
      {activeQueueId && (
        <QueueDetailPanel
          queueId={activeQueueId}
          onClose={() => setActiveQueueId(null)}
          onQueueChanged={fetchQueues}
        />
      )}
    </div>
  );
}