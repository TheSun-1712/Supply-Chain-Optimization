import { useMemo } from "react";
import { AlertTriangle, Globe2, Link2, ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
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

function shortList(items, limit = 3) {
  return items.slice(0, limit).join(", ");
}

export function ProducerDashboardPage() {
  const { generatedAt, intel } = useProducerAnalysisData();
  const signals = intel?.signals ?? [];
  const headlines = intel?.headlines ?? [];
  const watchlist = intel?.watchlist ?? [];
  const deviceWatchlist = intel?.deviceWatchlist ?? [];

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
              {headlines.length > 0 ? headlines.map((item) => (
                <article key={`${item.headline}-${item.url}`} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">{item.theme}</p>
                      <h4 className="mt-2 text-base font-semibold text-white">{item.headline}</h4>
                      <p className="mt-2 text-sm text-slate-400">Region: {item.region}</p>
                      <p className="mt-1 text-sm text-slate-400">Parts: {item.production_area}</p>
                    </div>
                    <StatusPill tone={severityTone(item.severity)}>Severity {item.severity}/5</StatusPill>
                  </div>
                  <a href={item.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm text-cyan-200 transition hover:text-cyan-100">
                    Read source <Link2 size={14} />
                  </a>
                </article>
              )) : (
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

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Region severity</p>
                <div className="mt-3">
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={severityByRegion} layout="vertical" margin={{ left: 10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                      <XAxis type="number" domain={[0, 5]} stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 11 }} width={84} />
                      <Tooltip />
                      <Bar dataKey="avgSeverity" fill="#67e8f9" radius={[0, 10, 10, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-300">High-severity regions need earlier sourcing buffers.</p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Theme mix</p>
                <div className="mt-3">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={themeData} dataKey="value" nameKey="name" innerRadius={44} outerRadius={70} paddingAngle={4}>
                        {themeData.map((entry, index) => (
                          <Cell key={entry.name} fill={REGION_COLORS[index % REGION_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={24} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-300">Energy, chips, and materials are driving most of the pressure.</p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Device exposure</p>
                <div className="mt-3">
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={deviceData} margin={{ left: 0, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                      <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 11 }} interval={0} angle={-18} textAnchor="end" height={56} />
                      <YAxis stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#34d399" radius={[10, 10, 0, 0]} />
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