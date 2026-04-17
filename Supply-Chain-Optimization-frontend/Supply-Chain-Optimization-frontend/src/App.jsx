import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { InventoryManagementPage } from "./pages/InventoryManagementPage";
import { RecommendationsPage } from "./pages/RecommendationsPage";
import { ScenarioTestingPage } from "./pages/ScenarioTestingPage";
import { SimulationDashboardPage } from "./pages/SimulationDashboardPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app/inventory" replace />} />
      <Route path="/app" element={<AppShell />}>
        <Route index element={<Navigate to="/app/inventory" replace />} />
        <Route path="inventory" element={<InventoryManagementPage />} />
        <Route path="simulation" element={<SimulationDashboardPage />} />
        <Route path="recommendations" element={<RecommendationsPage />} />
        <Route path="scenarios" element={<ScenarioTestingPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
      </Route>
    </Routes>
  );
}
