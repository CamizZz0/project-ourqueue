import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/common/Navbar";
import ProtectedRoute from "./components/common/ProtectedRoute";
import RequireRole from "./components/common/RequireRole";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import QueueGuestPage from "./pages/public/QueueGuestPage";
import NotFoundPage from "./pages/NotFoundPage";
import SuperadminLayout from "./layouts/SuperadminLayout";
import StatsPage from "./pages/superadmin/StatsPage";
import AdminsPage from "./pages/superadmin/AdminsPage";
import QueuesPage from "./pages/superadmin/QueuesPage";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-paper text-ink font-sans selection:bg-accent selection:text-white">
        <Navbar />
        <main className="flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/superadmin"
              element={
                <RequireRole role="superadmin">
                  <SuperadminLayout />
                </RequireRole>
              }
            >
              <Route index element={<StatsPage />} />
              <Route path="admins" element={<AdminsPage />} />
              <Route path="queues" element={<QueuesPage />} />
            </Route>
            <Route path="/q/:qrToken" element={<QueueGuestPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <footer className="border-t border-mist py-6 text-center text-xs text-ink-soft bg-white">
          <p>© {new Date().getFullYear()} OurQueue Digital Queue System. All rights reserved.</p>
        </footer>
      </div>
    </BrowserRouter>
  );
}