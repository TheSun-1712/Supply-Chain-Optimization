import { Database, LayoutDashboard, LineChart, ShieldCheck } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

const links = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/financials", label: "Financials", icon: LineChart },
  { to: "/app/logs", label: "Logs", icon: Database },
];

export function AppShell() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/90 px-4 py-4 backdrop-blur-xl lg:hidden">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/80">FlowSync</p>
            <p className="mt-1 text-sm text-slate-400">Agentic Suite</p>
          </div>
          <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-2 text-cyan-200">
            <ShieldCheck size={18} />
          </div>
        </div>
        <nav className="grid grid-cols-3 gap-2">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  "flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-xs font-medium transition",
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

      <div className="fixed inset-y-0 left-0 hidden w-72 border-r border-white/10 bg-slate-950/90 px-6 py-8 backdrop-blur-xl lg:block">
        <div className="flex h-full flex-col">
          <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-5 shadow-glow">
            <div className="mb-3 flex items-center gap-3">
              <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-2 text-cyan-200">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/80">FlowSync</p>
                <h1 className="text-lg font-semibold">Agentic Suite</h1>
              </div>
            </div>
            <p className="text-sm leading-6 text-slate-300">
              Production scheduling, profit inference, and Sei-backed verification in one operational surface.
            </p>
          </div>

          <nav className="mt-8 space-y-2">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-slate-400 hover:bg-white/5 hover:text-white",
                  ].join(" ")
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto rounded-3xl border border-emerald-400/15 bg-emerald-400/10 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-emerald-200/80">Verification Loop</p>
            <p className="mt-2 text-sm text-slate-300">
              The highest-profit log is hashed with SHA-256 and anchored to Sei Atlantic-2 for immutable audit trails.
            </p>
          </div>
        </div>
      </div>

      <main className="min-h-screen lg:pl-72">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
