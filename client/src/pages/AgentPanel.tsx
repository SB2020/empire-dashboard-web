import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { AGENTS } from "@shared/agents";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Code2,
  Music,
  Eye,
  FlaskConical,
  Zap,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowLeft,
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useState, useRef, useEffect } from "react";
import { Streamdown } from "streamdown";
import { motion, AnimatePresence } from "framer-motion";

const iconMap: Record<string, any> = { Shield, Code2, Music, Eye, FlaskConical };

const colorMap: Record<string, string> = {
  "neon-red": "text-neon-red",
  "neon-green": "text-neon-green",
  "neon-magenta": "text-neon-magenta",
  "neon-amber": "text-neon-amber",
  "neon-blue": "text-neon-blue",
  "neon-cyan": "text-neon-cyan",
};

const glowMap: Record<string, string> = {
  "neon-red": "glow-red",
  "neon-green": "glow-green",
  "neon-magenta": "glow-magenta",
  "neon-amber": "glow-amber",
  "neon-blue": "glow-blue",
  "neon-cyan": "glow-cyan",
};

export default function AgentPanel() {
  const params = useParams<{ agentId: string }>();
  const agentId = params.agentId || "";
  const agent = AGENTS[agentId];
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const history = trpc.agents.history.useQuery(
    { agentId, limit: 50 },
    { enabled: !!user && !!agent }
  );

  const command = trpc.agents.command.useMutation({
    onSuccess: () => {
      history.refetch();
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history.data, command.isPending]);

  if (!agent) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="font-mono text-muted-foreground">AGENT NOT FOUND</p>
      </div>
    );
  }

  const Icon = iconMap[agent.icon] || Zap;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || command.isPending) return;
    command.mutate({ agentId, message: input.trim() });
    setInput("");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-[calc(100vh-4rem)]"
    >
      {/* Agent Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={`p-4 glass-panel rounded-b-none border-b-0 ${glowMap[agent.color]}`}
      >
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setLocation("/")}
            className="p-2 rounded-lg glass-panel border-0 hover:bg-teal-glow/10 transition-all duration-300"
            style={{ boxShadow: 'none' }}
          >
            <ArrowLeft className="h-4 w-4 text-chrome-dim" />
          </motion.button>
          <div className={`p-2.5 rounded-xl glass-elevated ${glowMap[agent.color]}`}>
            <Icon className={`h-6 w-6 ${colorMap[agent.color]}`} />
          </div>
          <div className="flex-1">
            <h1 className={`font-heading text-lg font-bold tracking-wider uppercase ${colorMap[agent.color]}`}>
              {agent.name}
            </h1>
            <p className="text-[10px] font-mono text-muted-foreground tracking-wider">
              {agent.archetype} // {agent.directive}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-neon-green status-pulse" />
            <span className="text-[10px] font-mono text-neon-green/80 uppercase tracking-wider">Online</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3 ml-14">
          {agent.capabilities.map((cap) => (
            <span
              key={cap}
              className={`text-[9px] font-mono px-2 py-0.5 rounded-md glass-panel border-0 ${colorMap[agent.color]}`}
              style={{ boxShadow: 'none' }}
            >
              {cap}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {(!history.data || history.data.length === 0) && !command.isPending && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center justify-center h-full text-muted-foreground"
          >
            <div className={`h-20 w-20 rounded-2xl glass-elevated flex items-center justify-center mb-5 ${glowMap[agent.color]}`}>
              <Icon className={`h-10 w-10 opacity-40 ${colorMap[agent.color]}`} />
            </div>
            <p className="text-sm font-mono chrome-text tracking-wider">AWAITING ORDERS, MR. PRESIDENT</p>
            <p className="text-[10px] font-mono mt-2 text-muted-foreground/50 max-w-md text-center tracking-wide">
              {agent.directive}
            </p>
          </motion.div>
        )}

        <AnimatePresence>
          {history.data &&
            [...history.data].reverse().map((cmd: any, i: number) => (
              <motion.div
                key={cmd.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="space-y-3"
              >
                {/* User message */}
                <div className="flex justify-end">
                  <div className="max-w-[80%] p-3 rounded-xl glass-elevated glow-teal">
                    <p className="text-[10px] font-mono text-teal-glow mb-1 uppercase tracking-wider">
                      The President
                    </p>
                    <p className="text-sm text-foreground">{cmd.command}</p>
                  </div>
                </div>
                {/* Agent response */}
                {cmd.response && (
                  <div className="flex justify-start">
                    <div className={`max-w-[85%] p-3 rounded-xl glass-panel ${glowMap[agent.color]}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`text-[10px] font-mono ${colorMap[agent.color]} uppercase tracking-wider`}>
                          {agent.name}
                        </p>
                        {cmd.status === "completed" ? (
                          <CheckCircle2 className="h-3 w-3 text-neon-green/70" />
                        ) : (
                          <XCircle className="h-3 w-3 text-neon-red/70" />
                        )}
                      </div>
                      <div className="text-sm text-foreground prose prose-invert prose-sm max-w-none">
                        <Streamdown>{cmd.response}</Streamdown>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
        </AnimatePresence>

        {command.isPending && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className={`p-4 rounded-xl glass-panel ${glowMap[agent.color]}`}>
              <div className="flex items-center gap-3">
                <Loader2 className={`h-4 w-4 animate-spin ${colorMap[agent.color]}`} />
                <span className="text-xs font-mono text-muted-foreground tracking-wider">
                  Processing directive...
                </span>
                <div className="shimmer h-4 w-24 rounded" />
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        onSubmit={handleSubmit}
        className="p-4 glass-panel rounded-t-none border-t-0"
      >
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Issue directive to ${agent.name}...`}
            className="flex-1 glass-panel border-teal-glow/15 rounded-xl px-4 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-teal-glow/40 transition-all duration-300"
            style={{ boxShadow: 'none' }}
            disabled={command.isPending}
          />
          <Button
            type="submit"
            disabled={!input.trim() || command.isPending}
            className={`glass-elevated ${colorMap[agent.color]} hover:bg-teal-glow/10 font-mono text-xs uppercase tracking-wider rounded-xl px-5 transition-all duration-300`}
          >
            {command.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </motion.form>
    </motion.div>
  );
}
