import { Bot, Database, Globe2, LayoutDashboard, LineChart, ShieldCheck } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";

const links = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/producer-dashboard", label: "Producer", icon: Globe2 },
  { to: "/app/financials", label: "Financials", icon: LineChart },
  { to: "/app/logs", label: "Logs", icon: Database },
  { to: "/app/copilot", label: "AI Co-Pilot", icon: Bot },
];

export function AppShell() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Mobile top nav */}
      <div className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/90 px-4 py-4 backdrop-blur-xl lg:hidden">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/80">FlowSync</p>
            <p className="mt-1 text-sm text-slate-400">Agentic Suite</p>
          </div>
        </div>
        <nav className="grid grid-cols-5 gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  "flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-medium transition",
                  isActive ? "bg-white/10 text-white" : "bg-white/[0.03] text-slate-400",
                ].join(" ")
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <aside className="hidden w-80 shrink-0 border-r border-[var(--line)] bg-[var(--panel-strong)]/90 p-6 lg:fixed lg:inset-y-0 lg:block">
        <div className="flex h-full flex-col">
          <div className="rounded-[28px] border border-[var(--line-strong)] bg-[var(--panel)] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--accent)]">Atlas Control</p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight text-slate-950">Supply chain intelligence for planners and operators.</h1>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Offline RL recommendations, scenario stress testing, and simulation replay in one SaaS workspace.
            </p>
          </div>

          <nav className="mt-8 space-y-2">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition",
                    isActive
                      ? "bg-slate-950 text-white shadow-[0_16px_30px_rgba(15,23,42,0.18)]"
                      : "text-slate-700 hover:bg-white hover:text-slate-950",
                  ].join(" ")
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto space-y-4">
            <div className="rounded-[28px] border border-[var(--line)] bg-white/90 p-5">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Decision Engine</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">CQL hybrid policy</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Shared layers 256-&gt;128-&gt;64 with action, quantity, and supplier heads driving recommendation and simulation loops.
              </p>
            </div>

            <div className="rounded-3xl border border-[var(--line)] bg-white/90 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Signed in</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">{user?.username ?? "Unknown user"}</p>
              <button
                className="mt-4 rounded-2xl border border-[var(--line)] bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
                onClick={logout}
                type="button"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-80">
        <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[rgba(246,243,235,0.82)] backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center gap-3 overflow-x-auto px-4 py-4 sm:px-6 lg:px-8">
            {links.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  [
                    "whitespace-nowrap rounded-full border px-4 py-2 text-sm transition",
                    isActive
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-[var(--line)] bg-white/80 text-slate-700 hover:border-slate-400",
                  ].join(" ")
                }
              >
                {label}
              </NavLink>
            ))}
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
