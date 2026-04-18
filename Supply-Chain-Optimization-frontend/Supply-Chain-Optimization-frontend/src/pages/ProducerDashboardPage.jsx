import { useMemo, useState } from "react";
import { AlertTriangle, Globe2, Link2, Maximize2, Minimize2, ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MetricCard } from "../components/MetricCard";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";
import { useProducerAnalysisData } from "../hooks/useProducerAnalysisData.jsx";
import { formatTimestamp } from "../lib/formatters";

function severityTone(severity) {
  if (severity >= 5) return "rose";
  if (severity >= 4) return "amber";
  return "cyan";
}

const REGION_COLORS = ["#67e8f9", "#f59e0b", "#f43f5e", "#34d399", "#a78bfa", "#60a5fa"];
const WORLD_GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const LOCATION_HINTS = [
  { key: "seoul", coordinates: [126.978, 37.5665], label: "Seoul, South Korea" },
  { key: "busan", coordinates: [129.0756, 35.1796], label: "Busan, South Korea" },
  { key: "south korea", coordinates: [127.7669, 35.9078], label: "South Korea" },
  { key: "north korea", coordinates: [127.5101, 40.3399], label: "North Korea" },
  { key: "japan", coordinates: [138.2529, 36.2048], label: "Japan" },
  { key: "taiwan", coordinates: [120.9605, 23.6978], label: "Taiwan" },
  { key: "china", coordinates: [104.1954, 35.8617], label: "China" },
  { key: "india", coordinates: [78.9629, 20.5937], label: "India" },
  { key: "singapore", coordinates: [103.8198, 1.3521], label: "Singapore" },
  { key: "vietnam", coordinates: [108.2772, 14.0583], label: "Vietnam" },
  { key: "thailand", coordinates: [100.9925, 15.87], label: "Thailand" },
  { key: "malaysia", coordinates: [101.9758, 4.2105], label: "Malaysia" },
  { key: "indonesia", coordinates: [113.9213, -0.7893], label: "Indonesia" },
  { key: "philippines", coordinates: [121.774, 12.8797], label: "Philippines" },
  { key: "australia", coordinates: [133.7751, -25.2744], label: "Australia" },
  { key: "new zealand", coordinates: [174.886, -40.9006], label: "New Zealand" },
  { key: "united states", coordinates: [-95.7129, 37.0902], label: "United States" },
  { key: "usa", coordinates: [-95.7129, 37.0902], label: "United States" },
  { key: "canada", coordinates: [-106.3468, 56.1304], label: "Canada" },
  { key: "mexico", coordinates: [-102.5528, 23.6345], label: "Mexico" },
  { key: "brazil", coordinates: [-51.9253, -14.235], label: "Brazil" },
  { key: "chile", coordinates: [-71.543, -35.6751], label: "Chile" },
  { key: "argentina", coordinates: [-63.6167, -38.4161], label: "Argentina" },
  { key: "uk", coordinates: [-3.436, 55.3781], label: "United Kingdom" },
  { key: "united kingdom", coordinates: [-3.436, 55.3781], label: "United Kingdom" },
  { key: "germany", coordinates: [10.4515, 51.1657], label: "Germany" },
  { key: "france", coordinates: [2.2137, 46.2276], label: "France" },
  { key: "italy", coordinates: [12.5674, 41.8719], label: "Italy" },
  { key: "spain", coordinates: [-3.7492, 40.4637], label: "Spain" },
  { key: "netherlands", coordinates: [5.2913, 52.1326], label: "Netherlands" },
  { key: "turkey", coordinates: [35.2433, 38.9637], label: "Turkey" },
  { key: "russia", coordinates: [105.3188, 61.524], label: "Russia" },
  { key: "ukraine", coordinates: [31.1656, 48.3794], label: "Ukraine" },
  { key: "israel", coordinates: [34.8516, 31.0461], label: "Israel" },
  { key: "saudi", coordinates: [45.0792, 23.8859], label: "Saudi Arabia" },
  { key: "uae", coordinates: [53.8478, 23.4241], label: "United Arab Emirates" },
  { key: "qatar", coordinates: [51.1839, 25.3548], label: "Qatar" },
  { key: "africa", coordinates: [20.0, 0.0], label: "Africa" },
  { key: "middle east", coordinates: [45.0, 26.0], label: "Middle East" },
  { key: "east asia", coordinates: [120.0, 32.0], label: "East Asia" },
  { key: "europe", coordinates: [15.0, 54.0], label: "Europe" },
  { key: "global", coordinates: [0.0, 18.0], label: "Global" },
  { key: "global transport lanes", coordinates: [55.0, 15.0], label: "Global Transport Lanes" },
];

const REGION_ALIASES = {
  "korea": "south korea",
  "south korea / east asia": "south korea",
  "taiwan / east asia": "taiwan",
  "global transport lanes": "global transport lanes",
};

function shortList(items, limit = 3) {
  return items.slice(0, limit).join(", ");
}

function severityColor(severity) {
  if (severity >= 5) return "#fb7185";
  if (severity >= 4) return "#f59e0b";
  return "#22d3ee";
}

function resolveLocationForHeadline(item) {
  const regionText = `${item.region ?? ""}`.toLowerCase().replace(/\s+/g, " ").trim();
  const directAlias = REGION_ALIASES[regionText];
  if (directAlias) {
    return LOCATION_HINTS.find((entry) => entry.key === directAlias) ?? null;
  }

  const regionParts = regionText.split(/[\/,|]/).map((part) => part.trim()).filter(Boolean);
  for (const part of regionParts) {
    const alias = REGION_ALIASES[part] ?? part;
    const exact = LOCATION_HINTS.find((entry) => entry.key === alias);
    if (exact) return exact;
  }

  const lookup = `${item.region ?? ""} ${item.headline ?? ""} ${item.production_area ?? ""}`.toLowerCase();
  const hit = LOCATION_HINTS.find((entry) => lookup.includes(entry.key));
  return hit ?? null;
}

function shortenLabel(value, max = 13) {
  if (!value) return "--";
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}...`;
}

export function ProducerDashboardPage() {
  const { generatedAt, intel } = useProducerAnalysisData();
  const signals = intel?.signals ?? [];
  const headlines = intel?.headlines ?? [];
  const watchlist = intel?.watchlist ?? [];
  const deviceWatchlist = intel?.deviceWatchlist ?? [];
  const [activeMapItem, setActiveMapItem] = useState(null);
  const [expandedChart, setExpandedChart] = useState(null);

  const severityByRegion = useMemo(() => {
    const grouped = new Map();
    signals.forEach((signal) => {
      const current = grouped.get(signal.region) ?? { name: signal.region, total: 0, count: 0 };
      current.total += Number(signal.severity || 0);
      current.count += 1;
      grouped.set(signal.region, current);
    });
    return [...grouped.values()]
      .map((item) => ({ name: item.name, avgSeverity: Number((item.total / item.count).toFixed(1)) }))
      .sort((a, b) => b.avgSeverity - a.avgSeverity)
      .slice(0, 5);
  }, [signals]);

  const themeData = useMemo(() => {
    const grouped = new Map();
    signals.forEach((signal) => {
      const current = grouped.get(signal.theme) ?? { name: signal.theme, value: 0 };
      current.value += 1;
      grouped.set(signal.theme, current);
    });
    return [...grouped.values()].sort((a, b) => b.value - a.value).slice(0, 4);
  }, [signals]);

  const deviceData = useMemo(() => {
    const grouped = new Map();
    signals.forEach((signal) => {
      (signal.downstream_devices ?? []).forEach((device) => {
        const current = grouped.get(device) ?? { name: device, value: 0 };
        current.value += Number(signal.severity || 1);
        grouped.set(device, current);
      });
    });
    return [...grouped.values()].sort((a, b) => b.value - a.value).slice(0, 5);
  }, [signals]);

  const topSignal = signals[0];

  const mapPoints = useMemo(() => {
    return headlines
      .map((item, index) => {
        const location = resolveLocationForHeadline(item);
        if (!location) return null;
        return {
          id: `${item.headline}-${item.url}-${index}`,
          item,
          locationLabel: location.label,
          coordinates: location.coordinates,
        };
      })
      .filter(Boolean);
  }, [headlines]);

  const hoveredOrDefaultPoint = activeMapItem ?? mapPoints[0] ?? null;
  const hasExpandedChart = Boolean(expandedChart);

  function toggleChart(card) {
    setExpandedChart((current) => (current === card ? null : card));
  }

  return (
    <div>
      <PageHeader
        eyebrow="Producer Dashboard"
        title="Global upstream risk and product exposure"
        description="Track live news by region, identify the parts made there, and see which finished devices are affected when tensions rise."
        aside={
          <div className="flex flex-col items-end gap-2">
            <StatusPill tone={intel?.status === "Live News Sync" ? "emerald" : "amber"}>
              {intel?.status ?? "Waiting for news sync"}
            </StatusPill>
            <StatusPill tone="cyan">
              {generatedAt ? `Latest sync ${formatTimestamp(generatedAt)} UTC` : "Waiting for backend sync"}
            </StatusPill>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4 lg:mb-8">
        <MetricCard
          label="Risk Score"
          value={intel ? `${intel.riskScore}/5` : "--"}
          hint="Overall geopolitical and supply risk score from live news."
          tone={intel?.riskScore >= 4 ? "rose" : intel?.riskScore >= 3 ? "amber" : "cyan"}
        />
        <MetricCard
          label="Top Region"
          value={topSignal?.region ?? "--"}
          hint="Region with the strongest current upstream pressure."
          tone="rose"
        />
        <MetricCard
          label="Watchlist Parts"
          value={watchlist.length ? `${watchlist.length}` : "--"}
          hint="Components and materials that need closer monitoring."
          tone="cyan"
        />
        <MetricCard
          label="Exposed Devices"
          value={deviceWatchlist.length ? `${deviceWatchlist.length}` : "--"}
          hint="Finished devices most exposed to these supply shocks."
          tone="amber"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <div className="space-y-6">
          <section className="panel p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-3 text-rose-200">
                <Globe2 size={18} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-rose-200/80">Real-World Feed</p>
                <h3 className="text-lg font-semibold text-white">Latest geopolitical signals</h3>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {mapPoints.length > 0 ? (
                <>
                  <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-3">
                    <div className="h-[340px] overflow-hidden rounded-2xl border border-white/10 bg-[#030611]">
                      <ComposableMap projection="geoMercator" projectionConfig={{ scale: 180, center: [12, 18] }} style={{ width: "100%", height: "100%" }}>
                        <Geographies geography={WORLD_GEO_URL}>
                          {({ geographies }) =>
                            geographies.map((geo) => (
                              <Geography
                                key={geo.rsmKey}
                                geography={geo}
                                fill="#0b1730"
                                stroke="#1f2b4a"
                                strokeWidth={0.45}
                                style={{
                                  default: { outline: "none" },
                                  hover: { fill: "#13213f", outline: "none" },
                                  pressed: { outline: "none" },
                                }}
                              />
                            ))
                          }
                        </Geographies>
                        {mapPoints.map((point) => {
                          const level = Number(point.item.severity || 1);
                          const color = severityColor(level);
                          return (
                            <Marker key={point.id} coordinates={point.coordinates}>
                              <g
                                role="button"
                                tabIndex={0}
                                onMouseEnter={() => setActiveMapItem(point)}
                                onFocus={() => setActiveMapItem(point)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    window.open(point.item.url, "_blank", "noopener,noreferrer");
                                  }
                                }}
                                onClick={() => window.open(point.item.url, "_blank", "noopener,noreferrer")}
                                style={{ cursor: "pointer" }}
                              >
                                <circle r={Math.max(5, 3 + level)} fill={color} fillOpacity={0.32} />
                                <circle r={2.8} fill={color} />
                                <circle r={1.2} fill="#ffffff" />
                              </g>
                            </Marker>
                          );
                        })}
                      </ComposableMap>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1">
                        <span className="h-2 w-2 rounded-full bg-rose-400" /> High severity
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1">
                        <span className="h-2 w-2 rounded-full bg-amber-400" /> Medium severity
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1">
                        <span className="h-2 w-2 rounded-full bg-cyan-400" /> Lower severity
                      </span>
                    </div>
                  </div>

                  {hoveredOrDefaultPoint && (
                    <article className="rounded-3xl border border-white/10 bg-white/5 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">{hoveredOrDefaultPoint.item.theme}</p>
                          <h4 className="mt-2 text-base font-semibold text-white">{hoveredOrDefaultPoint.item.headline}</h4>
                          <p className="mt-2 text-sm text-slate-400">Region: {hoveredOrDefaultPoint.locationLabel}</p>
                          <p className="mt-1 text-sm text-slate-400">Parts: {hoveredOrDefaultPoint.item.production_area}</p>
                        </div>
                        <StatusPill tone={severityTone(hoveredOrDefaultPoint.item.severity)}>
                          Severity {hoveredOrDefaultPoint.item.severity}/5
                        </StatusPill>
                      </div>
                      <a
                        href={hoveredOrDefaultPoint.item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 inline-flex items-center gap-2 text-sm text-cyan-200 transition hover:text-cyan-100"
                      >
                        Read source <Link2 size={14} />
                      </a>
                    </article>
                  )}
                </>
              ) : (
                <p className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
                  No live headlines returned yet.
                </p>
              )}
            </div>
          </section>

          <section className="panel p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-amber-200">
                <ShieldAlert size={18} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-amber-200/80">Impact Chain</p>
                <h3 className="text-lg font-semibold text-white">Graph view of the risk</h3>
              </div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-3">
              <div className={`rounded-3xl border border-white/10 bg-white/5 p-4 ${hasExpandedChart && expandedChart !== "region" ? "hidden" : ""} ${expandedChart === "region" ? "xl:col-span-3" : ""}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Region severity</p>
                  <button
                    type="button"
                    onClick={() => toggleChart("region")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-2 py-1 text-xs text-slate-300 transition hover:bg-white/10"
                  >
                    {expandedChart === "region" ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                    {expandedChart === "region" ? "Collapse" : "Expand"}
                  </button>
                </div>
                <div className="mt-3">
                  <ResponsiveContainer width="100%" height={expandedChart === "region" ? 320 : 220}>
                    <BarChart data={severityByRegion} layout="vertical" margin={{ top: 6, right: 10, bottom: 6, left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                      <XAxis type="number" domain={[0, 5]} stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        stroke="#94a3b8"
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                        tickFormatter={(value) => shortenLabel(value, 14)}
                        width={96}
                      />
                      <Tooltip
                        contentStyle={{ background: "#0b1224", border: "1px solid rgba(148,163,184,0.25)", borderRadius: "12px", color: "#e2e8f0" }}
                        labelStyle={{ color: "#cbd5e1" }}
                        formatter={(value) => [`${value}/5`, "Avg Severity"]}
                      />
                      <Bar dataKey="avgSeverity" fill="#67e8f9" radius={[0, 10, 10, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-300">High-severity regions need earlier sourcing buffers.</p>
              </div>

              <div className={`rounded-3xl border border-white/10 bg-white/5 p-4 ${hasExpandedChart && expandedChart !== "theme" ? "hidden" : ""} ${expandedChart === "theme" ? "xl:col-span-3" : ""}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Theme mix</p>
                  <button
                    type="button"
                    onClick={() => toggleChart("theme")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-2 py-1 text-xs text-slate-300 transition hover:bg-white/10"
                  >
                    {expandedChart === "theme" ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                    {expandedChart === "theme" ? "Collapse" : "Expand"}
                  </button>
                </div>
                <div className="mt-3">
                  <ResponsiveContainer width="100%" height={expandedChart === "theme" ? 320 : 220}>
                    <PieChart>
                      <Pie data={themeData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={80} paddingAngle={3} stroke="#0f172a" strokeWidth={2}>
                        {themeData.map((entry, index) => (
                          <Cell key={entry.name} fill={REGION_COLORS[index % REGION_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "#0b1224", border: "1px solid rgba(148,163,184,0.25)", borderRadius: "12px", color: "#e2e8f0" }}
                        labelStyle={{ color: "#cbd5e1" }}
                        formatter={(value) => [`${value}`, "Signals"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 space-y-2">
                  {themeData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-2 text-slate-200">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: REGION_COLORS[index % REGION_COLORS.length] }} />
                        <span>{entry.name}</span>
                      </div>
                      <span className="text-slate-400">{entry.value}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-300">Energy, chips, and materials are driving most of the pressure.</p>
              </div>

              <div className={`rounded-3xl border border-white/10 bg-white/5 p-4 ${hasExpandedChart && expandedChart !== "device" ? "hidden" : ""} ${expandedChart === "device" ? "xl:col-span-3" : ""}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Device exposure</p>
                  <button
                    type="button"
                    onClick={() => toggleChart("device")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-2 py-1 text-xs text-slate-300 transition hover:bg-white/10"
                  >
                    {expandedChart === "device" ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                    {expandedChart === "device" ? "Collapse" : "Expand"}
                  </button>
                </div>
                <div className="mt-3">
                  <ResponsiveContainer width="100%" height={expandedChart === "device" ? 320 : 220}>
                    <BarChart data={deviceData} layout="vertical" margin={{ top: 6, right: 10, bottom: 6, left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                      <XAxis type="number" stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        stroke="#94a3b8"
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                        tickFormatter={(value) => shortenLabel(value, 14)}
                        width={96}
                      />
                      <Tooltip
                        contentStyle={{ background: "#0b1224", border: "1px solid rgba(148,163,184,0.25)", borderRadius: "12px", color: "#e2e8f0" }}
                        labelStyle={{ color: "#cbd5e1" }}
                        formatter={(value) => [`${value}`, "Exposure"]}
                      />
                      <Bar dataKey="value" fill="#34d399" radius={[0, 10, 10, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-300">Phones, laptops, servers, and cars are most exposed.</p>
              </div>
            </div>

            <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm leading-7 text-slate-300">
              {intel?.summary ?? "No live summary available yet."}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="panel p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-cyan-200">
                <TriangleAlert size={18} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">Concise Analysis</p>
                <h3 className="text-lg font-semibold text-white">What it means</h3>
              </div>
            </div>

            <div className="mt-5 space-y-3 text-sm text-slate-300">
              <p>{topSignal ? `${topSignal.region}: ${topSignal.likely_disruption}` : "Waiting for live news."}</p>
              <p>{topSignal ? `Main parts: ${shortList(topSignal.affected_parts ?? [])}.` : ""}</p>
              <p>{deviceWatchlist.length ? `Most exposed devices: ${shortList(deviceWatchlist)}.` : ""}</p>
            </div>
          </section>

          <section className="panel p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-emerald-200">
                <ShieldCheck size={18} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-emerald-200/80">Simple Actions</p>
                <h3 className="text-lg font-semibold text-white">What producers should do</h3>
              </div>
            </div>

            <div className="mt-5 space-y-3 text-sm leading-7 text-slate-300">
              {[
                "Check which region makes each critical part.",
                "Increase buffer stock for high-risk items.",
                "Split suppliers where possible.",
                "Adjust build plans before costs spike.",
              ].map((item) => (
                <p key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">{item}</p>
              ))}
            </div>
          </section>

          <section className="panel p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-3 text-rose-200">
                <AlertTriangle size={18} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-rose-200/80">Watchlist</p>
                <h3 className="text-lg font-semibold text-white">Parts and devices</h3>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Parts and materials</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {watchlist.length > 0 ? watchlist.map((part) => (
                    <StatusPill key={part} tone="cyan">{part}</StatusPill>
                  )) : <p className="text-sm text-slate-400">No active watchlist items.</p>}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Downstream devices</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {deviceWatchlist.length > 0 ? deviceWatchlist.map((device) => (
                    <StatusPill key={device} tone="amber">{device}</StatusPill>
                  )) : <p className="text-sm text-slate-400">No downstream device mapping available.</p>}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}