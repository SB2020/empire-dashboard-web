import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import {
  Briefcase, Plus, Search, Filter, ChevronRight, Clock,
  AlertTriangle, Shield, FileText, Image, Link2, StickyNote,
  Copy, Share2, Download, Trash2, Edit3, Eye, Play,
  X, Check, MoreHorizontal, Zap, BookOpen, RefreshCw,
  ChevronDown, ExternalLink, Archive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppLink } from "@/hooks/useAppLink";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

type ViewMode = "cases" | "case-detail" | "triage" | "playbooks";

const priorityColors: Record<string, string> = {
  low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
};

const statusColors: Record<string, string> = {
  open: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  closed: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  archived: "bg-zinc-700/20 text-zinc-500 border-zinc-700/30",
};

const evidenceIcons: Record<string, any> = {
  record: FileText, entity: Shield, note: StickyNote,
  link: Link2, image: Image, file: FileText,
};

export default function CaseWorkspace() {
  const { openLink } = useAppLink();
  const [viewMode, setViewMode] = useState<ViewMode>("cases");
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [showCreateCase, setShowCreateCase] = useState(false);
  const [showAddEvidence, setShowAddEvidence] = useState(false);

  // Data queries
  const { data: casesList, refetch: refetchCases } = trpc.cases.list.useQuery();
  const { data: caseDetail, refetch: refetchDetail } = trpc.cases.get.useQuery(
    { id: selectedCaseId! },
    { enabled: !!selectedCaseId }
  );
  const { data: triageAlerts, refetch: refetchTriage } = trpc.triage.alerts.useQuery({});
  const { data: playbooks } = trpc.playbooks.list.useQuery();

  const utils = trpc.useUtils();

  // Mutations
  const createCaseMutation = trpc.cases.create.useMutation({
    onSuccess: () => {
      toast.success("Case created");
      setShowCreateCase(false);
      refetchCases();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateCaseMutation = trpc.cases.update.useMutation({
    onSuccess: () => { toast.success("Case updated"); refetchCases(); refetchDetail(); },
  });

  const addEvidenceMutation = trpc.cases.addEvidence.useMutation({
    onSuccess: () => {
      toast.success("Evidence added");
      setShowAddEvidence(false);
      refetchDetail();
    },
    onError: (err) => toast.error(err.message),
  });

  const removeEvidenceMutation = trpc.cases.removeEvidence.useMutation({
    onSuccess: () => { toast.success("Evidence removed"); refetchDetail(); },
  });

  const updateTriageMutation = trpc.triage.update.useMutation({
    onSuccess: () => { toast.success("Alert updated"); refetchTriage(); },
  });

  const runPlaybookMutation = trpc.playbooks.run.useMutation({
    onSuccess: (data) => {
      toast.success(`Playbook "${data.name}" completed — ${data.results.length} steps`);
    },
    onError: (err) => toast.error(err.message),
  });

  const { data: exportData } = trpc.cases.export.useQuery(
    { id: selectedCaseId! },
    { enabled: false }
  );

  // Create case form
  const [caseForm, setCaseForm] = useState({
    title: "", description: "", priority: "medium" as const, tags: [] as string[],
  });

  // Add evidence form
  const [evidenceForm, setEvidenceForm] = useState({
    evidenceType: "note" as const, title: "", content: "", sourceUrl: "", confidence: 50, notes: "",
  });

  const openCase = (id: number) => {
    setSelectedCaseId(id);
    setViewMode("case-detail");
  };

  const handleExport = async () => {
    if (!selectedCaseId) return;
    try {
      const result = await utils.cases.export.fetch({ id: selectedCaseId });
      const blob = new Blob([result.report], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `case-${selectedCaseId}-report.md`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report exported");
    } catch {
      toast.error("Export failed");
    }
  };

  return (
    <div className="h-full flex flex-col gap-4 p-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg glass-panel flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-wide">CASE WORKSPACE</h1>
            <p className="text-xs text-muted-foreground font-mono">
              {casesList?.length || 0} CASES | {triageAlerts?.length || 0} ALERTS
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(["cases", "triage", "playbooks"] as ViewMode[]).map((mode) => (
            <Button
              key={mode}
              variant={viewMode === mode || (viewMode === "case-detail" && mode === "cases") ? "default" : "outline"}
              size="sm"
              onClick={() => { setViewMode(mode); if (mode === "cases") setSelectedCaseId(null); }}
              className="text-xs"
            >
              {mode === "cases" ? "CASES" : mode === "triage" ? "TRIAGE" : "PLAYBOOKS"}
            </Button>
          ))}
        </div>
      </div>

      {/* Cases List View */}
      {viewMode === "cases" && (
        <div className="flex-1 flex flex-col gap-3 min-h-0">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowCreateCase(!showCreateCase)} className="gap-1 text-xs">
              <Plus className="w-3 h-3" /> NEW CASE
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetchCases()} className="gap-1 text-xs">
              <RefreshCw className="w-3 h-3" /> REFRESH
            </Button>
          </div>

          {/* Create Case Form */}
          <AnimatePresence>
            {showCreateCase && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="glass-panel rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-bold text-foreground">CREATE NEW CASE</h3>
                  <input
                    className="w-full bg-background/50 border border-border rounded px-3 py-2 text-sm text-foreground"
                    placeholder="Case title..."
                    value={caseForm.title}
                    onChange={(e) => setCaseForm((f) => ({ ...f, title: e.target.value }))}
                  />
                  <textarea
                    className="w-full bg-background/50 border border-border rounded px-3 py-2 text-sm text-foreground h-16 resize-none"
                    placeholder="Description..."
                    value={caseForm.description}
                    onChange={(e) => setCaseForm((f) => ({ ...f, description: e.target.value }))}
                  />
                  <div className="flex items-center gap-3">
                    <select
                      className="bg-background/50 border border-border rounded px-3 py-2 text-sm text-foreground"
                      value={caseForm.priority}
                      onChange={(e) => setCaseForm((f) => ({ ...f, priority: e.target.value as any }))}
                    >
                      {["low", "medium", "high", "critical"].map((p) => (
                        <option key={p} value={p}>{p.toUpperCase()}</option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      onClick={() => createCaseMutation.mutate(caseForm)}
                      disabled={createCaseMutation.isPending || !caseForm.title}
                    >
                      {createCaseMutation.isPending ? "CREATING..." : "CREATE CASE"}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Cases Grid */}
          <ScrollArea className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pr-2">
              {casesList?.map((c: any) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-panel rounded-lg p-4 border border-border/50 hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={() => openCase(c.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-bold text-foreground">{c.title}</h3>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className={`text-[10px] ${statusColors[c.status]}`}>{c.status}</Badge>
                      <Badge variant="outline" className={`text-[10px] ${priorityColors[c.priority]}`}>{c.priority}</Badge>
                    </div>
                  </div>
                  {c.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{c.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {new Date(c.createdAt).toLocaleDateString()}
                    <ChevronRight className="w-3 h-3 ml-auto" />
                  </div>
                </motion.div>
              ))}
              {(!casesList || casesList.length === 0) && (
                <div className="col-span-full text-center py-16">
                  <Briefcase className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-sm font-bold text-muted-foreground">NO CASES YET</h3>
                  <p className="text-xs text-muted-foreground/60 mt-1">Create a new case to start an investigation.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Case Detail View */}
      {viewMode === "case-detail" && caseDetail?.case && (
        <div className="flex-1 flex flex-col gap-3 min-h-0">
          {/* Case Header */}
          <div className="glass-panel rounded-lg p-4 border border-border/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setViewMode("cases"); setSelectedCaseId(null); }} className="text-xs">
                  &larr; CASES
                </Button>
                <h2 className="text-base font-bold text-foreground">{caseDetail.case.title}</h2>
                <Badge variant="outline" className={`text-[10px] ${statusColors[caseDetail.case.status]}`}>{caseDetail.case.status}</Badge>
                <Badge variant="outline" className={`text-[10px] ${priorityColors[caseDetail.case.priority]}`}>{caseDetail.case.priority}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <select
                  className="bg-background/50 border border-border rounded px-2 py-1 text-[10px] text-foreground"
                  value={caseDetail.case.status}
                  onChange={(e) => updateCaseMutation.mutate({ id: caseDetail.case!.id, status: e.target.value as any })}
                >
                  {["open", "active", "closed", "archived"].map((s) => (
                    <option key={s} value={s}>{s.toUpperCase()}</option>
                  ))}
                </select>
                <Button variant="outline" size="sm" className="text-xs gap-1" onClick={handleExport}>
                  <Download className="w-3 h-3" /> EXPORT
                </Button>
                <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(caseDetail, null, 2));
                  toast.success("Case data copied");
                }}>
                  <Copy className="w-3 h-3" /> COPY
                </Button>
              </div>
            </div>
            {caseDetail.case.description && (
              <p className="text-xs text-muted-foreground">{caseDetail.case.description}</p>
            )}
          </div>

          {/* Evidence Section */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">EVIDENCE ({caseDetail.evidence?.length || 0})</h3>
            <Button variant="outline" size="sm" onClick={() => setShowAddEvidence(!showAddEvidence)} className="gap-1 text-xs">
              <Plus className="w-3 h-3" /> ADD EVIDENCE
            </Button>
          </div>

          {/* Add Evidence Form */}
          <AnimatePresence>
            {showAddEvidence && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="glass-panel rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      className="bg-background/50 border border-border rounded px-3 py-2 text-sm text-foreground"
                      placeholder="Evidence title..."
                      value={evidenceForm.title}
                      onChange={(e) => setEvidenceForm((f) => ({ ...f, title: e.target.value }))}
                    />
                    <select
                      className="bg-background/50 border border-border rounded px-3 py-2 text-sm text-foreground"
                      value={evidenceForm.evidenceType}
                      onChange={(e) => setEvidenceForm((f) => ({ ...f, evidenceType: e.target.value as any }))}
                    >
                      {["note", "record", "entity", "link", "image", "file"].map((t) => (
                        <option key={t} value={t}>{t.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    className="w-full bg-background/50 border border-border rounded px-3 py-2 text-sm text-foreground h-16 resize-none"
                    placeholder="Content / notes..."
                    value={evidenceForm.content}
                    onChange={(e) => setEvidenceForm((f) => ({ ...f, content: e.target.value }))}
                  />
                  <div className="flex items-center gap-3">
                    <input
                      className="bg-background/50 border border-border rounded px-3 py-2 text-sm text-foreground flex-1"
                      placeholder="Source URL (optional)"
                      value={evidenceForm.sourceUrl}
                      onChange={(e) => setEvidenceForm((f) => ({ ...f, sourceUrl: e.target.value }))}
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">Confidence:</span>
                      <input
                        type="range" min="0" max="100" value={evidenceForm.confidence}
                        onChange={(e) => setEvidenceForm((f) => ({ ...f, confidence: parseInt(e.target.value) }))}
                        className="w-20"
                      />
                      <span className="text-xs font-mono text-foreground w-8">{evidenceForm.confidence}%</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => addEvidenceMutation.mutate({ caseId: selectedCaseId!, ...evidenceForm })}
                      disabled={addEvidenceMutation.isPending || !evidenceForm.title}
                    >
                      ADD
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Evidence List */}
          <ScrollArea className="flex-1">
            <div className="space-y-2 pr-2">
              {caseDetail.evidence?.map((ev: any) => {
                const Icon = evidenceIcons[ev.evidenceType] || FileText;
                return (
                  <motion.div
                    key={ev.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel rounded-lg p-3 border border-border/50"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded flex items-center justify-center bg-background/50 text-amber-400 shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-foreground">{ev.title}</span>
                          <Badge variant="outline" className="text-[10px]">{ev.evidenceType}</Badge>
                          <Badge variant="outline" className="text-[10px] text-cyan-400 border-cyan-500/30">{ev.confidence}%</Badge>
                        </div>
                        {ev.content && <p className="text-xs text-muted-foreground line-clamp-2">{ev.content}</p>}
                        {ev.sourceUrl && (
                          <button onClick={() => openLink(ev.sourceUrl!, ev.sourceUrl!)} className="text-[10px] text-primary hover:underline flex items-center gap-1 mt-1">
                            <ExternalLink className="w-3 h-3" /> {ev.sourceUrl}
                          </button>
                        )}
                        {ev.notes && (
                          <p className="text-[10px] text-muted-foreground/60 mt-1 italic">Note: {ev.notes}</p>
                        )}
                        <p className="text-[10px] font-mono text-muted-foreground/40 mt-1">
                          Added {new Date(ev.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => { navigator.clipboard.writeText(JSON.stringify(ev, null, 2)); toast.success("Copied"); }} className="p-1.5 rounded hover:bg-background/50 text-muted-foreground">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => removeEvidenceMutation.mutate({ id: ev.id })} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              {(!caseDetail.evidence || caseDetail.evidence.length === 0) && (
                <div className="text-center py-12">
                  <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-xs text-muted-foreground">No evidence yet. Add records, notes, or links.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Triage View */}
      {viewMode === "triage" && (
        <ScrollArea className="flex-1">
          <div className="space-y-2 pr-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-foreground">AUTO-TRIAGE ALERTS</h3>
              <Button variant="outline" size="sm" onClick={() => refetchTriage()} className="gap-1 text-xs">
                <RefreshCw className="w-3 h-3" /> REFRESH
              </Button>
            </div>
            {triageAlerts?.map((alert: any) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel rounded-lg p-3 border border-border/50"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${alert.score >= 70 ? "bg-red-500/20 text-red-400" : alert.score >= 40 ? "bg-orange-500/20 text-orange-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                    <span className="text-sm font-bold">{alert.score}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-foreground">Alert #{alert.id}</span>
                      <Badge variant="outline" className={`text-[10px] ${alert.status === "new" ? "text-red-400 border-red-500/30" : alert.status === "reviewed" ? "text-blue-400 border-blue-500/30" : alert.status === "escalated" ? "text-orange-400 border-orange-500/30" : "text-zinc-400 border-zinc-500/30"}`}>
                        {alert.status}
                      </Badge>
                    </div>
                    {alert.explanation && <p className="text-xs text-muted-foreground">{alert.explanation}</p>}
                    {Array.isArray(alert.rules) && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {alert.rules.map((rule: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-[10px]">{rule}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <select
                      className="bg-background/50 border border-border rounded px-2 py-1 text-[10px] text-foreground"
                      value={alert.status}
                      onChange={(e) => updateTriageMutation.mutate({ id: alert.id, status: e.target.value as any })}
                    >
                      {["new", "reviewed", "escalated", "dismissed"].map((s) => (
                        <option key={s} value={s}>{s.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>
            ))}
            {(!triageAlerts || triageAlerts.length === 0) && (
              <div className="text-center py-16">
                <AlertTriangle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-sm font-bold text-muted-foreground">NO TRIAGE ALERTS</h3>
                <p className="text-xs text-muted-foreground/60 mt-1">Alerts appear when ingested records score high on triage rules.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      )}

      {/* Playbooks View */}
      {viewMode === "playbooks" && (
        <ScrollArea className="flex-1">
          <div className="space-y-3 pr-2">
            <h3 className="text-sm font-bold text-foreground mb-2">INVESTIGATION PLAYBOOKS</h3>
            {playbooks?.map((pb: any) => (
              <motion.div
                key={pb.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel rounded-lg p-4 border border-border/50"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{pb.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{pb.description}</p>
                  </div>
                  <Button
                    variant="outline" size="sm" className="gap-1 text-xs"
                    onClick={() => runPlaybookMutation.mutate({ playbookId: pb.id })}
                    disabled={runPlaybookMutation.isPending}
                  >
                    <Play className="w-3 h-3" /> RUN
                  </Button>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {pb.steps.map((step: string, i: number) => (
                    <span key={i} className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                      {i > 0 && <ChevronRight className="w-3 h-3" />}
                      <span className="px-1.5 py-0.5 rounded bg-background/50 border border-border/30">{step}</span>
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {pb.tags.map((tag: string) => (
                    <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                  ))}
                </div>
              </motion.div>
            ))}
            {(!playbooks || playbooks.length === 0) && (
              <div className="text-center py-16">
                <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-sm font-bold text-muted-foreground">NO PLAYBOOKS</h3>
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
