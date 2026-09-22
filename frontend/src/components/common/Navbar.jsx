import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ListOrdered, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function Navbar() {
  const { user, logout, isAuthenticated, isSuperadmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="bg-white/80 backdrop-blur border-b border-mist px-6 py-4 flex items-center justify-between sticky top-0 z-30">
      <Link to="/" className="flex items-center gap-2 text-lg font-extrabold text-ink">
        <span className="w-8 h-8 rounded-lg bg-accent text-white flex items-center justify-center">
          <ListOrdered size={18} strokeWidth={2.5} />
        </span>
        OurQueue
      </Link>

      <nav className="flex items-center gap-6 text-sm font-medium text-ink-soft">
        {isAuthenticated ? (
          <>
            {!isSuperadmin && (
              <Link to="/dashboard" className="hover:text-accent transition-colors">
                Dashboard
              </Link>
            )}
            {isSuperadmin && (
              <Link
                to="/superadmin"
                className="flex items-center gap-1.5 text-sm font-semibold text-ink hover:text-accent transition-colors"
              >
                <ShieldCheck size={16} />
                Superadmin
              </Link>
            )}
            <span className="hidden sm:inline items-center gap-2 text-ink-soft/70">
              Hai, {user?.nama?.split(" ")[0]}
              {user?.role && (
                <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-ink text-white capitalize">
                  {user.role}
                </span>
              )}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-mist-dark px-3 py-1.5 text-ink hover:border-ink hover:text-ink transition-colors"
            >
              <LogOut size={15} />
              Keluar
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="hover:text-accent transition-colors">
              Login
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-accent px-4 py-2 text-white font-semibold hover:bg-accent-dark transition-colors"
            >
              Daftar
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}