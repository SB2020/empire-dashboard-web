import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import {
  Search, Globe, User, Building, MapPin, Cpu, Link2, Calendar,
  FileText, Image, Video, Wifi, AlertTriangle, Eye, Copy,
  Share2, ExternalLink, Briefcase, ChevronRight, Zap, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useAppLink } from "@/hooks/useAppLink";

type ResultTab = "all" | "records" | "entities" | "cases";

const entityTypeIcons: Record<string, any> = {
  person: User, organization: Building, location: MapPin,
  device: Cpu, domain: Link2, event: Calendar, media: Image,
};

const entityTypeColors: Record<string, string> = {
  person: "text-blue-400 bg-blue-500/10", organization: "text-purple-400 bg-purple-500/10",
  location: "text-emerald-400 bg-emerald-500/10", device: "text-orange-400 bg-orange-500/10",
  domain: "text-cyan-400 bg-cyan-500/10", event: "text-yellow-400 bg-yellow-500/10",
  media: "text-pink-400 bg-pink-500/10",
};

const recordTypeIcons: Record<string, any> = {
  post: FileText, image: Image, video: Video, article: Globe,
  stream: Wifi, alert: AlertTriangle, domain: Globe, camera: Eye,
};

export default function OneSearch() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<ResultTab>("all");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const { openLink } = useAppLink();

  const searchInput = useMemo(() => (
    submittedQuery ? { q: submittedQuery, limit: 30 } : null
  ), [submittedQuery]);

  const { data, isLoading } = trpc.search.query.useQuery(searchInput!, {
    enabled: !!searchInput,
  });

  const handleSearch = () => {
    if (query.trim()) setSubmittedQuery(query.trim());
  };

  const totalResults = (data?.records?.length || 0) + (data?.entities?.length || 0) + (data?.cases?.length || 0);

  return (
    <div className="h-full flex flex-col gap-4 p-2">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg glass-panel flex items-center justify-center">
          <Search className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground tracking-wide">ONE-SEARCH</h1>
          <p className="text-xs text-muted-foreground font-mono">
            UNIFIED CROSS-DOMAIN INTELLIGENCE SEARCH
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            className="w-full bg-background/60 border border-border rounded-xl pl-12 pr-4 py-3 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
            placeholder="Search names, places, terms, domains, records..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <Button onClick={handleSearch} disabled={!query.trim() || isLoading} className="px-6">
          {isLoading ? <Zap className="w-4 h-4 animate-pulse" /> : "SEARCH"}
        </Button>
      </div>

      {/* Results */}
      {submittedQuery && (
        <>
          {/* Tabs */}
          <div className="flex items-center gap-2">
            {([
              { id: "all", label: `ALL (${totalResults})` },
              { id: "records", label: `RECORDS (${data?.records?.length || 0})` },
              { id: "entities", label: `ENTITIES (${data?.entities?.length || 0})` },
              { id: "cases", label: `CASES (${data?.cases?.length || 0})` },
            ] as { id: ResultTab; label: string }[]).map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab(tab.id)}
                className="text-xs"
              >
                {tab.label}
              </Button>
            ))}
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-3 pr-2">
              {/* Records */}
              {(activeTab === "all" || activeTab === "records") && data?.records?.map((record: any) => {
                const TypeIcon = recordTypeIcons[record.recordType] || FileText;
                return (
                  <motion.div
                    key={`r-${record.id}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass-panel rounded-lg p-3 border border-border/50 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded flex items-center justify-center bg-background/50 text-blue-400 shrink-0">
                        <TypeIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-500/30">RECORD</Badge>
                          <span className="text-sm font-semibold text-foreground truncate">
                            {record.title || record.content?.substring(0, 80) || "Untitled"}
                          </span>
                        </div>
                        {record.content && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{record.content.substring(0, 200)}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-muted-foreground">
                          <span>{record.recordType}</span>
                          <span>{record.collectorId}</span>
                          <span>{new Date(record.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => { navigator.clipboard.writeText(JSON.stringify(record, null, 2)); toast.success("Copied"); }} className="p-1.5 rounded hover:bg-background/50 text-muted-foreground">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {record.sourceUrl && (
                          <button onClick={() => openLink(record.sourceUrl, "Source")} className="p-1.5 rounded hover:bg-background/50 text-muted-foreground">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Entities */}
              {(activeTab === "all" || activeTab === "entities") && data?.entities?.map((entity: any) => {
                const TypeIcon = entityTypeIcons[entity.entityType] || Globe;
                const colors = entityTypeColors[entity.entityType] || "text-foreground bg-background/50";
                return (
                  <motion.div
                    key={`e-${entity.id}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass-panel rounded-lg p-3 border border-border/50 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded flex items-center justify-center ${colors} shrink-0`}>
                        <TypeIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">ENTITY</Badge>
                          <span className="text-sm font-semibold text-foreground">{entity.name}</span>
                          <Badge variant="outline" className="text-[10px]">{entity.entityType}</Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-muted-foreground">
                          <span>Confidence: {entity.confidence}%</span>
                          <span>Sources: {entity.sourceCount}</span>
                          <span>Last seen: {new Date(entity.lastSeen).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <button onClick={() => { navigator.clipboard.writeText(entity.name); toast.success("Copied"); }} className="p-1.5 rounded hover:bg-background/50 text-muted-foreground">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}

              {/* Cases */}
              {(activeTab === "all" || activeTab === "cases") && data?.cases?.map((c: any) => (
                <motion.div
                  key={`c-${c.id}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="glass-panel rounded-lg p-3 border border-border/50 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded flex items-center justify-center bg-amber-500/10 text-amber-400 shrink-0">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30">CASE</Badge>
                        <span className="text-sm font-semibold text-foreground">{c.title}</span>
                        <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                        <Badge variant="outline" className="text-[10px]">{c.priority}</Badge>
                      </div>
                      {c.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{c.description}</p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </motion.div>
              ))}

              {/* Empty */}
              {!isLoading && totalResults === 0 && (
                <div className="text-center py-16">
                  <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-sm font-bold text-muted-foreground">NO RESULTS FOUND</h3>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Try different keywords or ingest more data through the Live Feed.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </>
      )}

      {/* Initial state */}
      {!submittedQuery && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 rounded-2xl glass-panel flex items-center justify-center mx-auto mb-6">
              <Globe className="w-10 h-10 text-cyan-400/50" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">UNIFIED INTELLIGENCE SEARCH</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Search across all OSINT records, entities, and cases in one place.
              Type a name, place, term, or domain to begin.
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-6">
              {["cyber attack", "Moscow", "oil pipeline", "drone strike", "election"].map((term) => (
                <Button
                  key={term}
                  variant="outline"
                  size="sm"
                  onClick={() => { setQuery(term); setSubmittedQuery(term); }}
                  className="text-xs"
                >
                  {term}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
