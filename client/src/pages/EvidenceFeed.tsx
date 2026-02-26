import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppLink } from "@/hooks/useAppLink";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  FileText, Image, Video, Link2, File, Search, Filter, Plus,
  MapPin, Clock, Shield, ShieldCheck, ShieldAlert, Flag, Archive,
  Eye, ChevronDown, ExternalLink, Fingerprint, BarChart3, X,
  Loader2, AlertTriangle, CheckCircle2
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  new: { label: "NEW", color: "text-blue-400 bg-blue-500/10 border-blue-500/30", icon: Eye },
  triaged: { label: "TRIAGED", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30", icon: Filter },
  verified: { label: "VERIFIED", color: "text-green-400 bg-green-500/10 border-green-500/30", icon: ShieldCheck },
  flagged: { label: "FLAGGED", color: "text-red-400 bg-red-500/10 border-red-500/30", icon: Flag },
  archived: { label: "ARCHIVED", color: "text-zinc-400 bg-zinc-500/10 border-zinc-500/30", icon: Archive },
};

const MEDIA_ICONS: Record<string, any> = {
  image: Image, video: Video, text: FileText, document: File, link: Link2,
};

function ConfidenceRibbon({ score }: { score: number | null }) {
  if (score === null || score === undefined) return null;
  const pct = Math.round(score * 100);
  const color = pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 rounded-full bg-zinc-700 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono opacity-70">{pct}%</span>
    </div>
  );
}

export default function EvidenceFeed() {
  const { openLink } = useAppLink();
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [page, setPage] = useState(0);

  const { data, isLoading, refetch } = trpc.evidence.list.useQuery({
    status: statusFilter as any,
    mediaType: typeFilter as any,
    search: searchQuery || undefined,
    limit: 20,
    offset: page * 20,
  });

  const { data: stats } = trpc.evidence.stats.useQuery();
  const updateStatus = trpc.evidence.updateStatus.useMutation({ onSuccess: () => { refetch(); toast.success("Status updated"); } });
  const createEvidence = trpc.evidence.create.useMutation({ onSuccess: () => { refetch(); setShowCreate(false); toast.success("Evidence added"); } });

  // Create form state
  const [newTitle, setNewTitle] = useState("");
  const [newExcerpt, setNewExcerpt] = useState("");
  const [newMediaType, setNewMediaType] = useState<string>("text");
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [newSourcePlatform, setNewSourcePlatform] = useState("");
  const [newConfidence, setNewConfidence] = useState(0.5);
  const [newTags, setNewTags] = useState("");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight neon-text-cyan">EVIDENCE FEED</h1>
          <p className="text-sm opacity-60 mt-1">Collected intelligence with provenance tracking and confidence scoring</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-600/30 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Evidence
        </button>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="glass-panel rounded-lg p-3 text-center">
            <div className="text-xl font-bold neon-text-cyan">{stats.total}</div>
            <div className="text-xs opacity-50">TOTAL</div>
          </div>
          {stats.byStatus.map((s: any) => {
            const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.new;
            return (
              <div key={s.status} className="glass-panel rounded-lg p-3 text-center cursor-pointer hover:opacity-80" onClick={() => setStatusFilter(statusFilter === s.status ? undefined : s.status)}>
                <div className={`text-xl font-bold ${cfg.color.split(" ")[0]}`}>{s.count}</div>
                <div className="text-xs opacity-50">{cfg.label}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
          <input
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
            placeholder="Search evidence..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-black/20 border border-white/10 text-sm focus:border-cyan-500/50 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter || ""}
          onChange={e => { setStatusFilter(e.target.value || undefined); setPage(0); }}
          className="px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-sm"
        >
          <option value="">All Status</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select
          value={typeFilter || ""}
          onChange={e => { setTypeFilter(e.target.value || undefined); setPage(0); }}
          className="px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-sm"
        >
          <option value="">All Types</option>
          <option value="image">Image</option>
          <option value="video">Video</option>
          <option value="text">Text</option>
          <option value="document">Document</option>
          <option value="link">Link</option>
        </select>
      </div>

      {/* Evidence Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin opacity-50" />
        </div>
      ) : !data?.items.length ? (
        <div className="glass-panel rounded-xl p-12 text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-semibold mb-2">No Evidence Records</h3>
          <p className="text-sm opacity-50 mb-4">Add your first piece of intelligence to start building your evidence feed.</p>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-lg bg-cyan-600/20 border border-cyan-500/30 text-cyan-400 text-sm">
            <Plus className="w-4 h-4 inline mr-1" /> Add Evidence
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {data.items.map((item: any) => {
              const MediaIcon = MEDIA_ICONS[item.mediaType] || FileText;
              const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.new;
              const StatusIcon = statusCfg.icon;
              const tags = item.tags ? (typeof item.tags === "string" ? JSON.parse(item.tags) : item.tags) : [];
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="glass-panel rounded-xl overflow-hidden hover:border-cyan-500/20 transition-colors cursor-pointer"
                  onClick={() => setSelectedId(selectedId === item.id ? null : item.id)}
                >
                  <div className="flex items-start gap-4 p-4">
                    {/* Thumbnail / Media Icon */}
                    <div className="w-16 h-16 rounded-lg bg-black/30 border border-white/5 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {item.thumbnailUrl ? (
                        <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <MediaIcon className="w-6 h-6 opacity-40" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm truncate">{item.title}</h3>
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.color} flex-shrink-0`}>
                          <StatusIcon className="w-3 h-3" /> {statusCfg.label}
                        </span>
                      </div>
                      {item.excerpt && <p className="text-xs opacity-50 mt-1 line-clamp-2">{item.excerpt}</p>}
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <ConfidenceRibbon score={item.confidenceScore} />
                        {item.sourcePlatform && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400">
                            {item.sourcePlatform}
                          </span>
                        )}
                        {item.latitude && item.longitude && (
                          <span className="text-[10px] opacity-40 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {item.latitude.toFixed(2)}, {item.longitude.toFixed(2)}
                          </span>
                        )}
                        <span className="text-[10px] opacity-40 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {new Date(item.collectedAt).toLocaleString()}
                        </span>
                      </div>
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {tags.map((t: string) => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  <AnimatePresence>
                    {selectedId === item.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-white/5"
                      >
                        <div className="p-4 space-y-3">
                          {/* Provenance */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            <div>
                              <span className="opacity-40 block">Collector</span>
                              <span className="font-mono">{item.collectorId || "Manual"}</span>
                            </div>
                            <div>
                              <span className="opacity-40 block">Source</span>
                              {item.sourceUrl ? (
                                <button onClick={() => openLink(item.sourceUrl, item.title)} className="text-cyan-400 hover:underline flex items-center gap-1">
                                  View <ExternalLink className="w-3 h-3" />
                                </button>
                              ) : <span className="opacity-30">N/A</span>}
                            </div>
                            <div>
                              <span className="opacity-40 block">Provenance</span>
                              <span>{item.provenanceSummary || "No summary"}</span>
                            </div>
                            <div>
                              <span className="opacity-40 block">Media</span>
                              {item.mediaUrl ? (
                                <button onClick={() => openLink(item.mediaUrl, item.title)} className="text-cyan-400 hover:underline flex items-center gap-1">
                                  Open <ExternalLink className="w-3 h-3" />
                                </button>
                              ) : <span className="opacity-30">N/A</span>}
                            </div>
                          </div>
                          {/* Actions */}
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                              <button
                                key={key}
                                disabled={item.status === key}
                                onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ id: item.id, status: key as any }); }}
                                className={`px-3 py-1 rounded text-[10px] font-bold border transition-colors ${item.status === key ? "opacity-30 cursor-not-allowed" : "hover:opacity-80"} ${cfg.color}`}
                              >
                                {cfg.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Pagination */}
          {data.total > 20 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded bg-white/5 border border-white/10 text-sm disabled:opacity-30">Prev</button>
              <span className="text-xs opacity-50">Page {page + 1} of {Math.ceil(data.total / 20)}</span>
              <button disabled={(page + 1) * 20 >= data.total} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded bg-white/5 border border-white/10 text-sm disabled:opacity-30">Next</button>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel rounded-xl p-6 w-full max-w-lg space-y-4 max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold neon-text-cyan">Add Evidence Record</h2>
                <button onClick={() => setShowCreate(false)}><X className="w-5 h-5 opacity-50" /></button>
              </div>
              <div className="space-y-3">
                <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Title *" className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-sm" />
                <textarea value={newExcerpt} onChange={e => setNewExcerpt(e.target.value)} placeholder="Excerpt / Description" rows={3} className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-sm" />
                <div className="grid grid-cols-2 gap-3">
                  <select value={newMediaType} onChange={e => setNewMediaType(e.target.value)} className="px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-sm">
                    <option value="text">Text</option>
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                    <option value="document">Document</option>
                    <option value="link">Link</option>
                  </select>
                  <input value={newSourcePlatform} onChange={e => setNewSourcePlatform(e.target.value)} placeholder="Source Platform" className="px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-sm" />
                </div>
                <input value={newSourceUrl} onChange={e => setNewSourceUrl(e.target.value)} placeholder="Source URL" className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-sm" />
                <div>
                  <label className="text-xs opacity-50 mb-1 block">Confidence Score: {Math.round(newConfidence * 100)}%</label>
                  <input type="range" min={0} max={1} step={0.01} value={newConfidence} onChange={e => setNewConfidence(parseFloat(e.target.value))} className="w-full" />
                </div>
                <input value={newTags} onChange={e => setNewTags(e.target.value)} placeholder="Tags (comma separated)" className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-sm" />
              </div>
              <button
                disabled={!newTitle || createEvidence.isPending}
                onClick={() => createEvidence.mutate({
                  title: newTitle,
                  excerpt: newExcerpt || undefined,
                  mediaType: newMediaType as any,
                  sourceUrl: newSourceUrl || undefined,
                  sourcePlatform: newSourcePlatform || undefined,
                  confidenceScore: newConfidence,
                  tags: newTags ? newTags.split(",").map(t => t.trim()).filter(Boolean) : undefined,
                })}
                className="w-full py-2 rounded-lg bg-cyan-600/30 border border-cyan-500/30 text-cyan-400 font-semibold text-sm disabled:opacity-30"
              >
                {createEvidence.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Add Evidence Record"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
