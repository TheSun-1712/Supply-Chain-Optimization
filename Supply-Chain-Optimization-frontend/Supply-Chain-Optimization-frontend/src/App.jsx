import { Suspense, lazy } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { useAuth } from "./hooks/useAuth.jsx";

const LandingPage = lazy(() => import("./pages/LandingPage").then((m) => ({ default: m.LandingPage })));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage").then((m) => ({ default: m.AnalyticsPage })));
const InventoryManagementPage = lazy(() => import("./pages/InventoryManagementPage").then((m) => ({ default: m.InventoryManagementPage })));
const RecommendationsPage = lazy(() => import("./pages/RecommendationsPage").then((m) => ({ default: m.RecommendationsPage })));
const ScenarioTestingPage = lazy(() => import("./pages/ScenarioTestingPage").then((m) => ({ default: m.ScenarioTestingPage })));
const SimulationDashboardPage = lazy(() => import("./pages/SimulationDashboardPage").then((m) => ({ default: m.SimulationDashboardPage })));
const LoginPage = lazy(() => import("./pages/LoginPage").then((m) => ({ default: m.LoginPage })));

function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-400">Checking session...</div>;
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-400">
          Loading FlowSync...
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<AppShell />}>
            <Route index element={<Navigate to="/app/inventory" replace />} />
            <Route path="inventory" element={<InventoryManagementPage />} />
            <Route path="simulation" element={<SimulationDashboardPage />} />
            <Route path="recommendations" element={<RecommendationsPage />} />
            <Route path="scenarios" element={<ScenarioTestingPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
