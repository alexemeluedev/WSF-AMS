import {
  Route,
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider,
} from "react-router-dom";

import Login from "./pages/Login";
import Home from "./pages/Home";
import NotFoundPage from "./pages/NotFoundPage";
import MainLayout from "./components/MainLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";

import { AttendanceRegister } from "./pages/AttendanceRegister";
import AttendanceHistory from "./pages/AttendanceHistory";
import ZonalManagement from "./pages/ZonalManagement";
import ZonalAuditHistory from "./pages/ZonalAuditHistory";
import ZonalReport from "./pages/ZonalReport";
import { CellMemberReclassifier } from "./pages/CellMemberReclassifier";
import MonthlyReport from "./pages/MonthlyReport";
import CellManager from "./pages/CellManager";
import MemberManager from "./pages/MemberManager";
import DistrictManager from "./pages/DistrictManager";
import ZoneManager from "./pages/ZoneManager";
import AdminCreateUser from "./pages/AdminCreateUser";

function App() {
  const router = createBrowserRouter(
    createRoutesFromElements(
      <>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Home />} />
          <Route path="attendances" element={<AttendanceRegister />} />
          {/* MOUNTED */}
          <Route path="attendancehistory" element={<AttendanceHistory />} />
          <Route path="zonalmanagement" element={<ZonalManagement />} />
          <Route
            path="zonalaudits"
            element={
              <AdminRoute>
                <ZonalAuditHistory />
              </AdminRoute>
            }
          />
          <Route path="zonalreports" element={<ZonalReport />} />
          <Route path="reclassifiers" element={<CellMemberReclassifier />} />
          <Route path="monthlyreports" element={<MonthlyReport />} />
          <Route path="cells" element={<CellManager />} />
          <Route path="members" element={<MemberManager />} />
          <Route path="districts" element={<DistrictManager />} />
          <Route path="zones" element={<ZoneManager />} />
          <Route
            path="admin/create-user"
            element={
              <AdminRoute>
                <AdminCreateUser />
              </AdminRoute>
            }
          />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </>,
    ),
  );

  return <RouterProvider router={router} />;
}

export default App;
// npm install --save-dev jest @testing-library/react @testing-library/jest-dom
