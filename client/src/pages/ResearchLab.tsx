import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { FlaskConical, Send, Loader2, BookOpen, Atom, Brain, Microscope } from "lucide-react";
import { useState } from "react";
import { Streamdown } from "streamdown";
import { motion } from "framer-motion";

const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } } };

const researchModes = [
  { label: "Paper Analysis", prompt: "Analyze the following research topic and provide a comprehensive literature review with key findings, methodologies, and gaps in current research: ", icon: BookOpen, placeholder: "Enter a research topic or paste a paper abstract..." },
  { label: "First Principles", prompt: "Apply first principles reasoning to deconstruct the following problem. Break it down to fundamental truths and rebuild from the ground up: ", icon: Atom, placeholder: "Describe a complex problem to deconstruct..." },
  { label: "Knowledge Synthesis", prompt: "Synthesize knowledge across multiple domains to create a unified understanding of: ", icon: Brain, placeholder: "Enter a cross-disciplinary topic..." },
  { label: "Springer Mining", prompt: "Conduct a deep literature mining operation on Springer Nature publications related to: . Identify breakthrough papers, emerging paradigms, and actionable research insights.", icon: Microscope, placeholder: "Enter a scientific domain to mine..." },
];

export default function ResearchLab() {
  const { user } = useAuth();
  const [selectedMode, setSelectedMode] = useState(0);
  const [input, setInput] = useState("");
  const [latestResponse, setLatestResponse] = useState<string | null>(null);

  const history = trpc.agents.history.useQuery({ agentId: "oppenheimer", limit: 20 }, { enabled: !!user });
  const command = trpc.agents.command.useMutation({
    onSuccess: (data) => { setLatestResponse(data.response); history.refetch(); setInput(""); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || command.isPending) return;
    command.mutate({ agentId: "oppenheimer", message: researchModes[selectedMode].prompt + input.trim() });
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 p-1 md:p-2">
      <motion.div variants={fadeUp}>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl glass-elevated flex items-center justify-center glow-blue">
            <FlaskConical className="h-5 w-5 text-neon-blue" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-wider text-neon-blue uppercase">Research Lab</h1>
            <p className="text-[10px] font-mono text-muted-foreground tracking-widest mt-0.5">SCIENTIST OPPENHEIMER // KNOWLEDGE ACCELERATION PROTOCOL</p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {researchModes.map((mode, i) => {
          const ModeIcon = mode.icon;
          return (
            <motion.button key={mode.label} whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => setSelectedMode(i)} className={`p-4 text-left transition-all duration-400 ${selectedMode === i ? "glass-elevated glow-blue" : "glass-panel"}`}>
              <ModeIcon className={`h-5 w-5 mb-2 ${selectedMode === i ? "text-neon-blue" : "text-chrome-dim"}`} />
              <p className={`text-xs font-mono font-medium uppercase tracking-wider ${selectedMode === i ? "text-neon-blue" : "text-muted-foreground"}`}>{mode.label}</p>
            </motion.button>
          );
        })}
      </motion.div>

      <motion.form variants={fadeUp} onSubmit={handleSubmit} className="space-y-3">
        <div className="glass-elevated edge-light p-5 glow-blue">
          <h3 className="font-heading text-sm font-bold text-neon-blue uppercase mb-4 tracking-wider">{researchModes[selectedMode].label} Protocol</h3>
          <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder={researchModes[selectedMode].placeholder} rows={4} className="w-full glass-panel border-neon-blue/10 rounded-xl px-4 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-neon-blue/30 resize-none mb-4 transition-all duration-300" style={{ boxShadow: 'none' }} disabled={command.isPending} />
          <Button type="submit" disabled={!input.trim() || command.isPending} className="glass-elevated text-neon-blue hover:bg-neon-blue/10 font-mono text-xs uppercase tracking-wider rounded-xl transition-all duration-300">
            {command.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Execute Research
          </Button>
        </div>
      </motion.form>

      {command.isPending && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-5 glow-blue">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-neon-blue" />
            <span className="text-sm font-mono text-neon-blue tracking-wider">Mining knowledge repositories...</span>
            <div className="shimmer h-4 w-32 rounded" />
          </div>
        </motion.div>
      )}

      {latestResponse && !command.isPending && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-elevated edge-light p-5 glow-blue">
          <div className="flex items-center gap-2 mb-3">
            <FlaskConical className="h-4 w-4 text-neon-blue" />
            <h3 className="font-heading text-sm font-bold text-neon-blue uppercase tracking-wider">Research Briefing</h3>
          </div>
          <div className="prose prose-invert prose-sm max-w-none text-sm"><Streamdown>{latestResponse}</Streamdown></div>
        </motion.div>
      )}

      {history.data && history.data.length > 0 && (
        <motion.div variants={fadeUp}>
          <h3 className="font-heading text-sm font-bold chrome-text uppercase mb-3 tracking-wider">Research Archive</h3>
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
