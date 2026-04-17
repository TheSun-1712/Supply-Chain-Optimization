import { createContext, useContext, useEffect, useState } from "react";
import { loadLatestRun, loadLogs } from "../lib/api";
import { useAuth } from "./useAuth.jsx";
import { controlDefaults } from "../data/mockData";

const ProductionDataContext = createContext(null);

export function ProductionDataProvider({ children }) {
  const { token } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [controls, setControls] = useState(controlDefaults);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [status, setStatus] = useState(null);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    let active = true;

    if (!token) {
      setInventory([]);
      setLogs([]);
      setControls(controlDefaults);
      setGeneratedAt(null);
      setStatus(null);
      setConnectionError(null);
      return () => {
        active = false;
      };
    }

    async function load() {
      try {
        const [latestRun, nextLogs] = await Promise.all([
          loadLatestRun(),
          loadLogs(),
        ]);

        if (!active) return;

        setInventory(latestRun.inventory ?? []);
        setControls(latestRun.controls ?? controlDefaults);
        setGeneratedAt(latestRun.generatedAt ?? null);
        setStatus(latestRun.status ?? null);
        setLogs(nextLogs);
        setConnectionError(null);
      } catch (error) {
        if (!active) return;
        setConnectionError(error.message || "Backend connection failed");
      }
    }

    load();
    const intervalId = window.setInterval(load, 2000); // Poll every 2s for live feel

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [token]);

  return (
    <ProductionDataContext.Provider
      value={{
        inventory,
        logs,
        controls,
        generatedAt,
        status,
        connectionError,
        setControls,
      }}
    >
      {children}
    </ProductionDataContext.Provider>
  );
}

export function useProductionData() {
  const value = useContext(ProductionDataContext);
  if (!value) {
    throw new Error("useProductionData must be used within ProductionDataProvider");
  }
  return value;
}
