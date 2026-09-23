import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Users, Layers, ShieldCheck } from "lucide-react";

const NAV_ITEMS = [
  { to: "/superadmin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/superadmin/admins", label: "Admins", icon: Users },
  { to: "/superadmin/queues", label: "Queues", icon: Layers },
];

export default function SuperadminLayout() {
  return (
    <div className="flex flex-1">
      <aside className="w-60 bg-white border-r border-mist sticky top-[65px] h-[calc(100vh-65px)] hidden md:flex flex-col shrink-0">
        <div className="px-5 py-4 border-b border-mist bg-ink text-white flex items-center gap-2">
          <ShieldCheck size={18} />
          <span className="font-bold text-sm">Superadmin</span>
        </div>
        <nav className="p-3 flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-accent-light text-ink"
                    : "text-ink-soft hover:bg-mist hover:text-ink"
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex-1 bg-paper pb-16 md:pb-0 min-w-0">
        <Outlet />
      </div>

      {/* Bottom nav HP - samakan admin biasa: simpel, thumb-friendly */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 flex md:hidden bg-white border-t border-mist px-2 py-1.5 justify-around">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isActive ? "text-ink bg-accent-light" : "text-ink-soft"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}