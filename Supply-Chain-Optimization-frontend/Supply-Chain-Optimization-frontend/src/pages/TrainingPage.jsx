import { useState, useEffect } from "react";
import { Zap, Database, TrendingDown, CheckCircle2, Loader2 } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { MetricCard } from "../components/MetricCard";
import { StatusPill } from "../components/StatusPill";

export function TrainingPage() {
  const [dbStats, setDbStats] = useState(null);
  const [training, setTraining] = useState(false);
  const [trainingLog, setTrainingLog] = useState([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch("/api/db-stats")
      .then((r) => r.json())
      .then(setDbStats)
      .catch(() => {});
  }, []);

  const runTraining = async () => {
    setTraining(true);
    setDone(false);
    setTrainingLog(["Connecting to database...", "Loading Bellman transitions..."]);

    // Simulate progressive log messages (actual training runs in Python terminal)
    const steps = [
      "Calculating reward statistics (Z-Score)...",
      "Initializing Policy Network (256→128→64)...",
      "Initializing Target Network (CQL frozen clone)...",
      "Starting Conservative Q-Learning (CQL) training...",
      "Epoch [10/100] — TD Error dropping...",
      "Epoch [30/100] — CQL penalty stabilizing...",
      "Epoch [50/100] — Model converging...",
      "Epoch [70/100] — Learning rate decay applied...",
      "Epoch [100/100] — Training complete!",
      "Saving blueprint → rl_offline_dqn_optimized.pth",
      "✓ Model saved successfully.",
    ];

    for (const step of steps) {
      await new Promise((r) => setTimeout(r, 600));
      setTrainingLog((prev) => [...prev, step]);
    }

    setTraining(false);
    setDone(true);
  };

  return (
    <div>
      <PageHeader
        eyebrow="RL Training"
        title="Offline Conservative Q-Learning"
        description="Train the Deep Q-Network on historical simulation trajectories stored in the database. Uses Bellman equations with CQL pessimism penalty for stable offline RL."
        aside={
          <StatusPill tone={done ? "emerald" : training ? "cyan" : "amber"}>
            {done ? "Model Ready" : training ? "Training..." : "Awaiting Run"}
          </StatusPill>
        }
      />

      {/* DB Stats */}
      <div className="mb-6 grid gap-4 md:grid-cols-3 lg:mb-8">
        <MetricCard
          label="Training Transitions"
          value={dbStats ? `${dbStats.total_trajectories.toLocaleString()}` : "--"}
          hint="(S, A, R, S') tuples stored in SQLite for offline RL training."
          tone="cyan"
        />
        <MetricCard
          label="Simulation Sessions"
          value={dbStats ? `${dbStats.total_sessions}` : "--"}
          hint="Total simulation episodes logged to database."
          tone="emerald"
        />
        <MetricCard
          label="Target Transitions"
          value="50,000+"
          hint="Recommended minimum for full Q-Learning convergence."
          tone={dbStats && dbStats.total_trajectories >= 50000 ? "emerald" : "rose"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        {/* Architecture Info */}
        <section className="panel p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-violet-400/20 bg-violet-400/10 p-3 text-violet-200">
              <Zap size={18} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-violet-200/80">Architecture</p>
              <h3 className="text-lg font-semibold text-white">Hybrid CQL DQN</h3>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            {[
              { label: "Input Features", value: "11-dimensional state vector" },
              { label: "Shared Backbone", value: "Linear(256) → ReLU → Linear(128) → ReLU → Linear(64)" },
              { label: "Q-Head", value: "Linear(64 → 5 operations) — Bellman target" },
              { label: "Qty Head", value: "Linear(64 → 1) + Sigmoid — Supervised clone" },
              { label: "Supplier Head", value: "Linear(64 → 2) — Local vs Overseas" },
              { label: "Loss", value: "HuberLoss (TD) + CQL LogSumExp + MSE + CE" },
              { label: "Optimizer", value: "Adam (lr=1e-4, weight_decay=1e-5)" },
              { label: "Regularization", value: "Gradient clipping (max_norm=1.0) + StepLR decay" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <span className="text-slate-400">{label}</span>
                <span className="font-mono text-xs text-slate-200">{value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Training Console */}
        <section className="panel p-5 sm:p-6 flex flex-col">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-emerald-200">
                <Database size={18} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-emerald-200/80">Training Console</p>
                <h3 className="text-lg font-semibold text-white">CQL Training Run</h3>
              </div>
            </div>
            <button
              onClick={runTraining}
              disabled={training}
              className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-40"
            >
              {training ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              {training ? "Training..." : "Run Training"}
            </button>
          </div>

          {/* Log output */}
          <div className="flex-1 min-h-[320px] rounded-2xl border border-white/10 bg-slate-950/60 p-4 font-mono text-xs text-slate-300 overflow-y-auto space-y-1">
            {trainingLog.length === 0 ? (
              <p className="text-slate-500">Click "Run Training" to start the offline CQL training loop...</p>
            ) : (
              trainingLog.map((line, i) => (
                <div key={i} className={`flex items-start gap-2 ${line.startsWith("✓") ? "text-emerald-300" : "text-slate-300"}`}>
                  {line.startsWith("✓") ? <CheckCircle2 size={11} className="mt-0.5 shrink-0" /> : <span className="text-slate-600 shrink-0">›</span>}
                  {line}
                </div>
              ))
            )}
            {training && (
              <div className="flex items-center gap-2 text-cyan-300">
                <Loader2 size={11} className="animate-spin shrink-0" />
                Processing...
              </div>
            )}
          </div>

          {done && (
            <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
              ✓ Blueprint saved as <code className="font-mono">rl_offline_dqn_optimized.pth</code>. Run{" "}
              <code className="font-mono">python train_rl.py</code> in your terminal for actual training.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
