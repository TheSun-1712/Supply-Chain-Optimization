import { ShieldCheck, TimerReset } from "lucide-react";
import { StatusPill } from "./StatusPill";
import { formatCurrency, formatTimestamp } from "../lib/formatters";

export function SeiStatusCard({ status }) {
  if (!status) {
    return null;
  }

  return (
    <section className="panel h-full p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">Verification Status</p>
          <h3 className="mt-2 text-xl font-semibold text-white">{status.network}</h3>
        </div>
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-cyan-200">
          <ShieldCheck size={20} />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <StatusPill tone="emerald">{status.state}</StatusPill>
        <span className="inline-flex items-center gap-2 text-sm text-slate-400">
          <TimerReset size={14} />
          {status.lastAnchoredAt ? `Anchored ${formatTimestamp(status.lastAnchoredAt)}` : "Awaiting best run"}
        </span>
      </div>

      <div className="mt-6 space-y-4 text-sm">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-slate-400">Best Step Profit</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-300">{formatCurrency(status.bestProfit)}</p>
        </div>
        <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4">
          <p className="text-slate-400 text-xs">The highest-profit simulation day is automatically flagged and anchored for immutable audit purposes.</p>
        </div>
      </div>
    </section>
  );
}
