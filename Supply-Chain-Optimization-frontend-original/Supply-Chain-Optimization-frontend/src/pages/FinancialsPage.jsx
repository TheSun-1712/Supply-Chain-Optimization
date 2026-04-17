import { MetricCard } from "../components/MetricCard";
import { PageHeader } from "../components/PageHeader";
import { ProfitForecastChart } from "../components/ProfitForecastChart";
import { SeiStatusCard } from "../components/SeiStatusCard";
import { useProductionData } from "../hooks/useProductionData.jsx";
import { formatCurrency } from "../lib/formatters";

export function FinancialsPage() {
  const { inventory, seiStatus } = useProductionData();
  const latest = inventory.at(-1);
  const previous = inventory.at(-2);
  const delta = latest && previous ? latest.profit - previous.profit : 0;

  return (
    <div>
      <PageHeader
        eyebrow="Financials"
        title="Profit confidence and verification"
        description="Compare realized profit against the agent forecast, and monitor the Sei transaction that anchors the best-performing log."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3 lg:mb-8">
        <MetricCard
          label="Live Profit"
          value={latest ? formatCurrency(latest.profit) : "--"}
          hint="Current cumulative profit from the most recent simulation day."
          tone="emerald"
        />
        <MetricCard
          label="Forecast Bias"
          value={latest ? formatCurrency(latest.profit - latest.forecast) : "--"}
          hint="Difference between observed profit and agent expectation."
          tone="cyan"
        />
        <MetricCard
          label="Day-over-Day Change"
          value={latest ? formatCurrency(delta) : "--"}
          hint="Incremental profit change relative to the prior day."
          tone={delta >= 0 ? "emerald" : "rose"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.9fr]">
        <ProfitForecastChart data={inventory} />
        <SeiStatusCard status={seiStatus} />
      </div>
    </div>
  );
}
