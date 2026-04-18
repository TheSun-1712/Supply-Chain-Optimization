import { Suspense, lazy } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";

const LandingPage = lazy(() => import("./pages/LandingPage").then((m) => ({ default: m.LandingPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const ProducerDashboardPage = lazy(() => import("./pages/ProducerDashboardPage").then((m) => ({ default: m.ProducerDashboardPage })));
const ImplementationPipelinePage = lazy(() => import("./pages/ImplementationPipelinePage").then((m) => ({ default: m.ImplementationPipelinePage })));
const MachineHealthPage = lazy(() => import("./pages/MachineHealthPage").then((m) => ({ default: m.MachineHealthPage })));
const FinancialsPage = lazy(() => import("./pages/FinancialsPage").then((m) => ({ default: m.FinancialsPage })));
const LogsPage = lazy(() => import("./pages/LogsPage").then((m) => ({ default: m.LogsPage })));
const CopilotPage = lazy(() => import("./pages/CopilotPage").then((m) => ({ default: m.CopilotPage })));

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
        <Route path="/app" element={<AppShell />}>
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="producer-dashboard" element={<ProducerDashboardPage />} />
          <Route path="implementation-pipeline" element={<ImplementationPipelinePage />} />
          <Route path="machine-health" element={<MachineHealthPage />} />
          <Route path="financials" element={<FinancialsPage />} />
          <Route path="logs" element={<LogsPage />} />
          <Route path="copilot" element={<CopilotPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
