import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/common/Navbar";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import QueueGuestPage from "./pages/public/QueueGuestPage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-indigo-500 selection:text-white">
        {/* Navigation Bar Global */}
        <Navbar />

        {/* Konten Halaman Dinamis Berdasarkan Route */}
        <main className="flex-1">
          <Routes>
            {/* Rute Utama / Landing */}
            <Route path="/" element={<HomePage />} />

            {/* Rute Autentikasi */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Rute Dashboard Admin */}
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Rute Halaman Publik Peserta / Scan QR */}
            <Route path="/q/:qrToken" element={<QueueGuestPage />} />

            {/* 404 Catch All */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>

        {/* Simple Footer */}
        <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500 bg-white">
          <p>© {new Date().getFullYear()} OurQueue Digital Queue System. All rights reserved.</p>
        </footer>
      </div>
    </BrowserRouter>
  );
}
