import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, checkingAuth } = useAuth();

  if (checkingAuth) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}