import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { AGENTS, AGENT_HIERARCHY } from "@shared/agents";
import {
  Shield,
  Code2,
  Music,
  Eye,
  FlaskConical,
  Zap,
  ArrowDown,
  ArrowRight,
  Network,
  Crown,
  Users,
  Send,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

const iconMap: Record<string, any> = { Shield, Code2, Music, Eye, FlaskConical };
const colorMap: Record<string, string> = {
  "neon-red": "text-neon-red",
  "neon-green": "text-neon-green",
  "neon-magenta": "text-neon-magenta",
  "neon-amber": "text-neon-amber",
  "neon-blue": "text-neon-blue",
  "neon-cyan": "text-neon-cyan",
};
const bgMap: Record<string, string> = {
  "neon-red": "bg-neon-red/10",
  "neon-green": "bg-neon-green/10",
  "neon-magenta": "bg-neon-magenta/10",
  "neon-amber": "bg-neon-amber/10",
  "neon-blue": "bg-neon-blue/10",
  "neon-cyan": "bg-neon-cyan/10",
};
const glowMap: Record<string, string> = {
  "neon-red": "glow-red",
  "neon-green": "glow-green",
  "neon-magenta": "glow-magenta",
  "neon-amber": "glow-amber",
  "neon-blue": "glow-blue",
  "neon-cyan": "glow-cyan",
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function HierarchyView() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [mission, setMission] = useState("");
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [coordinationResult, setCoordinationResult] = useState<any>(null);

  const coordinateMutation = trpc.agents.coordinate.useMutation({
    onSuccess: (data) => {
      setCoordinationResult(data);
      toast.success("Multi-agent operation complete");
    },
    onError: (err) => toast.error(err.message),
  });

  const agents = useMemo(() => Object.values(AGENTS), []);
  const commander = agents.find((a) => a.rank === AGENT_HIERARCHY.STRATEGIC_COMMAND);
  const divisionLeads = agents.filter((a) => a.rank === AGENT_HIERARCHY.DIVISION_LEAD);
  const specialists = agents.filter((a) => a.rank === AGENT_HIERARCHY.SPECIALIST);

  const toggleAgent = (id: string) => {
    setSelectedAgents((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const handleCoordinate = () => {
    if (!mission.trim()) return toast.error("Enter a mission directive");
    if (selectedAgents.length === 0) return toast.error("Select at least one agent");
    coordinateMutation.mutate({ mission, agentIds: selectedAgents });
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 p-1 md:p-2">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl glass-elevated flex items-center justify-center glow-cyan">
          <Network className="h-5 w-5 text-neon-cyan" />
        </div>
        <div>
          <h1 className="font-heading text-xl font-bold tracking-wider chrome-text-teal uppercase">
            Chain of Command
          </h1>
          <p className="text-[10px] font-mono text-muted-foreground tracking-widest">
            AGENT HIERARCHY // DELEGATION PROTOCOL // MULTI-AGENT OPS
          </p>
        </div>
      </motion.div>

      {/* Hierarchy Visualization */}
      <motion.div variants={fadeUp} className="space-y-4">
        {/* Strategic Command */}
        {commander && (
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="h-3 w-3 text-neon-amber" />
              <span className="text-[9px] font-mono text-neon-amber/60 uppercase tracking-widest">
                Strategic Command
              </span>
            </div>
            <AgentHierarchyCard agent={commander} onNavigate={() => setLocation(`/agent/${commander.id}`)} />
            <div className="flex items-center gap-1 my-3">
              <div className="h-8 w-px bg-gradient-to-b from-neon-amber/40 to-transparent" />
            </div>
            <div className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground/40">
              <ArrowDown className="h-3 w-3" />
              <span>DELEGATES TO</span>
              <ArrowDown className="h-3 w-3" />
            </div>
          </div>
        )}

        {/* Division Leads */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-3 w-3 text-neon-cyan" />
            <span className="text-[9px] font-mono text-neon-cyan/60 uppercase tracking-widest">
              Division Leads
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-4xl">
            {divisionLeads.map((agent) => (
              <AgentHierarchyCard
                key={agent.id}
                agent={agent}
                onNavigate={() => setLocation(`/agent/${agent.id}`)}
                showDelegation
              />
            ))}
          </div>
        </div>

        {/* Specialists */}
        {specialists.length > 0 && (
          <>
            <div className="flex items-center justify-center gap-1 text-[9px] font-mono text-muted-foreground/40">
              <ArrowDown className="h-3 w-3" />
              <span>REPORTS TO</span>
              <ArrowDown className="h-3 w-3" />
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-3 w-3 text-neon-green" />
                <span className="text-[9px] font-mono text-neon-green/60 uppercase tracking-widest">
                  Specialists
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                {specialists.map((agent) => (
                  <AgentHierarchyCard
                    key={agent.id}
                    agent={agent}
                    onNavigate={() => setLocation(`/agent/${agent.id}`)}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </motion.div>

      {/* Multi-Agent Coordination Console */}
      <motion.div variants={fadeUp} className="glass-elevated edge-light p-5">
        <div className="flex items-center gap-2 mb-4">
          <Send className="h-4 w-4 text-neon-amber" />
          <span className="text-xs font-heading font-bold tracking-wider text-neon-amber uppercase">
            Multi-Agent Coordination
          </span>
          <span className="text-[9px] font-mono text-muted-foreground ml-2">
            Sun Tzu orchestrates, agents execute in parallel
          </span>
        </div>

        {/* Agent Selection */}
        <div className="flex flex-wrap gap-2 mb-4">
          {agents.map((agent) => {
            const isSelected = selectedAgents.includes(agent.id);
            const Icon = iconMap[agent.icon] || Zap;
            return (
              <button
                key={agent.id}
                onClick={() => toggleAgent(agent.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono rounded-lg transition-all duration-300 ${
                  isSelected
                    ? `glass-panel ${colorMap[agent.color]} border-current/30`
                    : "text-muted-foreground hover:text-foreground border border-border/20 hover:border-border/40"
                }`}
              >
                <Icon className="h-3 w-3" />
                {agent.name.split(" ")[1]}
              </button>
            );
          })}
        </div>

        {/* Mission Input */}
        <div className="flex gap-2">
          <input
            value={mission}
            onChange={(e) => setMission(e.target.value)}
            placeholder="Enter mission directive for coordinated operation..."
            className="flex-1 glass-panel px-4 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-teal-glow/30 border-0"
            onKeyDown={(e) => e.key === "Enter" && handleCoordinate()}
          />
          <button
            onClick={handleCoordinate}
            disabled={coordinateMutation.isPending || !mission.trim() || selectedAgents.length === 0}
            className="glass-panel px-4 py-2.5 text-xs font-mono text-neon-amber hover:text-foreground transition-all disabled:opacity-40 flex items-center gap-2"
          >
            <Send className="h-3.5 w-3.5" />
            {coordinateMutation.isPending ? "COORDINATING..." : "EXECUTE"}
          </button>
        </div>

        {/* Coordination Results */}
        {coordinationResult && (
          <div className="mt-4 space-y-3">
            <div className="glass-panel p-4">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-3 w-3 text-neon-amber" />
                <span className="text-[10px] font-mono font-bold text-neon-amber uppercase">
                  Strategic Plan (Sun Tzu)
                </span>
              </div>
              <div className="text-xs text-foreground/80 prose-sm max-w-none">
                <Streamdown>{coordinationResult.plan}</Streamdown>
              </div>
            </div>
            {coordinationResult.results?.map((r: any, i: number) => {
              const agent = AGENTS[r.agentId];
              const Icon = iconMap[agent?.icon] || Zap;
              return (
                <div key={i} className="glass-panel p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`h-3 w-3 ${colorMap[agent?.color || "neon-cyan"]}`} />
                    <span className={`text-[10px] font-mono font-bold uppercase ${colorMap[agent?.color || "neon-cyan"]}`}>
                      {r.agentName || r.agentId}
                    </span>
                  </div>
                  <div className="text-xs text-foreground/80 prose-sm max-w-none">
                    <Streamdown>{r.response}</Streamdown>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function AgentHierarchyCard({
  agent,
  onNavigate,
  showDelegation = false,
}: {
  agent: (typeof AGENTS)[string];
  onNavigate: () => void;
  showDelegation?: boolean;
}) {
  const Icon = iconMap[agent.icon] || Zap;
  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onNavigate}
      className={`glass-panel edge-light p-4 text-left w-full ${glowMap[agent.color]} transition-all duration-500`}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg glass-elevated">
          <Icon className={`h-4 w-4 ${colorMap[agent.color]}`} />
        </div>
        <div className="min-w-0">
          <h3 className={`font-heading text-[11px] font-bold tracking-wider uppercase ${colorMap[agent.color]}`}>
            {agent.name}
          </h3>
          <p className="text-[9px] font-mono text-muted-foreground">{agent.directive}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[9px] font-mono mb-2">
        <span className="h-1.5 w-1.5 rounded-full bg-neon-green status-pulse" />
        <span className="text-muted-foreground">ONLINE</span>
        <span className="text-muted-foreground/40">|</span>
        <span className="text-muted-foreground">
          RANK {agent.rank === 1 ? "STRATEGIC" : agent.rank === 2 ? "DIVISION" : "SPECIALIST"}
        </span>
      </div>

      {showDelegation && agent.canDelegateTo.length > 0 && (
        <div className="flex items-center gap-1 text-[8px] font-mono text-muted-foreground/50 mt-1">
          <ArrowRight className="h-2.5 w-2.5" />
          <span>Delegates to: {agent.canDelegateTo.map((id) => AGENTS[id]?.name.split(" ")[1]).join(", ")}</span>
        </div>
      )}

      {agent.reportsTo && (
        <div className="flex items-center gap-1 text-[8px] font-mono text-muted-foreground/50 mt-0.5">
          <ArrowDown className="h-2.5 w-2.5 rotate-180" />
          <span>Reports to: {AGENTS[agent.reportsTo]?.name.split(" ")[1]}</span>
        </div>
      )}
    </motion.button>
  );
}
