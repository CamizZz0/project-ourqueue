import React from "react";
import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
      <Link to="/" className="text-xl font-bold text-indigo-600">
        OurQueue
      </Link>
      <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
        <Link to="/dashboard" className="hover:text-indigo-600">
          Dashboard
        </Link>
        <Link to="/q/demo-123" className="hover:text-indigo-600">
          Demo Peserta
        </Link>
        <Link to="/login" className="hover:text-indigo-600">
          Login
        </Link>
        <Link to="/register" className="hover:text-indigo-600">
          Register
        </Link>
      </nav>
    </header>
  );
}
