import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function RequireRole({ role, children }) {
  const { isAuthenticated, user, checkingAuth } = useAuth();

  if (checkingAuth) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== role) return <Navigate to="/dashboard" replace />;
  return children;
}