import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  Play, Image, Target, FileText, Share2, Radar, ShieldAlert,
  ChevronRight, Clock, CheckCircle2, XCircle, Loader2,
  Zap, ListChecks, History, ArrowRight
} from "lucide-react";

const ICON_MAP: Record<string, any> = {
  image: Image, target: Target, "file-text": FileText, "share-2": Share2,
  radar: Radar, "shield-alert": ShieldAlert,
};

const CATEGORY_COLORS: Record<string, string> = {
  Verification: "text-green-400 border-green-500/30 bg-green-500/10",
  Investigation: "text-orange-400 border-orange-500/30 bg-orange-500/10",
  Reporting: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  Social: "text-purple-400 border-purple-500/30 bg-purple-500/10",
  Collection: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
  Security: "text-red-400 border-red-500/30 bg-red-500/10",
};

export default function PlaybookRunner() {
  const { user } = useAuth();
  const [selectedPlaybook, setSelectedPlaybook] = useState<any>(null);
  const [targetId, setTargetId] = useState("");
  const [activeTab, setActiveTab] = useState<"playbooks" | "history">("playbooks");
  const [runningId, setRunningId] = useState<number | null>(null);

  const { data: playbooks, isLoading } = trpc.playbook.list.useQuery();
  const { data: runs, refetch: refetchRuns } = trpc.playbook.runs.useQuery({ limit: 20 });
  const runPlaybook = trpc.playbook.run.useMutation({
    onSuccess: (result) => {
      toast.success(`Playbook completed: ${result.steps} steps executed`);
      setRunningId(null);
      refetchRuns();
    },
    onError: () => { setRunningId(null); toast.error("Playbook execution failed"); },
  });

  const handleRun = (playbook: any) => {
    setRunningId(playbook.id);
    runPlaybook.mutate({ playbookId: playbook.id, targetId: targetId || undefined });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight neon-text-cyan">PLAYBOOK RUNNER</h1>
          <p className="text-sm opacity-60 mt-1">Composable intelligence workflows with step-by-step execution</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("playbooks")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "playbooks" ? "bg-cyan-600/20 border border-cyan-500/30 text-cyan-400" : "bg-white/5 border border-white/10 opacity-60 hover:opacity-80"}`}
          >
            <ListChecks className="w-4 h-4 inline mr-1" /> Playbooks
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "history" ? "bg-cyan-600/20 border border-cyan-500/30 text-cyan-400" : "bg-white/5 border border-white/10 opacity-60 hover:opacity-80"}`}
          >
            <History className="w-4 h-4 inline mr-1" /> Run History
          </button>
        </div>
      </div>

      {/* Target Input */}
      <div className="glass-panel rounded-xl p-4">
        <label className="text-xs opacity-50 mb-2 block">TARGET (optional — entity ID, URL, or identifier)</label>
        <input
          value={targetId}
          onChange={e => setTargetId(e.target.value)}
          placeholder="e.g., entity-123, https://example.com, @username"
          className="w-full px-4 py-2 rounded-lg bg-black/20 border border-white/10 text-sm focus:border-cyan-500/50 focus:outline-none"
        />
      </div>

      {activeTab === "playbooks" ? (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin opacity-50" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {playbooks?.map((pb: any) => {
                const Icon = ICON_MAP[pb.icon] || Zap;
                const catColor = CATEGORY_COLORS[pb.category] || "text-zinc-400 border-zinc-500/30 bg-zinc-500/10";
                const steps = typeof pb.steps === "string" ? JSON.parse(pb.steps) : pb.steps;
                const isRunning = runningId === pb.id;
                const isSelected = selectedPlaybook?.id === pb.id;

                return (
                  <motion.div
                    key={pb.id}
                    layout
                    className={`glass-panel rounded-xl overflow-hidden transition-colors cursor-pointer ${isSelected ? "border-cyan-500/40" : "hover:border-white/20"}`}
                    onClick={() => setSelectedPlaybook(isSelected ? null : pb)}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${catColor}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm">{pb.name}</h3>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${catColor}`}>{pb.category}</span>
                          </div>
                        </div>
                        {pb.isBuiltIn && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">BUILT-IN</span>
                        )}
                      </div>
                      <p className="text-xs opacity-50 line-clamp-2 mb-3">{pb.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] opacity-40">{steps.length} steps • v{pb.version}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRun(pb); }}
                          disabled={isRunning}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg bg-green-600/20 border border-green-500/30 text-green-400 text-xs font-bold hover:bg-green-600/30 transition-colors disabled:opacity-30"
                        >
                          {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                          {isRunning ? "RUNNING" : "EXECUTE"}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Steps */}
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-white/5"
                        >
                          <div className="p-4 space-y-2">
                            <h4 className="text-xs font-bold opacity-50 mb-2">EXECUTION PIPELINE</h4>
                            {steps.map((step: any, i: number) => (
                              <div key={i} className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-[10px] font-bold text-cyan-400 flex-shrink-0">
                                  {i + 1}
                                </div>
                                <ArrowRight className="w-3 h-3 opacity-20 flex-shrink-0" />
                                <span className="text-xs">{step.label}</span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* Run History */
        <div className="space-y-3">
          {!runs?.length ? (
            <div className="glass-panel rounded-xl p-12 text-center">
              <History className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-semibold mb-2">No Runs Yet</h3>
              <p className="text-sm opacity-50">Execute a playbook to see run history here.</p>
            </div>
          ) : (
            runs.map((run: any) => {
              const stepResults = run.stepResults ? (typeof run.stepResults === "string" ? JSON.parse(run.stepResults) : run.stepResults) : [];
              return (
                <div key={run.id} className="glass-panel rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${run.status === "completed" ? "bg-green-500" : run.status === "failed" ? "bg-red-500" : "bg-yellow-500 animate-pulse"}`} />
                      <span className="font-semibold text-sm">Run #{run.id}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10">Playbook #{run.playbookId}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs opacity-50">
                      <Clock className="w-3 h-3" />
                      {new Date(run.createdAt).toLocaleString()}
                      {run.durationMs && <span className="font-mono">({(run.durationMs / 1000).toFixed(1)}s)</span>}
                    </div>
                  </div>
                  {stepResults.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {stepResults.map((sr: any, i: number) => (
                        <span key={i} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400">
                          <CheckCircle2 className="w-3 h-3" /> {sr.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
