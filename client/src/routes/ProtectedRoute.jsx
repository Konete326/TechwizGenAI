import { Navigate, Outlet } from "react-router-dom";
import { isTokenValid, clearAuth } from "@/utils/auth";

export function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  if (!token || !isTokenValid(token)) {
    clearAuth();
    return <Navigate to="/login" replace />;
  }
  return children ? children : <Outlet />;
}

export default ProtectedRoute;
