import {
  controlDefaults,
  mockInventorySeries,
  mockLogs,
} from "../data/mockData";

const API_BASE = "/api";
const TOKEN_KEY = "flowsync_auth_token";

export function getStoredToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export function authHeaders(extraHeaders = {}) {
  const token = getStoredToken();
  return {
    ...extraHeaders,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: authHeaders({
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    }),
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Request failed");
  }
  return data;
}

export async function apiPost(path, body = {}) {
  return request(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function listProducts() {
  return request("/products");
}

export function createProduct(payload) {
  return request("/products", { method: "POST", body: JSON.stringify(payload) });
}

export function updateProduct(id, payload) {
  return request(`/products/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export function deleteProduct(id) {
  return request(`/products/${id}`, { method: "DELETE" });
}

export function listSuppliers() {
  return request("/suppliers");
}

export function createSupplier(payload) {
  return request("/suppliers", { method: "POST", body: JSON.stringify(payload) });
}

export function updateSupplier(id, payload) {
  return request(`/suppliers/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export function deleteSupplier(id) {
  return request(`/suppliers/${id}`, { method: "DELETE" });
}

export function listInventory() {
  return request("/inventory");
}

export function createInventory(payload) {
  return request("/inventory", { method: "POST", body: JSON.stringify(payload) });
}

export function updateInventory(id, payload) {
  return request(`/inventory/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export function deleteInventory(id) {
  return request(`/inventory/${id}`, { method: "DELETE" });
}

export function listOrders() {
  return request("/orders");
}

export function createOrder(payload) {
  return request("/orders", { method: "POST", body: JSON.stringify(payload) });
}

export function updateOrder(id, payload) {
  return request(`/orders/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

export function deleteOrder(id) {
  return request(`/orders/${id}`, { method: "DELETE" });
}

export function recommendAction(state) {
  return request("/recommend-action", { method: "POST", body: JSON.stringify({ state }) });
}

export function simulate(payload) {
  return request("/simulate", { method: "POST", body: JSON.stringify(payload) });
}

export function comparePolicies(payload) {
  return request("/compare-policies", { method: "POST", body: JSON.stringify(payload) });
}

export function getAnalyticsSummary() {
  return request("/analytics/summary");
}

export function getPerformanceOverTime() {
  return request("/analytics/performance-over-time");
}

export function getActionDistribution() {
  return request("/analytics/action-distribution");
}

export function getProfitTrends() {
  return request("/analytics/profit-trends");
}

export function getScorecard() {
  return request("/analytics/scorecard");
}

export async function loadLatestRun() {
  const payload = await request("/latest-run");
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
      realWorld: payload.status.realWorld ?? {},
    } : null,
  };
}

export async function loadLogs() {
  try {
    const payload = await request("/logs");
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

export async function loadAuditLogs() {
  return request("/audit-logs");
}

export async function login(payload) {
  return apiPost("/auth/login", payload);
}

export async function register(payload) {
  return apiPost("/auth/register", payload);
}

export async function fetchCurrentUser() {
  return request("/auth/me");
}

export async function logout() {
  return apiPost("/auth/logout");
}

export { mockInventorySeries, mockLogs };

export async function loadPlatformStats() {
  try {
    const payload = await request("/db-stats");
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

export async function triggerDisruption(type) {
  try {
    await apiPost("/disrupt", { type });
    return true;
  } catch {
    return false;
  }
}
