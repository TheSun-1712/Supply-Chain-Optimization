import { createContext, useContext, useEffect, useState } from "react";
import { loadLatestRun, loadLogs, loadSeiStatus } from "../lib/api";
import { controlDefaults } from "../data/mockData";

const ProductionDataContext = createContext(null);

export function ProductionDataProvider({ children }) {
  const [inventory, setInventory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [seiStatus, setSeiStatus] = useState(null);
  const [controls, setControls] = useState(controlDefaults);
  const [generatedAt, setGeneratedAt] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const [latestRun, nextLogs, nextSeiStatus] = await Promise.all([
        loadLatestRun(),
        loadLogs(),
        loadSeiStatus(),
      ]);

      if (!active) {
        return;
      }

      setInventory(latestRun.inventory ?? []);
      setControls(latestRun.controls ?? controlDefaults);
      setGeneratedAt(latestRun.generatedAt ?? null);
      setLogs(nextLogs);
      setSeiStatus(nextSeiStatus);
    }

    load();
    const intervalId = window.setInterval(load, 15000);

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
        seiStatus,
        controls,
        generatedAt,
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
