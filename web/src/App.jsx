import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "@/components/app-shell";
import { PlaceholderPage } from "@/components/placeholder-page";
import { ProtectedRoute } from "@/components/protected-route";
import { LoginPage } from "@/pages/login-page";
import { MicrogridNodesPage } from "@/pages/microgrid-nodes-page";
import { ProsumerManagementPage } from "@/pages/prosumer-management-page";
import { UserManagementPage } from "@/pages/user-management-page";
import { NodeCreatePage } from "@/pages/NodeCreatePage";
import { NodeEditPage } from "@/pages/NodeEditPage";
import { NodeDetailsPage } from "@/pages/NodeDetails";
import { NodeMapPage } from "@/pages/NodeMap";

export default function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<PlaceholderPage title="Overview" />} />
          <Route element={<ProtectedRoute roles={["Backoffice"]} />}>
                      <Route path="users" element={<UserManagementPage />} />
                      <Route path="/nodes" element={<MicrogridNodesPage />} />

                      <Route path="/nodes/new" element={<NodeCreatePage />} />

                      <Route path="/nodes/map" element={<NodeMapPage />} />

                      <Route path="/nodes/:id/edit" element={<NodeEditPage />} />

                      <Route path="/nodes/:id" element={<NodeDetailsPage />} />
            <Route path="prosumers" element={<ProsumerManagementPage />} />
          </Route>
          <Route path="nodes" element={<MicrogridNodesPage />} />
          <Route path="reservations" element={<PlaceholderPage title="Energy Reservations" />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
