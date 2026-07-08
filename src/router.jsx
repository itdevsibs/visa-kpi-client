import React, { Suspense, lazy } from "react";
import { Route, Routes, Navigate } from "react-router-dom";

const Login = lazy(() => import("./pages/login/Login.jsx"));
const DashboardPage = lazy(() => import("./pages/dashboard/DashboardPage.jsx"));
const PerformancePage = lazy(() => import("./pages/dashboard/employeeperformance/PerformancePage.jsx"));
const SettingsPage = lazy(() => import("./pages/dashboard/settings/SettingsPage.jsx"));

const Router = () => {
  return (
    <Suspense fallback={<div className="flex h-full w-full items-center justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div></div>}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/performance" element={<PerformancePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Suspense>
  );
};

export default Router;
