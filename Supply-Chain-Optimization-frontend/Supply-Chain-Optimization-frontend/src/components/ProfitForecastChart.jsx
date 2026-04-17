import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "../lib/formatters";

export function ProfitForecastChart({ data }) {
  return (
    <section className="panel p-5 sm:p-6">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.24em] text-emerald-200/80">Profit Forecast</p>
        <h3 className="mt-2 text-xl font-semibold text-white">Real-time profit vs agent prediction</h3>
      </div>

      <div className="h-[360px] w-full">
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid stroke="rgba(148,163,184,0.12)" strokeDasharray="4 4" />
            <XAxis dataKey="day" stroke="#94a3b8" tickLine={false} axisLine={false} />
            <YAxis
              stroke="#94a3b8"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
            />
            <Tooltip
              formatter={(value) => formatCurrency(value)}
              contentStyle={{
                background: "#020617",
                border: "1px solid rgba(148,163,184,0.14)",
                borderRadius: "18px",
                color: "#e2e8f0",
              }}
            />
            <Line type="monotone" dataKey="profit" name="Real-time Profit" stroke="#34d399" strokeWidth={3} dot={false} />
            <Line
              type="monotone"
              dataKey="forecast"
              name="Agent Prediction Forecast"
              stroke="#22d3ee"
              strokeWidth={3}
              strokeDasharray="8 8"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
