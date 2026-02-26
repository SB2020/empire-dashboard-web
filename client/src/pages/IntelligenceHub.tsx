import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Eye, Send, Loader2, Target, TrendingUp, Globe, BarChart3 } from "lucide-react";
import { useState } from "react";
import { Streamdown } from "streamdown";
import { motion } from "framer-motion";

const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } } };

const quickActions = [
  { label: "Market Analysis", prompt: "Provide a comprehensive market analysis of the current AI industry landscape. Include key players, market trends, growth projections, and strategic opportunities.", icon: TrendingUp },
  { label: "Competitor Intel", prompt: "Conduct a competitive intelligence briefing on the top 5 AI companies. Analyze their strengths, weaknesses, recent moves, and potential vulnerabilities.", icon: Target },
  { label: "Trend Forecast", prompt: "Generate a strategic forecast of emerging technology trends for the next 12 months. Focus on AI, blockchain, quantum computing, and biotech. Include confidence levels.", icon: BarChart3 },
  { label: "OSINT Sweep", prompt: "Conduct an open-source intelligence sweep on current global technology policy changes, regulatory shifts, and geopolitical factors affecting the tech industry.", icon: Globe },
];

export default function IntelligenceHub() {
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [latestResponse, setLatestResponse] = useState<string | null>(null);

  const history = trpc.agents.history.useQuery({ agentId: "suntzu", limit: 20 }, { enabled: !!user });
  const command = trpc.agents.command.useMutation({
    onSuccess: (data) => { setLatestResponse(data.response); history.refetch(); setInput(""); },
  });

  const handleSubmit = (msg: string) => {
    if (!msg.trim() || command.isPending) return;
    command.mutate({ agentId: "suntzu", message: msg.trim() });
    setInput("");
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 p-1 md:p-2">
      <motion.div variants={fadeUp}>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl glass-elevated flex items-center justify-center glow-amber">
            <Eye className="h-5 w-5 text-neon-amber" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-wider text-neon-amber uppercase">Intelligence Hub</h1>
            <p className="text-[10px] font-mono text-muted-foreground tracking-widest mt-0.5">GENERAL SUN TZU // TOTAL INFORMATION AWARENESS</p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {quickActions.map((action, i) => {
          const ActionIcon = action.icon;
          return (
            <motion.button key={action.label} whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }} onClick={() => handleSubmit(action.prompt)} disabled={command.isPending} className="glass-panel edge-light p-4 text-left group glow-amber transition-all duration-400">
              <ActionIcon className="h-5 w-5 text-neon-amber mb-2 group-hover:scale-110 transition-transform duration-300" />
              <p className="text-xs font-mono font-medium text-neon-amber uppercase tracking-wider">{action.label}</p>
            </motion.button>
          );
        })}
      </motion.div>

      <motion.form variants={fadeUp} onSubmit={(e) => { e.preventDefault(); handleSubmit(input); }} className="flex gap-3">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Issue intelligence directive to General Sun Tzu..." className="flex-1 glass-panel border-neon-amber/10 rounded-xl px-4 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-neon-amber/30 transition-all duration-300" style={{ boxShadow: 'none' }} disabled={command.isPending} />
        <Button type="submit" disabled={!input.trim() || command.isPending} className="glass-elevated text-neon-amber hover:bg-neon-amber/10 font-mono text-xs uppercase tracking-wider rounded-xl transition-all duration-300">
          {command.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </motion.form>

      {command.isPending && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-5 glow-amber">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-neon-amber" />
            <span className="text-sm font-mono text-neon-amber tracking-wider">Gathering intelligence...</span>
            <div className="shimmer h-4 w-32 rounded" />
          </div>
        </motion.div>
      )}

      {latestResponse && !command.isPending && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-elevated edge-light p-5 glow-amber">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="h-4 w-4 text-neon-amber" />
            <h3 className="font-heading text-sm font-bold text-neon-amber uppercase tracking-wider">Intelligence Briefing</h3>
          </div>
          <div className="prose prose-invert prose-sm max-w-none text-sm"><Streamdown>{latestResponse}</Streamdown></div>
        </motion.div>
      )}

      {history.data && history.data.length > 0 && (
        <motion.div variants={fadeUp}>
          <h3 className="font-heading text-sm font-bold chrome-text uppercase mb-3 tracking-wider">Previous Briefings</h3>
          <div className="space-y-2">
            {history.data.slice(0, 10).map((cmd: any) => (
              <details key={cmd.id} className="glass-panel group">
                <summary className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-teal-glow/5 transition-all duration-300">
                  <span className={`h-2 w-2 rounded-full ${cmd.status === "completed" ? "bg-neon-green" : "bg-neon-red"}`} />
                  <span className="text-xs font-mono text-foreground/80 truncate flex-1">{cmd.command.substring(0, 100)}</span>
                  <span className="text-[10px] font-mono text-muted-foreground/40">{new Date(cmd.createdAt).toLocaleString()}</span>
                </summary>
                {cmd.response && (
                  <div className="px-5 pb-4 prose prose-invert prose-sm max-w-none text-sm border-t border-border/20 pt-3"><Streamdown>{cmd.response}</Streamdown></div>
                )}
              </details>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
