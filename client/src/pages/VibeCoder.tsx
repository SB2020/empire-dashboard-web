import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Code2, Send, Loader2, Braces, FileCode, Cpu, Layers, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Streamdown } from "streamdown";
import { motion } from "framer-motion";

const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } } };

const codeTemplates = [
  { label: "Generate Code", prompt: "Generate production-quality code for the following requirement. Include proper error handling, types, and documentation: ", icon: FileCode, placeholder: "Describe the code you need..." },
  { label: "Code Review", prompt: "Review the following code for bugs, performance issues, security vulnerabilities, and style improvements. Provide specific, actionable feedback: ", icon: Braces, placeholder: "Paste code to review..." },
  { label: "Architecture", prompt: "Design a software architecture for the following system. Include component diagrams, data flow, technology choices, and scalability considerations: ", icon: Layers, placeholder: "Describe the system to architect..." },
  { label: "Neural Net", prompt: "Design a neural network architecture for the following ML task. Include layer specifications, training strategy, data pipeline, and optimization techniques: ", icon: Cpu, placeholder: "Describe the ML task..." },
];

export default function VibeCoder() {
  const { user } = useAuth();
  const [selectedMode, setSelectedMode] = useState(0);
  const [input, setInput] = useState("");
  const [latestResponse, setLatestResponse] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const history = trpc.agents.history.useQuery({ agentId: "karpathy", limit: 20 }, { enabled: !!user });
  const command = trpc.agents.command.useMutation({
    onSuccess: (data) => { setLatestResponse(data.response); history.refetch(); setInput(""); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || command.isPending) return;
    command.mutate({ agentId: "karpathy", message: codeTemplates[selectedMode].prompt + input.trim() });
  };

  const handleCopy = () => {
    if (latestResponse) { navigator.clipboard.writeText(latestResponse); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 p-1 md:p-2">
      <motion.div variants={fadeUp}>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl glass-elevated flex items-center justify-center glow-green">
            <Code2 className="h-5 w-5 text-neon-green" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-wider text-neon-green uppercase">Vibe Coder</h1>
            <p className="text-[10px] font-mono text-muted-foreground tracking-widest mt-0.5">ARCHITECT KARPATHY // SOFTWARE 2.0 EVOLUTION</p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {codeTemplates.map((mode, i) => {
          const ModeIcon = mode.icon;
          return (
            <motion.button
              key={mode.label}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedMode(i)}
              className={`p-4 text-left transition-all duration-400 ${
                selectedMode === i ? "glass-elevated glow-green" : "glass-panel"
              }`}
            >
              <ModeIcon className={`h-5 w-5 mb-2 ${selectedMode === i ? "text-neon-green" : "text-chrome-dim"}`} />
              <p className={`text-xs font-mono font-medium uppercase tracking-wider ${selectedMode === i ? "text-neon-green" : "text-muted-foreground"}`}>{mode.label}</p>
            </motion.button>
          );
        })}
      </motion.div>

      <motion.form variants={fadeUp} onSubmit={handleSubmit} className="space-y-3">
        <div className="glass-elevated edge-light p-5 glow-green">
          <h3 className="font-heading text-sm font-bold text-neon-green uppercase mb-4 tracking-wider">
            {codeTemplates[selectedMode].label} Protocol
          </h3>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={codeTemplates[selectedMode].placeholder}
            rows={6}
            className="w-full glass-panel border-neon-green/10 rounded-xl px-4 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-neon-green/30 resize-none mb-4 transition-all duration-300"
            style={{ boxShadow: 'none' }}
            disabled={command.isPending}
          />
          <Button type="submit" disabled={!input.trim() || command.isPending} className="glass-elevated text-neon-green hover:bg-neon-green/10 font-mono text-xs uppercase tracking-wider rounded-xl transition-all duration-300">
            {command.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Execute Vibe Code
          </Button>
        </div>
      </motion.form>

      {command.isPending && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-5 glow-green">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-neon-green" />
            <span className="text-sm font-mono text-neon-green tracking-wider">Vibe coding in progress...</span>
            <div className="shimmer h-4 w-32 rounded" />
          </div>
        </motion.div>
      )}

      {latestResponse && !command.isPending && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-elevated edge-light p-5 glow-green">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-neon-green" />
              <h3 className="font-heading text-sm font-bold text-neon-green uppercase tracking-wider">Karpathy Output</h3>
            </div>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleCopy} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-panel text-[10px] font-mono text-chrome-dim hover:text-neon-green transition-all duration-300" style={{ boxShadow: 'none' }}>
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </motion.button>
          </div>
          <div className="prose prose-invert prose-sm max-w-none text-sm"><Streamdown>{latestResponse}</Streamdown></div>
        </motion.div>
      )}

      {history.data && history.data.length > 0 && (
        <motion.div variants={fadeUp}>
          <h3 className="font-heading text-sm font-bold chrome-text uppercase mb-3 tracking-wider">Code Archive</h3>
          <div className="space-y-2">
            {history.data.slice(0, 10).map((cmd: any) => (
              <details key={cmd.id} className="glass-panel group">
                <summary className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-teal-glow/5 transition-all duration-300">
                  <span className={`h-2 w-2 rounded-full ${cmd.status === "completed" ? "bg-neon-green" : "bg-neon-red"}`} />
                  <span className="text-xs font-mono text-foreground/80 truncate flex-1">{cmd.command.substring(0, 100)}</span>
                  <span className="text-[10px] font-mono text-muted-foreground/40">{new Date(cmd.createdAt).toLocaleString()}</span>
                </summary>
                {cmd.response && (
                  <div className="px-5 pb-4 prose prose-invert prose-sm max-w-none text-sm border-t border-border/20 pt-3">
                    <Streamdown>{cmd.response}</Streamdown>
                  </div>
                )}
              </details>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
