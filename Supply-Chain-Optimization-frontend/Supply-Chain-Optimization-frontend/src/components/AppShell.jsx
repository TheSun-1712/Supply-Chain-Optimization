import { Bot, Cpu, Database, GitBranch, Globe2, LayoutDashboard, LineChart } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";

const links = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/producer-dashboard", label: "Producer", icon: Globe2 },
  { to: "/app/implementation-pipeline", label: "Pipeline", icon: GitBranch },
  { to: "/app/machine-health", label: "Machine", icon: Cpu },
  { to: "/app/financials", label: "Financials", icon: LineChart },
  { to: "/app/logs", label: "Logs", icon: Database },
  { to: "/app/copilot", label: "AI Co-Pilot", icon: Bot },
];

export function AppShell() {
  const { user, logout } = useAuth();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--bg)] text-[var(--ink)]">
      <div className="pointer-events-none absolute inset-0 grid-surface opacity-20" />
      <div className="pointer-events-none absolute -left-20 top-16 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-emerald-400/8 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />

      {/* Mobile top nav */}
      <div className="sticky top-0 z-30 border-b border-[var(--line)] bg-[rgba(5,10,22,0.78)] px-4 py-4 backdrop-blur-xl lg:hidden">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--accent)]">Atlas Control</p>
            <p className="mt-1 text-sm text-slate-300">Agentic Suite</p>
          </div>
          <button
            className="rounded-xl border border-[var(--line)] bg-slate-900/70 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-slate-800"
            onClick={logout}
            type="button"
          >
            Log out
          </button>
        </div>
        <nav className="grid grid-cols-4 gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  "flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-medium transition",
                  isActive ? "bg-slate-800 text-white" : "bg-slate-900/60 text-slate-300",
                ].join(" ")
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      <aside className="hidden w-80 shrink-0 border-r border-[var(--line)] bg-[var(--panel-strong)]/85 p-6 backdrop-blur-xl lg:fixed lg:inset-y-0 lg:block">
        <div className="flex h-full flex-col">
          <div className="rounded-[28px] border border-[var(--line-strong)] bg-[var(--panel)] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--accent)]">Atlas Control</p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight text-slate-100">Supply chain intelligence for planners and operators.</h1>
            <p className="mt-4 text-sm leading-6 text-slate-300">
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
                      ? "bg-gradient-to-r from-cyan-400/25 to-blue-500/25 text-white shadow-[0_16px_30px_rgba(14,165,233,0.18)]"
                      : "text-slate-300 hover:bg-slate-800/70 hover:text-slate-100",
                  ].join(" ")
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto space-y-4">
            <div className="rounded-3xl border border-[var(--line)] bg-slate-900/55 p-4 backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Signed in</p>
              <p className="mt-2 text-sm font-semibold text-slate-100">{user?.username ?? "Unknown user"}</p>
              <button
                className="mt-4 rounded-2xl border border-[var(--line)] bg-slate-950/80 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800 hover:text-white"
                onClick={logout}
                type="button"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="relative z-10 lg:ml-80">
        <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[rgba(5,10,22,0.7)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center gap-3 overflow-x-auto px-4 py-4 sm:px-6 lg:px-8">
            {links.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  [
                    "whitespace-nowrap rounded-full border px-4 py-2 text-sm transition",
                    isActive
                      ? "border-cyan-300/45 bg-cyan-400/20 text-cyan-100"
                      : "border-[var(--line)] bg-slate-900/60 text-slate-300 hover:border-cyan-300/35",
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
