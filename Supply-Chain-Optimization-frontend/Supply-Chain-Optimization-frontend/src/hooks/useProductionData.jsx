import { createContext, useContext, useEffect, useState } from "react";
import { loadLatestRun, loadLogs } from "../lib/api";
import { controlDefaults } from "../data/mockData";

const ProductionDataContext = createContext(null);

export function ProductionDataProvider({ children }) {
  const [inventory, setInventory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [controls, setControls] = useState(controlDefaults);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
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
    }

    load();
    const intervalId = window.setInterval(load, 2000); // Poll every 2s for live feel

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <ProductionDataContext.Provider
      value={{
        inventory,
        logs,
        controls,
        generatedAt,
        status,
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
