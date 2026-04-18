import { BrainCircuit, Database, Factory, GitBranch, LayoutDashboard, Radar, Settings2, Newspaper } from "lucide-react";
import { useMemo } from "react";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";
import { useProducerAnalysisData } from "../hooks/useProducerAnalysisData.jsx";
import { formatTimestamp } from "../lib/formatters";

export function ImplementationPipelinePage() {
  const { generatedAt, intel } = useProducerAnalysisData();
  const signals = intel?.signals ?? [];
  const topSignal = signals[0];
  const severeSignals = signals.filter((signal) => Number(signal.severity || 0) >= 4).length;

  const workflowNodes = useMemo(() => {
    const hasCritical = severeSignals > 0;
    return [
      {
        id: "hub",
        x: 50,
        y: 50,
        title: "Control Tower",
        subtitle: "Orchestrates decisions",
        tone: "emerald",
        icon: Radar,
      },
      {
        id: "intel",
        x: 18,
        y: 20,
        title: "Producer Intel Feed",
        subtitle: `${signals.length || 0} live signals`,
        tone: "cyan",
        icon: Newspaper,
      },
      {
        id: "risk",
        x: 37,
        y: 18,
        title: "Risk Scoring",
        subtitle: topSignal?.region ?? "Global risk graph",
        tone: severeSignals > 0 ? "amber" : "cyan",
        icon: BrainCircuit,
      },
      {
        id: "rl",
        x: 64,
        y: 20,
        title: "RL Policy Engine",
        subtitle: "Train and recommend",
        tone: "emerald",
        icon: Settings2,
      },
      {
        id: "sim",
        x: 82,
        y: 38,
        title: "Simulation Runtime",
        subtitle: "Scenario execution",
        tone: "cyan",
        icon: Factory,
      },
      {
        id: "ui",
        x: 82,
        y: 64,
        title: "Ops Dashboards",
        subtitle: "Dashboard, Producer, Copilot",
        tone: "cyan",
        icon: LayoutDashboard,
      },
      {
        id: "action",
        x: 36,
        y: 78,
        title: "Execution Actions",
        subtitle: hasCritical ? "Mitigation in progress" : "Ready for trigger",
        tone: hasCritical ? "amber" : "emerald",
        icon: GitBranch,
      },
      {
        id: "store",
        x: 62,
        y: 82,
        title: "Logs and Database",
        subtitle: "Telemetry and outcomes",
        tone: "cyan",
        icon: Database,
      },
    ];
  }, [severeSignals, signals.length, topSignal?.region]);

  const workflowEdges = [
    { from: "intel", to: "risk", dashed: false },
    { from: "risk", to: "hub", dashed: false },
    { from: "hub", to: "rl", dashed: false },
    { from: "rl", to: "sim", dashed: false },
    { from: "sim", to: "ui", dashed: false },
    { from: "ui", to: "action", dashed: false },
    { from: "action", to: "store", dashed: false },
    { from: "store", to: "hub", dashed: true },
    { from: "store", to: "rl", dashed: true },
    { from: "sim", to: "store", dashed: true },
  ];

  const nodesById = useMemo(
    () => Object.fromEntries(workflowNodes.map((node) => [node.id, node])),
    [workflowNodes],
  );

  function nodeToneClasses(tone) {
    if (tone === "amber") return "border-amber-300/25 bg-amber-400/10";
    if (tone === "emerald") return "border-emerald-300/25 bg-emerald-400/10";
    return "border-cyan-300/25 bg-cyan-400/10";
  }

  return (
    <div>
      <PageHeader
        eyebrow="Implementation Pipeline"
        title="Execution workflow for producer risk response"
        description="A clean, actionable implementation flow from risk detection to closed-loop verification."
        aside={
          <div className="flex flex-col items-end gap-2">
            <StatusPill tone={severeSignals > 0 ? "amber" : "emerald"}>
              {severeSignals > 0 ? `${severeSignals} critical signals active` : "No critical signal active"}
            </StatusPill>
            <StatusPill tone="cyan">
              {generatedAt ? `Latest sync ${formatTimestamp(generatedAt)} UTC` : "Waiting for backend sync"}
            </StatusPill>
          </div>
        }
      />

      <section className="panel p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-cyan-200">
            <GitBranch size={18} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">Mind Map Workflow</p>
            <h3 className="text-lg font-semibold text-white">End-to-end project orchestration map</h3>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <div className="relative min-h-[680px] min-w-[980px] rounded-3xl border border-white/10 bg-[#050c1f]/80 p-4">
            <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none">
              <defs>
                <marker id="workflow-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L6,3 L0,6 z" fill="#7dd3fc" />
                </marker>
                <marker id="workflow-arrow-dashed" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L6,3 L0,6 z" fill="#fbbf24" />
                </marker>
              </defs>
              {workflowEdges.map((edge) => {
                const from = nodesById[edge.from];
                const to = nodesById[edge.to];
                if (!from || !to) return null;
                return (
                  <line
                    key={`${edge.from}-${edge.to}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={edge.dashed ? "#fbbf24" : "#7dd3fc"}
                    strokeWidth={edge.dashed ? 0.28 : 0.34}
                    strokeDasharray={edge.dashed ? "1.5 1.5" : "0"}
                    markerEnd={edge.dashed ? "url(#workflow-arrow-dashed)" : "url(#workflow-arrow)"}
                    opacity={0.95}
                  />
                );
              })}
            </svg>

            {workflowNodes.map((node) => {
              const Icon = node.icon;
              return (
                <article
                  key={node.id}
                  className={`absolute w-52 -translate-x-1/2 -translate-y-1/2 rounded-2xl border p-3 backdrop-blur ${nodeToneClasses(node.tone)}`}
                  style={{ left: `${node.x}%`, top: `${node.y}%` }}
                >
                  <div className="flex items-center gap-2">
                    <div className="rounded-xl border border-white/15 bg-slate-900/70 p-1.5 text-slate-100">
                      <Icon size={14} />
                    </div>
                    <p className="text-sm font-semibold text-slate-100">{node.title}</p>
                  </div>
                  <p className="mt-2 text-xs text-slate-300">{node.subtitle}</p>
                </article>
              );
            })}

            <div className="absolute bottom-3 left-3 flex items-center gap-3 rounded-full border border-white/10 bg-slate-950/70 px-3 py-1.5 text-[11px] text-slate-300">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-[2px] w-5 bg-cyan-300" /> Primary flow
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-[2px] w-5 border-t border-dashed border-amber-300" /> Feedback loop
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 panel p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-amber-200">
            <Radar size={18} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-amber-200/80">Current Focus</p>
            <h3 className="text-lg font-semibold text-white">Immediate implementation target</h3>
          </div>
        </div>
        <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-7 text-slate-300">
          {topSignal
            ? `Prioritize ${topSignal.region} disruption response. Main affected parts: ${(topSignal.affected_parts ?? []).slice(0, 4).join(", ") || "not available"}.`
            : "Waiting for live signal details to recommend a focused implementation target."}
        </p>
      </section>
    </div>
  );
}
