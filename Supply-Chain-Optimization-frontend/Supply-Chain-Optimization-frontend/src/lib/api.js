import {
  controlDefaults,
  mockInventorySeries,
  mockLogs,
  mockSeiStatus,
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
      status: payload.status ?? null,
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

export async function loadSeiStatus() {
  try {
    const payload = await fetchJson("/api/sei-status");
    return {
      network: payload.network ?? "Sei Atlantic-2",
      state: payload.state ?? payload.status ?? "Pending",
      transactionHash: payload.transactionHash ?? payload.transaction_hash,
      lastAnchoredAt: payload.lastAnchoredAt ?? payload.last_anchored_at,
      bestProfit: payload.bestProfit ?? payload.best_profit,
      sourceHash: payload.sourceHash ?? payload.source_hash,
    };
  } catch {
    return mockSeiStatus;
  }
}
