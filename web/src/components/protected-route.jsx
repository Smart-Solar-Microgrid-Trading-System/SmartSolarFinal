import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "@/lib/auth-context";

export function ProtectedRoute({ roles }) {
  const { session } = useAuth();
  const location = useLocation();

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(session.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
