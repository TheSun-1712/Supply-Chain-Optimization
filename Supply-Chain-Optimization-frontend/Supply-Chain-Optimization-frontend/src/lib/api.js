const API_BASE = "/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    ...options,
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
