import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "@/components/app-shell";
import { PlaceholderPage } from "@/components/placeholder-page";
import { ProtectedRoute } from "@/components/protected-route";
import { LoginPage } from "@/pages/login-page";
import { MicrogridNodesPage } from "@/pages/microgrid-nodes-page";
import { ProsumerManagementPage } from "@/pages/prosumer-management-page";
import { ReservationDetailsPage } from "@/pages/reservation-details-page";
import { ReservationManagementPage } from "@/pages/reservation-management-page";
import { UserManagementPage } from "@/pages/user-management-page";

export default function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<PlaceholderPage title="Overview" />} />
          <Route element={<ProtectedRoute roles={["Backoffice"]} />}>
            <Route path="users" element={<UserManagementPage />} />
            <Route path="prosumers" element={<ProsumerManagementPage />} />
          </Route>
          <Route path="nodes" element={<MicrogridNodesPage />} />
          <Route element={<ProtectedRoute roles={["Prosumer"]} />}>
            <Route path="reservations" element={<ReservationManagementPage />} />
            <Route path="reservations/:reservationId" element={<ReservationDetailsPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
