import {
  Navigate,
  Route,
  Routes
} from "react-router-dom";

import { AppShell } from "@/components/app-shell";
import { PlaceholderPage } from "@/components/placeholder-page";
import { ProtectedRoute } from "@/components/protected-route";

import { BookingSlotsPage } from "@/pages/booking-slots-page";
import { CreateReservationPage } from "@/pages/create-reservation-page";
import { EditReservationPage } from "@/pages/edit-reservation-page";
import { LoginPage } from "@/pages/login-page";
import { MicrogridNodesPage } from "@/pages/microgrid-nodes-page";
import { OperationsDashboardPage } from "@/pages/operations-dashboard-page";
import { ProsumerManagementPage } from "@/pages/prosumer-management-page";
import { ReservationsPage } from "@/pages/reservations-page";
import { ReservationDetailsPage } from "@/pages/reservation-details-page";
import { ReservationSummaryPage } from "@/pages/reservation-summary-page";
import { UserManagementPage } from "@/pages/user-management-page";

export default function App() {
  return (
    <Routes>
      <Route
        path="login"
        element={<LoginPage />}
      />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route
            index
            element={<PlaceholderPage title="Overview" />}
          />

          <Route
            element={
              <ProtectedRoute
                roles={["Backoffice"]}
              />
            }
          >
            <Route
              path="users"
              element={<UserManagementPage />}
            />

            <Route
              path="prosumers"
              element={<ProsumerManagementPage />}
            />
          </Route>

          <Route
            path="nodes"
            element={<MicrogridNodesPage />}
          />

          <Route
            element={
              <ProtectedRoute
                roles={[
                  "Backoffice",
                  "GridOperator"
                ]}
              />
            }
          >
            <Route path="booking-slots" element={<BookingSlotsPage />} />
            <Route path="reservations" element={<ReservationsPage />} />
            <Route path="reservations/new" element={<CreateReservationPage />} />
            <Route path="reservations/:reservationId" element={<ReservationDetailsPage />} />
            <Route path="reservations/:reservationId/edit" element={<EditReservationPage />} />
            <Route path="reservations/:reservationId/summary" element={<ReservationSummaryPage />} />
            <Route
              path="operations"
              element={<OperationsDashboardPage />}
            />
          </Route>
        </Route>
      </Route>

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />
    </Routes>
  );
}
