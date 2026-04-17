export function MetricCard({ label, value, hint, tone = "cyan" }) {
  const toneClasses = {
    cyan: "from-cyan-400/12 to-transparent text-cyan-200",
    amber: "from-amber-400/12 to-transparent text-amber-200",
    emerald: "from-emerald-400/12 to-transparent text-emerald-200",
    rose: "from-rose-400/12 to-transparent text-rose-200",
  };

  return (
    <div className={`panel bg-gradient-to-br ${toneClasses[tone]} p-5`}>
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{hint}</p>
    </div>
  );
}
