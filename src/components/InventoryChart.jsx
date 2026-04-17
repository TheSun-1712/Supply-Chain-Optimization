import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function InventoryChart({ data }) {
  return (
    <section className="panel p-5 sm:p-6">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">Inventory Curve</p>
          <h3 className="mt-2 text-xl font-semibold text-white">30-day stochastic inventory path</h3>
        </div>
        <p className="text-sm text-slate-400">Backlog risk in red, central stock in blue, regional stock in amber.</p>
      </div>

      <div className="h-[360px] w-full">
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid stroke="rgba(148,163,184,0.12)" strokeDasharray="4 4" />
            <XAxis dataKey="day" stroke="#94a3b8" tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                background: "#020617",
                border: "1px solid rgba(148,163,184,0.14)",
                borderRadius: "18px",
                color: "#e2e8f0",
              }}
            />
            <Legend />
            <Line type="monotone" dataKey="backlog" name="Backlog" stroke="#f87171" strokeWidth={3} dot={false} />
            <Line
              type="monotone"
              dataKey="centralInv"
              name="Central Inventory"
              stroke="#22d3ee"
              strokeWidth={3}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="regionalInv"
              name="Regional Inventory"
              stroke="#fbbf24"
              strokeWidth={3}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
