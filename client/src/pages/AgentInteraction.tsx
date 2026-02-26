import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  Bot, Send, Zap, Image, Target, FileText, Share2, Radar,
  ShieldAlert, Loader2, ChevronRight, Sparkles, MessageSquare,
  User, Clock, ArrowRight
} from "lucide-react";

interface ChatMessage {
  role: "user" | "agent";
  content: string;
  agentName?: string;
  suggestedActions?: string[];
  timestamp: Date;
}

const QUICK_ACTIONS = [
  { id: "verify_image" as const, label: "Verify Image", icon: Image, color: "text-green-400 border-green-500/30 bg-green-500/10" },
  { id: "sweep_target" as const, label: "Sweep Target", icon: Radar, color: "text-orange-400 border-orange-500/30 bg-orange-500/10" },
  { id: "summarize_thread" as const, label: "Summarize Thread", icon: FileText, color: "text-blue-400 border-blue-500/30 bg-blue-500/10" },
  { id: "run_playbook" as const, label: "Run Playbook", icon: Zap, color: "text-purple-400 border-purple-500/30 bg-purple-500/10" },
  { id: "add_to_case" as const, label: "Add to Case", icon: Target, color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10" },
];

export default function AgentInteraction() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("nexus-prime");
  const [isTyping, setIsTyping] = useState(false);
  const [quickActionTarget, setQuickActionTarget] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: agents } = trpc.agentInteraction.listAgents.useQuery();
  const chatMutation = trpc.agentInteraction.chat.useMutation({
    onSuccess: (result) => {
      setMessages(prev => [...prev, {
        role: "agent",
        content: result.response,
        agentName: result.agentName,
        suggestedActions: result.suggestedActions,
        timestamp: new Date(),
      }]);
      setIsTyping(false);
    },
    onError: () => { setIsTyping(false); toast.error("Agent communication failed"); },
  });
  const quickAction = trpc.agentInteraction.quickAction.useMutation({
    onSuccess: (data) => {
      setMessages(prev => [...prev, {
        role: "agent",
        content: data.description,
        agentName: "SYSTEM",
        timestamp: new Date(),
      }]);
      toast.success("Action executed");
    },
  });

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { role: "user", content: input, timestamp: new Date() }]);
    setIsTyping(true);
    chatMutation.mutate({ agentId: selectedAgent, message: input });
    setInput("");
  };

  const currentAgent = agents?.find((a: any) => a.id === selectedAgent);

  return (
    <div className="flex gap-4 h-[calc(100vh-140px)]">
      {/* Agent Sidebar */}
      <div className="w-64 flex-shrink-0 glass-panel rounded-xl overflow-hidden flex flex-col">
        <div className="p-3 border-b border-white/5">
          <h3 className="text-xs font-bold opacity-50">AGENTS</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {agents?.map((agent: any) => (
            <button
              key={agent.id}
              onClick={() => setSelectedAgent(agent.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedAgent === agent.id ? "bg-cyan-600/20 border border-cyan-500/30 text-cyan-400" : "hover:bg-white/5"}`}
            >
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium text-xs truncate">{agent.name}</div>
                  <div className="text-[10px] opacity-40 truncate">{agent.archetype}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="border-t border-white/5 p-3 space-y-2">
          <h4 className="text-[10px] font-bold opacity-40">QUICK ACTIONS</h4>
          <input
            value={quickActionTarget}
            onChange={e => setQuickActionTarget(e.target.value)}
            placeholder="Target ID (optional)"
            className="w-full px-2 py-1 rounded bg-black/20 border border-white/10 text-[10px]"
          />
          <div className="grid grid-cols-1 gap-1">
            {QUICK_ACTIONS.map(qa => {
              const Icon = qa.icon;
              return (
                <button
                  key={qa.id}
                  onClick={() => quickAction.mutate({ action: qa.id, targetId: quickActionTarget || undefined })}
                  disabled={quickAction.isPending}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded text-[10px] font-medium border transition-colors hover:opacity-80 ${qa.color}`}
                >
                  <Icon className="w-3 h-3" /> {qa.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 glass-panel rounded-xl overflow-hidden flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">{currentAgent?.name || "Select Agent"}</h2>
              <p className="text-[10px] opacity-40">{currentAgent?.archetype || ""} • {currentAgent?.capabilities?.length || 0} capabilities</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] opacity-40">ONLINE</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full opacity-30">
              <MessageSquare className="w-12 h-12 mb-4" />
              <p className="text-sm">Start a conversation with {currentAgent?.name || "an agent"}</p>
              <p className="text-xs mt-1">Ask questions, request analysis, or trigger actions</p>
            </div>
          )}
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
              >
                {msg.role === "agent" && (
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                )}
                <div className={`max-w-[70%] ${msg.role === "user" ? "bg-cyan-600/20 border border-cyan-500/20" : "bg-white/5 border border-white/10"} rounded-xl p-3`}>
                  {msg.role === "agent" && msg.agentName && (
                    <div className="text-[10px] font-bold text-cyan-400 mb-1">{msg.agentName}</div>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-white/5">
                      {msg.suggestedActions.map((action, j) => (
                        <button key={j} onClick={() => { setInput(action); }} className="text-[10px] px-2 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20">
                          <Sparkles className="w-3 h-3 inline mr-1" />{action}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="text-[9px] opacity-30 mt-1">{msg.timestamp.toLocaleTimeString()}</div>
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <User className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          {isTyping && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-white/5">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={`Message ${currentAgent?.name || "agent"}...`}
              className="flex-1 px-4 py-2 rounded-lg bg-black/20 border border-white/10 text-sm focus:border-cyan-500/50 focus:outline-none"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="px-4 py-2 rounded-lg bg-cyan-600/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-600/30 transition-colors disabled:opacity-30"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
