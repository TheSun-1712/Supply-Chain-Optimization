const inventorySeries = [
  { day: 1, backlog: 42, centralInv: 200, regionalInv: 138, profit: 12000, forecast: 11840 },
  { day: 2, backlog: 47, centralInv: 197, regionalInv: 140, profit: 12350, forecast: 12160 },
  { day: 3, backlog: 44, centralInv: 202, regionalInv: 143, profit: 12740, forecast: 12550 },
  { day: 4, backlog: 49, centralInv: 194, regionalInv: 139, profit: 12590, forecast: 12680 },
  { day: 5, backlog: 53, centralInv: 191, regionalInv: 145, profit: 13020, forecast: 12940 },
  { day: 6, backlog: 51, centralInv: 196, regionalInv: 149, profit: 13390, forecast: 13200 },
  { day: 7, backlog: 57, centralInv: 188, regionalInv: 147, profit: 13180, forecast: 13380 },
  { day: 8, backlog: 55, centralInv: 192, regionalInv: 151, profit: 13640, forecast: 13520 },
  { day: 9, backlog: 59, centralInv: 184, regionalInv: 153, profit: 13990, forecast: 13890 },
  { day: 10, backlog: 61, centralInv: 180, regionalInv: 156, profit: 14340, forecast: 14110 },
  { day: 11, backlog: 58, centralInv: 187, regionalInv: 154, profit: 14580, forecast: 14420 },
  { day: 12, backlog: 63, centralInv: 178, regionalInv: 159, profit: 14960, forecast: 14680 },
  { day: 13, backlog: 60, centralInv: 182, regionalInv: 162, profit: 15240, forecast: 15070 },
  { day: 14, backlog: 66, centralInv: 174, regionalInv: 158, profit: 15050, forecast: 15120 },
  { day: 15, backlog: 64, centralInv: 177, regionalInv: 164, profit: 15590, forecast: 15380 },
  { day: 16, backlog: 69, centralInv: 169, regionalInv: 168, profit: 15940, forecast: 15640 },
  { day: 17, backlog: 72, centralInv: 165, regionalInv: 170, profit: 16210, forecast: 16020 },
  { day: 18, backlog: 68, centralInv: 172, regionalInv: 167, profit: 16580, forecast: 16230 },
  { day: 19, backlog: 73, centralInv: 164, regionalInv: 172, profit: 16990, forecast: 16620 },
  { day: 20, backlog: 71, centralInv: 168, regionalInv: 176, profit: 17380, forecast: 16950 },
  { day: 21, backlog: 75, centralInv: 161, regionalInv: 173, profit: 17140, forecast: 17120 },
  { day: 22, backlog: 78, centralInv: 158, regionalInv: 178, profit: 17680, forecast: 17490 },
  { day: 23, backlog: 74, centralInv: 166, regionalInv: 181, profit: 18020, forecast: 17740 },
  { day: 24, backlog: 79, centralInv: 157, regionalInv: 177, profit: 18390, forecast: 18150 },
  { day: 25, backlog: 77, centralInv: 160, regionalInv: 183, profit: 18810, forecast: 18400 },
  { day: 26, backlog: 82, centralInv: 154, regionalInv: 186, profit: 19180, forecast: 18760 },
  { day: 27, backlog: 80, centralInv: 159, regionalInv: 184, profit: 19440, forecast: 19120 },
  { day: 28, backlog: 84, centralInv: 152, regionalInv: 188, profit: 19880, forecast: 19490 },
  { day: 29, backlog: 81, centralInv: 156, regionalInv: 191, profit: 20140, forecast: 19820 },
  { day: 30, backlog: 86, centralInv: 149, regionalInv: 194, profit: 20690, forecast: 20180 },
];

const logs = [
  {
    timestamp: "2026-04-17T06:05:00Z",
    agentId: "RL-07A",
    action: "rebalance_central_to_region",
    stochastic_noise_value: 0.21,
    profitImpact: 420,
  },
  {
    timestamp: "2026-04-17T06:15:00Z",
    agentId: "RL-07A",
    action: "increase_safety_stock",
    stochastic_noise_value: 0.18,
    profitImpact: 610,
  },
  {
    timestamp: "2026-04-17T06:25:00Z",
    agentId: "RL-13C",
    action: "expedite_regional_restock",
    stochastic_noise_value: 0.32,
    profitImpact: 980,
  },
  {
    timestamp: "2026-04-17T06:35:00Z",
    agentId: "RL-13C",
    action: "defer_low_margin_batch",
    stochastic_noise_value: 0.27,
    profitImpact: 710,
  },
  {
    timestamp: "2026-04-17T06:45:00Z",
    agentId: "RL-21B",
    action: "route_demand_to_central",
    stochastic_noise_value: 0.15,
    profitImpact: 1330,
  },
  {
    timestamp: "2026-04-17T06:55:00Z",
    agentId: "RL-21B",
    action: "stabilize_climate_buffer",
    stochastic_noise_value: 0.11,
    profitImpact: 890,
  },
  {
    timestamp: "2026-04-17T07:05:00Z",
    agentId: "RL-31X",
    action: "promote_high_margin_mix",
    stochastic_noise_value: 0.36,
    profitImpact: 1640,
  },
  {
    timestamp: "2026-04-17T07:15:00Z",
    agentId: "RL-31X",
    action: "lock_supplier_swap",
    stochastic_noise_value: 0.29,
    profitImpact: 1540,
  },
];

const maxProfitImpact = Math.max(...logs.map((entry) => entry.profitImpact));

export const mockLogs = logs.map((entry) => ({
  ...entry,
  isBest: entry.profitImpact === maxProfitImpact,
}));

export const mockInventorySeries = inventorySeries;



export const controlDefaults = {
  simulationLength: 30,
  autoPlaySpeed: 750,
};

export const landingStats = [
  { label: "Policies Simulated", value: "12.4k" },
  { label: "Current Best Margin", value: "+18.2%" },
  { label: "Optimized Decisions", value: "842" },
];

export const mockProducerDashboard = {
  generatedAt: "2026-04-17T07:10:00Z",
  status: {
    day: 18,
    horizon: 30,
    cumulativeProfit: 18420.5,
    fuelMultiplier: 1.78,
    weather: "storm",
    routeStatus: "delayed",
    realWorld: {
      status: "Real-World Sync",
      wind_speed: 34,
      oil_price: 86.12,
    },
  },
  intel: {
    status: "Live News Sync",
    generatedAt: "2026-04-17T07:05:00Z",
    riskScore: 4.4,
    summary:
      "Semiconductor risk is elevated. Monitor Taiwan-linked news for processor and chipset lead-time expansion, especially for laptops and phones.",
    watchlist: ["processors", "chipsets", "semiconductors", "motherboards", "phones", "laptops"],
    deviceWatchlist: ["phones", "laptops", "servers", "cars", "industrial systems", "appliances"],
    headlines: [
      {
        headline: "Taiwan tension raises chip export control concerns",
        theme: "Semiconductor exposure",
        region: "Taiwan / East Asia",
        production_area: "Semiconductor manufacturing",
        url: "https://example.com/chips",
        severity: 5,
      },
      {
        headline: "Oil freight costs climb as shipping lanes tighten",
        theme: "Logistics and fuel pressure",
        region: "Global transport lanes",
        production_area: "Energy and petrochemicals",
        url: "https://example.com/fuel",
        severity: 4,
      },
    ],
    signals: [
      {
        headline: "Taiwan tension raises chip export control concerns",
        theme: "Semiconductor exposure",
        region: "Taiwan / East Asia",
        production_area: "Semiconductor manufacturing",
        likely_disruption: "Processor, chipset, and board availability risk for electronics assembly lines.",
        affected_parts: ["processors", "chipsets", "semiconductors", "motherboards", "phones", "laptops"],
        downstream_devices: ["phones", "laptops", "servers", "cars"],
        severity: 5,
        url: "https://example.com/chips",
        source: "example.com",
      },
      {
        headline: "Oil freight costs climb as shipping lanes tighten",
        theme: "Logistics and fuel pressure",
        region: "Global transport lanes",
        production_area: "Energy and petrochemicals",
        likely_disruption: "Freight costs and transit times may rise, increasing manufacturing and inbound material costs.",
        affected_parts: ["transport", "assembly inputs", "inbound freight", "warehousing"],
        downstream_devices: ["cars", "phones", "laptops", "appliances"],
        severity: 4,
        url: "https://example.com/fuel",
        source: "example.com",
      },
    ],
  },
};
