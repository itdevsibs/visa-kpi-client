import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

const Login = lazy(() => import("./pages/login/Login.jsx"));

const DashboardPage = lazy(() =>
  import("./pages/dashboard/DashboardPage.jsx")
);

const PerformancePage = lazy(() =>
  import(
    "./pages/dashboard/employeeperformance/PerformancePage.jsx"
  )
);

const SettingsPage = lazy(() =>
  import("./pages/dashboard/settings/SettingsPage.jsx")
);

const KronosEmployeesPage = lazy(() =>
  import("./pages/kronos/KronosEmployeesPage.jsx")
);

function PageLoader() {
  return (
    <div className="flex h-full min-h-[300px] w-full items-center justify-center p-8">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
    </div>
  );
}

export default function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route
          path="/"
          element={<Navigate to="/dashboard" replace />}
        />

        <Route path="/login" element={<Login />} />

        <Route
          path="/dashboard"
          element={<DashboardPage />}
        />

        <Route
          path="/performance"
          element={<PerformancePage />}
        />

        <Route
          path="/kronos-employees"
          element={<KronosEmployeesPage />}
        />

        <Route
          path="/settings"
          element={<SettingsPage />}
        />

        <Route
          path="*"
          element={<Navigate to="/dashboard" replace />}
        />
      </Routes>
    </Suspense>
  );
}