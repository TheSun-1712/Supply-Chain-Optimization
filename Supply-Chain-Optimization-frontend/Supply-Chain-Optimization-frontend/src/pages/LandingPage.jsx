import { useEffect, useState } from "react";
import { ArrowRight, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { loadPlatformStats } from "../lib/api";

function formatK(num) {
  if (typeof num === "string") return num;
  if (!num && num !== 0) return "--";
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "k";
  }
  return num.toString();
}

export function LandingPage() {
  const [stats, setStats] = useState([]);

  useEffect(() => {
    loadPlatformStats().then(setStats);
  }, []);
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50">
      <div className="pointer-events-none absolute inset-0 grid-surface opacity-40" />
      <div className="pointer-events-none absolute left-[8%] top-20 h-56 w-56 rounded-full bg-cyan-400/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-16 right-[10%] h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-cyan-200/80">FlowSync</p>
            <p className="mt-2 text-sm text-slate-400">AI-driven production scheduling and simulation.</p>
          </div>
        </header>

        <div className="flex flex-1 items-center py-16">
          <div className="grid w-full gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <section className="animate-reveal">
              <p className="text-sm uppercase tracking-[0.36em] text-cyan-200/80">Agentic Operations Console</p>
              <h1 className="mt-4 max-w-4xl text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
                Schedule resilient production flows with <span className="text-gradient">RL-guided foresight</span>.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                Watch inventory drift across a noisy market, surface the most profitable policy, and
                optimize your operational record through intelligent, agentic decision making.
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Link
                  to="/app/dashboard"
                  className="inline-flex items-center justify-center gap-3 rounded-full bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  <Play size={16} />
                  Launch Agentic Suite
                </Link>
                <a
                  href="#platform-brief"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  View Platform Brief
                  <ArrowRight size={16} />
                </a>
              </div>
            </section>

            <section className="panel animate-float p-6 sm:p-8">
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-200/80">Operational Snapshot</p>
              <div className="mt-6 space-y-5">
                {stats.map((stat) => (
                  <div key={stat.label} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                    <p className="text-sm text-slate-400">{stat.label}</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{formatK(stat.value)}</p>
                  </div>
                ))}
                {stats.length === 0 && (
                  <div className="animate-pulse space-y-5">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-24 rounded-3xl bg-white/5" />
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        <section id="platform-brief" className="panel grid gap-6 p-6 lg:grid-cols-3 lg:p-8">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">SQLite</p>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              `simulation_logs` stores day-level RL outputs including inventories, action selections, and realized profits.
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">FastAPI</p>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              `/api/latest-run` hydrates the dashboard while the background engine simulates agent performance in real-time.
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">RL Intelligence</p>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Advanced Reinforcement Learning agents continuously evaluate supply chain risks and refine inventory policies.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
