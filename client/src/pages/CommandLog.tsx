import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { AGENTS } from "@shared/agents";
import { ScrollText, CheckCircle2, XCircle, Clock, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Streamdown } from "streamdown";
import { motion } from "framer-motion";

const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } } };

const colorMap: Record<string, string> = {
  "neon-red": "text-neon-red", "neon-green": "text-neon-green", "neon-magenta": "text-neon-magenta",
  "neon-amber": "text-neon-amber", "neon-blue": "text-neon-blue", "neon-cyan": "text-neon-cyan",
};

const glowMap: Record<string, string> = {
  "neon-red": "glow-red", "neon-green": "glow-green", "neon-magenta": "glow-magenta",
  "neon-amber": "glow-amber", "neon-blue": "glow-blue", "neon-cyan": "glow-cyan",
};

export default function CommandLog() {
  const { user } = useAuth();
  const commands = trpc.commandLog.recent.useQuery({ limit: 100 }, { enabled: !!user });

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 p-1 md:p-2">
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl glass-elevated flex items-center justify-center">
              <ScrollText className="h-5 w-5 text-chrome-dim" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold tracking-wider chrome-text uppercase">Command Log</h1>
              <p className="text-[10px] font-mono text-muted-foreground tracking-widest mt-0.5">UNIFIED OPERATIONS FEED // ALL DIVISIONS</p>
            </div>
          </div>
        </div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button onClick={() => commands.refetch()} disabled={commands.isRefetching} className="glass-elevated text-chrome-dim hover:bg-teal-glow/10 font-mono text-xs uppercase tracking-wider rounded-xl">
            {commands.isRefetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </motion.div>
      </motion.div>

      {commands.data && commands.data.length > 0 ? (
        <div className="space-y-2">
          {commands.data.map((cmd: any, i: number) => {
            const agent = AGENTS[cmd.agentId];
            const agentColor = agent?.color || "neon-cyan";
            return (
              <motion.details key={cmd.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className={`glass-panel group ${glowMap[agentColor] || ""}`}>
                <summary className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-teal-glow/5 transition-all duration-300">
                  <div className="flex items-center gap-2 shrink-0">
                    {cmd.status === "completed" ? <CheckCircle2 className="h-4 w-4 text-neon-green/70" /> : cmd.status === "failed" ? <XCircle className="h-4 w-4 text-neon-red/70" /> : <Clock className="h-4 w-4 text-neon-amber status-pulse" />}
                  </div>
                  <span className={`text-[10px] font-heading font-bold uppercase tracking-wider w-28 shrink-0 ${colorMap[agentColor] || "text-neon-cyan"}`}>
                    {agent?.name?.split(" ").pop() || cmd.agentId}
                  </span>
                  <span className="text-xs font-mono text-foreground/80 truncate flex-1">{cmd.command.substring(0, 120)}</span>
                  <span className="text-[10px] font-mono text-muted-foreground/40 shrink-0">{new Date(cmd.createdAt).toLocaleString()}</span>
                </summary>
                <div className="px-5 pb-4 border-t border-border/20">
                  <div className="mt-3 mb-2">
                    <p className="text-[10px] font-mono text-teal-glow uppercase mb-1 tracking-wider">Directive</p>
                    <p className="text-sm text-foreground/80">{cmd.command}</p>
                  </div>
                  {cmd.response && (
                    <div className="mt-3">
                      <p className={`text-[10px] font-mono uppercase mb-1 tracking-wider ${colorMap[agentColor] || "text-neon-cyan"}`}>Response</p>
                      <div className="prose prose-invert prose-sm max-w-none text-sm p-4 rounded-xl glass-elevated">
                        <Streamdown>{cmd.response}</Streamdown>
                      </div>
                    </div>
                  )}
                </div>
              </motion.details>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground glass-panel">
          <div className="h-16 w-16 rounded-2xl glass-elevated flex items-center justify-center mb-4">
            <ScrollText className="h-8 w-8 opacity-20" />
          </div>
          <p className="text-sm font-mono chrome-text tracking-wider">NO OPERATIONS LOGGED</p>
          <p className="text-[10px] font-mono mt-2 text-muted-foreground/50 tracking-wide">Issue directives to agents to populate the command log</p>
        </div>
      )}
    </motion.div>
  );
}
