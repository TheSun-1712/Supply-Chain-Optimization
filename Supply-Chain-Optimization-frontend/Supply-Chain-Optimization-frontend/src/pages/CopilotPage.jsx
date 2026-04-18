import { useState, useRef, useEffect } from "react";
import { Bot, Send, Loader2, Sparkles } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/StatusPill";
import { apiPost } from "../lib/api";

export function CopilotPage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState("llama3:latest");
  const [analysisMode, setAnalysisMode] = useState("supply_chain");
  const [threads, setThreads] = useState({
    supply_chain: [
      {
        role: "assistant",
        content: "Hello! I'm your AI Supply Chain Co-Pilot. I have access to the live simulation state. Ask me about inventory levels, disruptions, strategy recommendations, or anything about the current run.",
      },
    ],
    producer_analysis: [
      {
        role: "assistant",
        content: "Hello! I can help with raw material procurement, assembly planning, component shortages, and upstream geopolitical risk.",
      },
    ],
  });
  const bottomRef = useRef(null);
  const messages = threads[analysisMode];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, analysisMode]);

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const activeMode = analysisMode;
    const userMsg = { role: "user", content: trimmed };
    setThreads((prev) => ({
      ...prev,
      [activeMode]: [...prev[activeMode], userMsg],
    }));
    setInput("");
    setLoading(true);

    try {
      const data = await apiPost("/chat", { message: trimmed, model, analysisMode: activeMode });
      setThreads((prev) => ({
        ...prev,
        [activeMode]: [...prev[activeMode], { role: "assistant", content: data.reply }],
      }));
    } catch (error) {
      setThreads((prev) => ({
        ...prev,
        [activeMode]: [
          ...prev[activeMode],
          { role: "assistant", content: `Error: ${error?.message || "Could not reach Ollama. Make sure it is running on port 11434."}` },
        ],
      }));
    }
    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <PageHeader
        eyebrow="AI Co-Pilot"
        title="Live simulation analyst"
        description="Ask natural language questions about the running simulation. The AI reads live state data: inventory, weather, routes, profit, and more."
        aside={
          <div className="flex flex-wrap gap-3">
            <select
              value={analysisMode}
              onChange={(e) => setAnalysisMode(e.target.value)}
              className="rounded-full border border-white/10 bg-slate-900/70 px-4 py-2 text-sm text-slate-200 backdrop-blur-xl focus:outline-none focus:ring-1 focus:ring-cyan-400"
            >
              <option value="supply_chain">Supply Chain Analysis</option>
              <option value="producer_analysis">Producer Analysis</option>
            </select>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="rounded-full border border-white/10 bg-slate-900/70 px-4 py-2 text-sm text-slate-200 backdrop-blur-xl focus:outline-none focus:ring-1 focus:ring-cyan-400"
            >
              <option value="llama3:latest">Llama 3 (Recommended)</option>
              <option value="qwen3.5:latest">Qwen 3.5</option>
            </select>
          </div>
        }
      />

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto panel p-5 sm:p-6 space-y-4 mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="mt-1 shrink-0 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-2 text-cyan-200 h-fit">
                <Sparkles size={14} />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-3xl px-5 py-3 text-sm leading-7 ${
                msg.role === "user"
                  ? "bg-cyan-400/10 border border-cyan-400/20 text-white"
                  : "bg-white/5 border border-white/10 text-slate-300"
              }`}
            >
              {msg.content}
            </div>
            {msg.role === "user" && (
              <div className="mt-1 shrink-0 rounded-2xl border border-slate-600 bg-slate-800 p-2 text-slate-300 h-fit">
                <Bot size={14} />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="mt-1 shrink-0 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-2 text-cyan-200">
              <Loader2 size={14} className="animate-spin" />
            </div>
            <div className="rounded-3xl bg-white/5 border border-white/10 px-5 py-3 text-sm text-slate-400">
              Analyzing simulation state...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="panel p-3 flex gap-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={analysisMode === "supply_chain" ? "Ask about inventory, disruptions, strategy... (Enter to send)" : "Ask about procurement, assembly, and upstream risk... (Enter to send)"}
          rows={2}
          className="flex-1 resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="self-end inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-40"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
