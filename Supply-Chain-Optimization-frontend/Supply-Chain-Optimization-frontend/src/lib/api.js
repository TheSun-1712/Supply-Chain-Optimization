import {
  controlDefaults,
  mockInventorySeries,
  mockLogs,
} from "../data/mockData";

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
}

export async function loadLatestRun() {
  try {
    const payload = await fetchJson("/api/latest-run");
    const incomingControls = payload.controls ?? {};

    return {
      controls: {
        simulationLength:
          incomingControls.simulationLength ?? incomingControls.simulation_length ?? controlDefaults.simulationLength,
        autoPlaySpeed:
          incomingControls.autoPlaySpeed ?? incomingControls.auto_play_speed ?? controlDefaults.autoPlaySpeed,
      },
      inventory: (payload.inventory ?? []).map((entry) => ({
        day: entry.day,
        backlog: entry.backlog,
        centralInv: entry.centralInv ?? entry.central_inv,
        regionalInv: entry.regionalInv ?? entry.regional_inv,
        profit: entry.profit,
        forecast: entry.forecast ?? entry.prediction_forecast ?? entry.profit,
      })),
      generatedAt: payload.generatedAt ?? payload.generated_at ?? null,
      status: payload.status ? {
        ...payload.status,
        realWorld: payload.status.realWorld ?? {}
      } : null,
    };
  } catch {
    return {
      controls: controlDefaults,
      inventory: mockInventorySeries,
      generatedAt: "2026-04-17T07:10:00Z",
    };
  }
}

export async function loadLogs() {
  try {
    const payload = await fetchJson("/api/logs");
    return payload.map((entry) => ({
      timestamp: entry.timestamp,
      agentId: entry.agentId ?? entry.agent_id,
      action: entry.action,
      stochastic_noise_value: entry.stochastic_noise_value,
      profitImpact: entry.profitImpact ?? entry.profit_impact ?? entry.profit,
      hashId: entry.hashId ?? entry.hash_id,
      isBest: entry.isBest ?? entry.is_best ?? false,
    }));
  } catch {
    return mockLogs;
  }
}

export async function loadPlatformStats() {
  try {
    const payload = await fetchJson("/api/db-stats");
    return [
      { label: "Policies Simulated", value: payload.policiesSimulated },
      { label: "Current Best Margin", value: `+${payload.bestMargin}%` },
      { label: "Optimized Decisions", value: payload.optimizedDecisions },
    ];
  } catch {
    return [
      { label: "Policies Simulated", value: 12400 },
      { label: "Current Best Margin", value: "+18.2%" },
      { label: "Optimized Decisions", value: 842 },
    ];
  }
}

