import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";

export function LoginPage() {
  const { login, register, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && isAuthenticated) {
    return <Navigate to="/app/dashboard" replace />;
  }

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      if (mode === "login") {
        await login(username, password);
      } else {
        await register(username, password);
      }
      navigate("/app/dashboard", { replace: true });
    } catch (nextError) {
      setError(nextError.message || "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-xl">
        <p className="text-xs uppercase tracking-[0.32em] text-cyan-200/80">FlowSync</p>
        <h1 className="mt-4 text-3xl font-semibold text-white">Secure access</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Sign in to the operations console or create a new account to access simulation controls, logs, and the AI copilot.
        </p>

        <form className="mt-8 space-y-4" onSubmit={submit}>
          <input
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          <button
            className="w-full rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
            disabled={submitting}
            type="submit"
          >
            {submitting ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          className="mt-4 text-sm text-cyan-200 transition hover:text-cyan-100"
          onClick={() => setMode((current) => (current === "login" ? "register" : "login"))}
          type="button"
        >
          {mode === "login" ? "Need an account? Register" : "Already have an account? Sign in"}
        </button>

        <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          Default admin login: <span className="font-mono">admin / admin123</span>
        </div>
      </div>
    </div>
  );
}
