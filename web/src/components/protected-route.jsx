import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "@/lib/auth-context";

const webPortalRoles = ["Backoffice", "GridOperator"];

export function ProtectedRoute({ roles }) {
  const { session, signOut } = useAuth();
  const location = useLocation();
  const hasWebPortalRole = session && webPortalRoles.includes(session.role);

  useEffect(() => {
    if (session && !hasWebPortalRole) {
      signOut();
    }
  }, [hasWebPortalRole, session, signOut]);

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!hasWebPortalRole) {
    return null;
  }

  if (roles && !roles.includes(session.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
