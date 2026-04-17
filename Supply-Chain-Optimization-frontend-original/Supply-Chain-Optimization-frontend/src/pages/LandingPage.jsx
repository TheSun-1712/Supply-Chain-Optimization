import { ArrowRight, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { landingStats } from "../data/mockData";

export function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50">
      <div className="pointer-events-none absolute inset-0 grid-surface opacity-40" />
      <div className="pointer-events-none absolute left-[8%] top-20 h-56 w-56 rounded-full bg-cyan-400/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-16 right-[10%] h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-cyan-200/80">FlowSync</p>
            <p className="mt-2 text-sm text-slate-400">AI production scheduling with cryptographic proof.</p>
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
                Watch inventory drift across a noisy market, surface the most profitable policy, and anchor the top log
                on Sei Atlantic-2 for an immutable operational record.
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
                {landingStats.map((stat) => (
                  <div key={stat.label} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                    <p className="text-sm text-slate-400">{stat.label}</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{stat.value}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        <section id="platform-brief" className="panel grid gap-6 p-6 lg:grid-cols-3 lg:p-8">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">SQLite</p>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              `simulation_logs` stores day-level RL outputs including inventories, action selections, profits, and hash references.
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">FastAPI</p>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              `/api/latest-run` hydrates the dashboard while a background task hashes the highest-profit record and posts to Sei.
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">Sei Atlantic-2</p>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              The best policy run receives a SHA-256 proof and transaction status, making the top-performing log auditable.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
