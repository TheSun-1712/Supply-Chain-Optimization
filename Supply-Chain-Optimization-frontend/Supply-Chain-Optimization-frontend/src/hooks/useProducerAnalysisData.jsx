import { useEffect, useState } from "react";
import { loadProducerDashboard } from "../lib/api";
import { mockProducerDashboard } from "../data/mockData";

export function useProducerAnalysisData() {
  const [data, setData] = useState(mockProducerDashboard);

  useEffect(() => {
    let active = true;

    async function load() {
      const nextData = await loadProducerDashboard();
      if (active) {
        setData(nextData ?? mockProducerDashboard);
      }
    }

    load();
    const intervalId = window.setInterval(load, 60000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  return data;
}