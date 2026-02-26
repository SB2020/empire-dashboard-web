import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { AGENTS, AGENT_IDS } from "@shared/agents";
import {
  Users, Bot, Send, MessageSquare, TrendingUp, Globe,
  Shield, Eye, Radio, Zap, Hash, AtSign, Share2,
  ChevronRight, Newspaper, Sparkles, AlertTriangle,
  Activity, RefreshCw, Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { useAppLink } from "@/hooks/useAppLink";

type NetworkTab = "feed" | "agents" | "trends" | "monitor";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function SigintNetwork() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<NetworkTab>("feed");
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [agentResponse, setAgentResponse] = useState<string | null>(null);
  const { openLink } = useAppLink();

  const { data: commsData, refetch: refetchComms } = trpc.comms.recent.useQuery(
    { limit: 50 },
    { enabled: !!user, refetchInterval: 15000 }
  );
  const { data: socialTrends } = trpc.osint.socialTrends.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 120000,
  });
  const { data: channels } = trpc.comms.channels.useQuery(undefined, { enabled: !!user });

  const sendMessage = trpc.comms.send.useMutation({
    onSuccess: () => {
      refetchComms();
      toast.success("Message dispatched to agent network");
    },
  });

  const agentChat = trpc.agents.command.useMutation({
    onSuccess: (data) => {
      setAgentResponse(data.response);
      refetchComms();
    },
  });

  const handleSendToNetwork = () => {
    if (!messageInput.trim()) return;
    sendMessage.mutate({
      fromAgentId: "suntzu",
      toAgentId: "pliny",
      message: messageInput,
      channel: "general",
    });
    setMessageInput("");
  };

  const handleAgentCommand = (agentId: string, command: string) => {
    if (!command.trim()) return;
    agentChat.mutate({ agentId, message: command });
  };

  // Group messages by time
  const feedMessages = useMemo(() => {
    if (!commsData) return [];
    return [...commsData].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [commsData]);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between px-4 py-3 border-b border-purple-900/30 bg-black/40 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Share2 className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h1 className="font-mono text-sm font-bold tracking-widest text-purple-300 uppercase">SIGINT NETWORK</h1>
            <p className="text-[9px] font-mono text-zinc-600 tracking-widest">AGENT-MEDIATED SOCIAL INTELLIGENCE // CLASSIFIED</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400 font-mono">
            <Wifi className="w-3 h-3 mr-1" />{AGENT_IDS.length} AGENTS ONLINE
          </Badge>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => refetchComms()}>
            <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
          </Button>
        </div>
      </motion.div>

      {/* Tab Bar */}
      <motion.div variants={fadeUp} className="px-4 py-2 border-b border-purple-900/20 bg-black/20 shrink-0">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as NetworkTab)}>
          <TabsList className="bg-black/40 border border-purple-900/20">
            <TabsTrigger value="feed" className="text-[10px] font-mono data-[state=active]:bg-purple-900/30 data-[state=active]:text-purple-300">
              <Radio className="w-3 h-3 mr-1" />FEED
            </TabsTrigger>
            <TabsTrigger value="agents" className="text-[10px] font-mono data-[state=active]:bg-purple-900/30 data-[state=active]:text-purple-300">
              <Bot className="w-3 h-3 mr-1" />AGENTS
            </TabsTrigger>
            <TabsTrigger value="trends" className="text-[10px] font-mono data-[state=active]:bg-purple-900/30 data-[state=active]:text-purple-300">
              <TrendingUp className="w-3 h-3 mr-1" />TRENDS
            </TabsTrigger>
            <TabsTrigger value="monitor" className="text-[10px] font-mono data-[state=active]:bg-purple-900/30 data-[state=active]:text-purple-300">
              <Eye className="w-3 h-3 mr-1" />MONITOR
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === "feed" && (
            <motion.div
              key="feed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col"
            >
              {/* Message Input */}
              <div className="p-3 border-b border-purple-900/20 bg-black/20 shrink-0">
                <div className="flex gap-2">
                  <input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendToNetwork()}
                    placeholder="Broadcast to agent network..."
                    className="flex-1 bg-black/40 border border-purple-900/30 rounded px-3 py-2 text-xs font-mono text-zinc-300 placeholder:text-zinc-600 focus:border-purple-500/50 focus:outline-none"
                  />
                  <Button
                    size="sm"
                    onClick={handleSendToNetwork}
                    disabled={sendMessage.isPending || !messageInput.trim()}
                    className="bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30 text-[10px] font-mono"
                  >
                    <Send className="w-3 h-3 mr-1" />DISPATCH
                  </Button>
                </div>
              </div>

              {/* Feed */}
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-2">
                  {feedMessages.map((msg, i) => {
                    const agent = AGENTS[msg.fromAgent as keyof typeof AGENTS];
                    return (
                      <motion.div
                        key={msg.id || i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="p-3 rounded border border-purple-900/15 bg-purple-950/5 hover:bg-purple-900/10 transition-all"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-6 w-6 rounded bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-[10px]">
                            {agent?.icon || "🤖"}
                          </div>
                          <span className="text-[10px] font-mono font-bold text-purple-300">{agent?.name || msg.fromAgent}</span>
                          <Badge variant="outline" className="text-[8px] px-1 py-0 border-zinc-700/40 text-zinc-500 font-mono">
                            #{msg.channel}
                          </Badge>
                          {msg.priority === "critical" && (
                            <Badge variant="outline" className="text-[8px] px-1 py-0 border-red-500/40 text-red-400 font-mono animate-pulse">
                              CRITICAL
                            </Badge>
                          )}
                          <span className="text-[8px] font-mono text-zinc-600 ml-auto">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed">{msg.content}</p>
                      </motion.div>
                    );
                  })}
                  {feedMessages.length === 0 && (
                    <div className="text-center py-12">
                      <Radio className="w-8 h-8 text-purple-500/30 mx-auto mb-3" />
                      <p className="text-xs font-mono text-zinc-600">NETWORK SILENT — BROADCAST TO INITIATE</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </motion.div>
          )}

          {activeTab === "agents" && (
            <motion.div
              key="agents"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex overflow-hidden"
            >
              {/* Agent List */}
              <div className="w-64 border-r border-purple-900/20 bg-black/20 shrink-0">
                <ScrollArea className="h-full">
                  <div className="p-2 space-y-1">
                    {AGENT_IDS.map(id => {
                      const agent = AGENTS[id as keyof typeof AGENTS];
                      return (
                        <button
                          key={id}
                          onClick={() => { setSelectedAgent(id); setAgentResponse(null); }}
                          className={`w-full p-3 rounded text-left transition-all ${
                            selectedAgent === id
                              ? "bg-purple-900/20 border border-purple-500/30"
                              : "hover:bg-purple-900/10 border border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{agent.icon}</span>
                            <div>
                              <p className="text-xs font-mono font-bold text-zinc-300">{agent.name}</p>
                              <p className="text-[9px] font-mono text-zinc-600">{agent.archetype}</p>
                            </div>
                            <div className="ml-auto">
                              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              {/* Agent Chat */}
              <div className="flex-1 flex flex-col">
                {selectedAgent ? (
                  <>
                    <div className="p-3 border-b border-purple-900/20 bg-black/20 shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{AGENTS[selectedAgent as keyof typeof AGENTS]?.icon}</span>
                        <div>
                          <p className="text-xs font-mono font-bold text-zinc-300">
                            {AGENTS[selectedAgent as keyof typeof AGENTS]?.name}
                          </p>
                          <p className="text-[9px] font-mono text-zinc-600">
                            {AGENTS[selectedAgent as keyof typeof AGENTS]?.archetype} • RANK: {AGENTS[selectedAgent as keyof typeof AGENTS]?.rank === 1 ? 'STRATEGIC' : AGENTS[selectedAgent as keyof typeof AGENTS]?.rank === 2 ? 'DIVISION' : 'SPECIALIST'}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[8px] ml-auto border-emerald-500/40 text-emerald-400 font-mono">
                          ONLINE
                        </Badge>
                      </div>
                    </div>

                    <ScrollArea className="flex-1 p-4">
                      {agentResponse && (
                        <div className="p-4 rounded border border-purple-900/20 bg-purple-950/10">
                          <div className="text-xs text-zinc-300 prose-sm max-w-none">
                            <Streamdown>{agentResponse}</Streamdown>
                          </div>
                        </div>
                      )}
                      {agentChat.isPending && (
                        <div className="flex items-center gap-2 p-4">
                          <div className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
                          <span className="text-[10px] font-mono text-purple-400 animate-pulse">AGENT PROCESSING...</span>
                        </div>
                      )}
                      {!agentResponse && !agentChat.isPending && (
                        <div className="text-center py-12">
                          <Bot className="w-8 h-8 text-purple-500/30 mx-auto mb-3" />
                          <p className="text-xs font-mono text-zinc-600">SEND A COMMAND TO {AGENTS[selectedAgent as keyof typeof AGENTS]?.name.toUpperCase()}</p>
                        </div>
                      )}
                    </ScrollArea>

                    <div className="p-3 border-t border-purple-900/20 bg-black/20 shrink-0">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const input = (e.target as HTMLFormElement).elements.namedItem("cmd") as HTMLInputElement;
                          if (input.value.trim() && selectedAgent) {
                            handleAgentCommand(selectedAgent, input.value);
                            input.value = "";
                          }
                        }}
                        className="flex gap-2"
                      >
                        <input
                          name="cmd"
                          placeholder={`Command ${AGENTS[selectedAgent as keyof typeof AGENTS]?.name}...`}
                          className="flex-1 bg-black/40 border border-purple-900/30 rounded px-3 py-2 text-xs font-mono text-zinc-300 placeholder:text-zinc-600 focus:border-purple-500/50 focus:outline-none"
                        />
                        <Button
                          type="submit"
                          size="sm"
                          disabled={agentChat.isPending}
                          className="bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30 text-[10px] font-mono"
                        >
                          <Zap className="w-3 h-3 mr-1" />EXECUTE
                        </Button>
                      </form>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <Users className="w-10 h-10 text-purple-500/20 mx-auto mb-3" />
                      <p className="text-xs font-mono text-zinc-600">SELECT AN AGENT TO INTERACT</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "trends" && (
            <motion.div
              key="trends"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 overflow-hidden"
            >
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  <div className="text-[10px] font-mono text-purple-500 tracking-widest">
                    SOCIAL MEDIA TREND ANALYSIS — GLOBAL
                  </div>

                  {/* Trend Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(socialTrends || []).map((trend: any, i: number) => (
                      <motion.button
                        key={i}
                        onClick={() => trend.url !== "#" && openLink(trend.url, trend.topic)}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="p-3 rounded border border-purple-900/20 bg-purple-950/5 hover:bg-purple-900/15 hover:border-purple-700/30 transition-all group text-left"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline" className="text-[8px] px-1.5 py-0 border-purple-800/40 text-purple-400 font-mono">
                            {trend.platform}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-[8px] px-1 py-0 border-zinc-700/40 text-zinc-500 font-mono">
                              {trend.region}
                            </Badge>
                            <span className={`text-[8px] font-mono font-bold ${
                              trend.sentiment === "positive" ? "text-emerald-400" :
                              trend.sentiment === "negative" ? "text-red-400" :
                              trend.sentiment === "mixed" ? "text-amber-400" : "text-zinc-400"
                            }`}>
                              {(trend.sentiment || "").toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-zinc-300 font-medium group-hover:text-purple-200 transition-colors">
                          {trend.topic}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-zinc-500" />
                            <span className="text-[10px] font-mono text-zinc-500">
                              {(trend.volume || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="h-1 w-20 bg-zinc-800 rounded overflow-hidden">
                            <div
                              className="h-full bg-purple-500/60 rounded"
                              style={{ width: `${Math.min(100, (trend.volume || 0) / 5000)}%` }}
                            />
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>

                  {(!socialTrends || socialTrends.length === 0) && (
                    <div className="text-center py-12">
                      <TrendingUp className="w-8 h-8 text-purple-500/20 mx-auto mb-3" />
                      <p className="text-xs font-mono text-zinc-600">ANALYZING SOCIAL SIGNALS...</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </motion.div>
          )}

          {activeTab === "monitor" && (
            <motion.div
              key="monitor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 overflow-hidden"
            >
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  <div className="text-[10px] font-mono text-amber-500 tracking-widest">
                    PLATFORM MONITORING — CROSS-NETWORK SURVEILLANCE
                  </div>

                  {/* Channel Status Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {(channels || []).map((ch: any, i: number) => (
                      <motion.div
                        key={ch.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="p-3 rounded border border-cyan-900/20 bg-cyan-950/5"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Hash className="w-3 h-3 text-cyan-500" />
                          <span className="text-[10px] font-mono font-bold text-cyan-300 uppercase">{ch.id}</span>
                          <div className="ml-auto h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        </div>
                        <p className="text-[9px] text-zinc-500">{ch.description}</p>
                        <div className="flex items-center gap-1 mt-2">
                          <span className="text-[8px] font-mono text-zinc-600">{ch.agentCount} agents</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Agent Network Status */}
                  <div className="text-[10px] font-mono text-cyan-500 tracking-widest mt-6">
                    AGENT NETWORK STATUS
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {AGENT_IDS.map((id, i) => {
                      const agent = AGENTS[id as keyof typeof AGENTS];
                      return (
                        <motion.div
                          key={id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="p-3 rounded border border-cyan-900/15 bg-cyan-950/5 flex items-center gap-3"
                        >
                          <span className="text-xl">{agent.icon}</span>
                          <div className="flex-1">
                            <p className="text-xs font-mono font-bold text-zinc-300">{agent.name}</p>
                            <p className="text-[9px] font-mono text-zinc-600">{agent.archetype} • RANK {agent.rank}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {agent.domains.slice(0, 3).map(d => (
                                <Badge key={d} variant="outline" className="text-[7px] px-1 py-0 border-zinc-700/30 text-zinc-500 font-mono">{d}</Badge>
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[8px] font-mono text-emerald-400">ACTIVE</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
