import { Navigate, Outlet } from "react-router-dom";

export function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children ? children : <Outlet />;
}

export default ProtectedRoute;
