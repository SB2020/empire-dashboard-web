import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { AGENTS } from "../../../shared/agents";
import {
  Radio, Send, MessageSquare, Zap, Shield, AlertTriangle,
  Loader2, Filter, ChevronDown, Hash, Users, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const stagger = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

const priorityColors: Record<string, string> = {
  critical: "text-red-400 bg-red-500/10 border-red-500/30",
  high: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  normal: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  low: "text-muted-foreground bg-white/5 border-white/10",
};

const typeIcons: Record<string, typeof Zap> = {
  request: Send,
  response: MessageSquare,
  alert: AlertTriangle,
  intel: Shield,
  handoff: ArrowRight,
};

function AgentBadge({ agentId }: { agentId: string }) {
  const agent = AGENTS[agentId];
  if (!agent && agentId === "president") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30">
        PRESIDENT
      </span>
    );
  }
  if (!agent && agentId === "broadcast") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-purple-500/10 text-purple-400 border border-purple-500/30">
        ALL AGENTS
      </span>
    );
  }
  const colorMap: Record<string, string> = {
    "neon-amber": "bg-amber-500/10 text-amber-400 border-amber-500/30",
    "neon-red": "bg-red-500/10 text-red-400 border-red-500/30",
    "neon-green": "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    "neon-magenta": "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30",
    "neon-blue": "bg-blue-500/10 text-blue-400 border-blue-500/30",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase border ${colorMap[agent?.color || ""] || "bg-white/5 text-muted-foreground border-white/10"}`}>
      {agent?.name?.split(" ").pop() || agentId}
    </span>
  );
}

export default function AgentComms() {
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [directMsg, setDirectMsg] = useState("");
  const [fromAgent, setFromAgent] = useState("suntzu");
  const [toAgent, setToAgent] = useState("pliny");
  const [filterPriority, setFilterPriority] = useState<string | null>(null);

  const channelsQuery = trpc.comms.channels.useQuery();
  const recentQuery = trpc.comms.recent.useQuery({ limit: 200 });
  const channelQuery = trpc.comms.channelMessages.useQuery(
    { channelId: selectedChannel || "missions", limit: 100 },
    { enabled: !!selectedChannel }
  );

  const broadcastMutation = trpc.comms.broadcast.useMutation({
    onSuccess: () => {
      toast.success("Broadcast sent to all agents");
      setBroadcastMsg("");
      recentQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const sendMutation = trpc.comms.send.useMutation({
    onSuccess: (data) => {
      toast.success(`Message sent. ${toAgent.toUpperCase()} responded.`);
      setDirectMsg("");
      recentQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const messages = selectedChannel ? (channelQuery.data || []) : (recentQuery.data || []);
  const filteredMessages = useMemo(() => {
    if (!filterPriority) return messages;
    return messages.filter((m: any) => m.priority === filterPriority);
  }, [messages, filterPriority]);

  const channels = channelsQuery.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div {...stagger} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl glass-elevated flex items-center justify-center glow-teal">
            <Radio className="h-6 w-6 text-neon-cyan" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold tracking-wider chrome-text-teal uppercase">
              Agent Comms
            </h1>
            <p className="text-xs font-mono text-muted-foreground tracking-wider">
              INTER-AGENT COMMUNICATION BUS // ENCRYPTED CHANNELS
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-mono text-emerald-400">{messages.length} MESSAGES</span>
        </div>
      </motion.div>

      {/* Channel Selector + Broadcast */}
      <motion.div {...stagger} transition={{ delay: 0.1 }} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Channels */}
        <div className="glass-elevated edge-light p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-teal-glow" />
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Channels</span>
          </div>
          <button
            onClick={() => setSelectedChannel(null)}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition-all ${!selectedChannel ? "glass-panel text-neon-cyan border border-teal-glow/30" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}
          >
            ALL CHANNELS
          </button>
          {channels.map((ch: any) => (
            <button
              key={ch.id}
              onClick={() => setSelectedChannel(ch.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition-all ${selectedChannel === ch.id ? "glass-panel text-neon-cyan border border-teal-glow/30" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}
            >
              <div className="flex items-center justify-between">
                <span>#{ch.id.toUpperCase()}</span>
                <span className="text-[10px] text-muted-foreground/50">{ch.messageCount}</span>
              </div>
              <p className="text-[10px] text-muted-foreground/50 mt-0.5">{ch.description}</p>
            </button>
          ))}
        </div>

        {/* Broadcast Panel */}
        <div className="glass-elevated edge-light p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-neon-amber" />
            <span className="text-xs font-mono text-neon-amber uppercase tracking-widest">Broadcast</span>
          </div>
          <textarea
            value={broadcastMsg}
            onChange={(e) => setBroadcastMsg(e.target.value)}
            placeholder="Message all agents simultaneously..."
            className="w-full h-24 p-3 rounded-lg glass-panel border-border/30 bg-transparent text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-teal-glow/50 resize-none"
          />
          <Button
            onClick={() => broadcastMutation.mutate({ message: broadcastMsg })}
            disabled={!broadcastMsg.trim() || broadcastMutation.isPending}
            className="w-full glass-panel border-amber-500/30 text-neon-amber hover:text-foreground font-mono text-xs uppercase tracking-wider"
          >
            {broadcastMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Radio className="h-4 w-4 mr-2" />}
            Broadcast to All
          </Button>
        </div>

        {/* Direct Message */}
        <div className="glass-elevated edge-light p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-neon-cyan" />
            <span className="text-xs font-mono text-neon-cyan uppercase tracking-widest">Direct Comms</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">From</label>
              <select
                value={fromAgent} onChange={(e) => setFromAgent(e.target.value)}
                className="w-full h-8 px-2 rounded glass-panel border-border/30 bg-transparent text-xs font-mono text-foreground"
              >
                {Object.values(AGENTS).map((a) => (
                  <option key={a.id} value={a.id} className="bg-[#0a0f1a]">{a.name.split(" ").pop()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">To</label>
              <select
                value={toAgent} onChange={(e) => setToAgent(e.target.value)}
                className="w-full h-8 px-2 rounded glass-panel border-border/30 bg-transparent text-xs font-mono text-foreground"
              >
                {Object.values(AGENTS).map((a) => (
                  <option key={a.id} value={a.id} className="bg-[#0a0f1a]">{a.name.split(" ").pop()}</option>
                ))}
              </select>
            </div>
          </div>
          <textarea
            value={directMsg}
            onChange={(e) => setDirectMsg(e.target.value)}
            placeholder="Direct agent-to-agent message..."
            className="w-full h-16 p-3 rounded-lg glass-panel border-border/30 bg-transparent text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-teal-glow/50 resize-none"
          />
          <Button
            onClick={() => sendMutation.mutate({ fromAgentId: fromAgent, toAgentId: toAgent, message: directMsg })}
            disabled={!directMsg.trim() || sendMutation.isPending}
            className="w-full glass-panel border-teal-glow/30 text-neon-cyan hover:text-foreground font-mono text-xs uppercase tracking-wider"
          >
            {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Send Direct
          </Button>
        </div>
      </motion.div>

      {/* Priority Filter */}
      <motion.div {...stagger} transition={{ delay: 0.2 }} className="flex items-center gap-2">
        <Filter className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Filter:</span>
        {["critical", "high", "normal", "low"].map((p) => (
          <button
            key={p}
            onClick={() => setFilterPriority(filterPriority === p ? null : p)}
            className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase border transition-all ${filterPriority === p ? priorityColors[p] : "text-muted-foreground/50 border-transparent hover:border-white/10"}`}
          >
            {p}
          </button>
        ))}
        {filterPriority && (
          <button onClick={() => setFilterPriority(null)} className="text-[10px] font-mono text-muted-foreground hover:text-foreground ml-2">
            Clear
          </button>
        )}
      </motion.div>

      {/* Message Feed */}
      <motion.div {...stagger} transition={{ delay: 0.3 }} className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
            {selectedChannel ? `#${selectedChannel.toUpperCase()}` : "ALL CHANNELS"} — {filteredMessages.length} messages
          </span>
          <button onClick={() => { recentQuery.refetch(); channelQuery.refetch(); }} className="text-[10px] font-mono text-teal-glow hover:underline">
            REFRESH
          </button>
        </div>

        <AnimatePresence mode="popLayout">
          {filteredMessages.map((msg: any, i: number) => {
            const TypeIcon = typeIcons[msg.messageType] || MessageSquare;
            return (
              <motion.div
                key={msg.id || i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ delay: i * 0.02, duration: 0.3 }}
                className={`glass-panel p-3 border-l-2 ${msg.priority === "critical" ? "border-l-red-500" : msg.priority === "high" ? "border-l-amber-500" : msg.priority === "normal" ? "border-l-blue-500" : "border-l-white/10"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <TypeIcon className="h-3 w-3 text-muted-foreground" />
                  <AgentBadge agentId={msg.fromAgent} />
                  <ArrowRight className="h-3 w-3 text-muted-foreground/30" />
                  <AgentBadge agentId={msg.toAgent} />
                  <span className={`px-1.5 py-0 rounded text-[9px] font-mono uppercase border ${priorityColors[msg.priority] || ""}`}>
                    {msg.priority}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground/40 ml-auto">
                    {msg.channel && `#${msg.channel}`} • {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-xs text-foreground font-mono pl-5">{msg.content}</p>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredMessages.length === 0 && (
          <div className="glass-panel p-8 text-center">
            <Radio className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm font-mono text-muted-foreground">No messages yet. Send a command to an agent to start the comms bus.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
