import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { getActionDistribution, getAnalyticsSummary, getPerformanceOverTime, getProfitTrends, getScorecard } from "../lib/api";

const palette = ["#0f766e", "#0f172a", "#b45309", "#7c3aed", "#2563eb"];

export function AnalyticsPage() {
  const [summary, setSummary] = useState(null);
  const [performance, setPerformance] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [profitTrends, setProfitTrends] = useState([]);
  const [scorecard, setScorecard] = useState([]);

  useEffect(() => {
    Promise.all([
      getAnalyticsSummary(),
      getPerformanceOverTime(),
      getActionDistribution(),
      getProfitTrends(),
      getScorecard(),
    ]).then(([nextSummary, nextPerformance, nextDistribution, nextProfitTrends, nextScorecard]) => {
      setSummary(nextSummary);
      setPerformance(nextPerformance);
      setDistribution(nextDistribution);
      setProfitTrends(nextProfitTrends);
      setScorecard(nextScorecard);
    });
  }, []);

  return (
    <div className="space-y-6">
      <section className="panel">
        <h1 className="section-title">Analytics Dashboard</h1>
        <p className="section-copy">
          Review how the recommendation engine behaves over time, how often it chooses each action family, and how recent simulations are trending in profit and task performance.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="metric-card">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Simulation runs</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{summary?.total_runs ?? "--"}</p>
        </div>
        <div className="metric-card">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Average profit</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">${summary ? summary.avg_profit.toFixed(0) : "--"}</p>
        </div>
        <div className="metric-card">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Average service</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{summary ? `${Math.round(summary.avg_service_level * 100)}%` : "--"}</p>
        </div>
        <div className="metric-card">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Average backlog</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{summary ? summary.avg_backlog.toFixed(1) : "--"}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="panel h-[360px]">
          <p className="text-lg font-semibold text-slate-950">Performance over time</p>
          <div className="mt-4 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                <XAxis dataKey="label" stroke="#475569" />
                <YAxis stroke="#475569" />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#0f766e" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel h-[360px]">
          <p className="text-lg font-semibold text-slate-950">Action distribution</p>
          <div className="mt-4 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={distribution} dataKey="value" nameKey="label" innerRadius={52} outerRadius={88}>
                  {distribution.map((entry, index) => <Cell key={entry.label} fill={palette[index % palette.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="panel h-[360px]">
          <p className="text-lg font-semibold text-slate-950">Profit trend by simulation step</p>
          <div className="mt-4 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={profitTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                <XAxis dataKey="label" stroke="#475569" hide />
                <YAxis stroke="#475569" />
                <Tooltip />
                <Bar dataKey="value" fill="#0f172a" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel">
          <p className="text-lg font-semibold text-slate-950">Task scorecard</p>
          <div className="mt-4 space-y-4">
            {scorecard.map((item) => (
              <div key={item.task_id} className="rounded-[24px] border border-[var(--line)] bg-white/80 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">{item.task_id}</p>
                  <p className="text-2xl font-semibold text-slate-950">{item.score}%</p>
                </div>
                <div className="mt-3 h-3 rounded-full bg-slate-200">
                  <div className="h-3 rounded-full bg-[var(--accent)]" style={{ width: `${item.score}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
