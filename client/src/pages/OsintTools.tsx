import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useAppLink } from "@/hooks/useAppLink";
import {
  Search, ExternalLink, Filter, Globe, Shield, User, Phone,
  Eye, MapPin, Car, Mail, Database, Wrench, FileText, Brain,
  Crosshair, BarChart3, Layers, Hash, X, Star, Activity,
  CheckCircle2, XCircle, AlertTriangle, Loader2, Wifi,
} from "lucide-react";

const CATEGORY_ICONS: Record<string, any> = {
  "Breach Data": Shield, "Search Engine": Search, "People Search": User,
  "Facial Recognition": Eye, "IP Geolocation": MapPin, "Social Media": Globe,
  "Social Media Enumeration": Hash, "Corporate OSINT": BarChart3,
  "Intellectual Property": FileText, "Financial OSINT": Database,
  "Phone Search": Phone, "Network Analysis": Layers, "Location Analysis": MapPin,
  "Domain Lookup": Globe, "Vehicle & VIN Lookup": Car, "Data Extraction": FileText,
  "Email OSINT": Mail, "Automation": Wrench, "OSINT Resource": Brain,
  "Investigation Platform": Crosshair,
};

const CATEGORY_COLORS: Record<string, string> = {
  "Breach Data": "text-neon-red", "Search Engine": "text-neon-cyan",
  "People Search": "text-neon-green", "Facial Recognition": "text-neon-magenta",
  "IP Geolocation": "text-neon-amber", "Social Media": "text-neon-blue",
  "Social Media Enumeration": "text-neon-cyan", "Corporate OSINT": "text-neon-amber",
  "Intellectual Property": "text-neon-green", "Financial OSINT": "text-neon-cyan",
  "Phone Search": "text-neon-magenta", "Network Analysis": "text-neon-green",
  "Location Analysis": "text-neon-amber", "Domain Lookup": "text-neon-cyan",
  "Vehicle & VIN Lookup": "text-neon-red", "Data Extraction": "text-neon-blue",
  "Email OSINT": "text-neon-magenta", "Automation": "text-neon-green",
  "OSINT Resource": "text-neon-amber", "Investigation Platform": "text-neon-red",
};

const BADGE_COLORS: Record<string, string> = {
  "Breach Data": "bg-red-500/15 text-red-400 border-red-500/25",
  "Search Engine": "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
  "People Search": "bg-green-500/15 text-green-400 border-green-500/25",
  "Facial Recognition": "bg-pink-500/15 text-pink-400 border-pink-500/25",
  "IP Geolocation": "bg-amber-500/15 text-amber-400 border-amber-500/25",
  "Social Media": "bg-blue-500/15 text-blue-400 border-blue-500/25",
  "Social Media Enumeration": "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
  "Corporate OSINT": "bg-amber-500/15 text-amber-400 border-amber-500/25",
  "Intellectual Property": "bg-green-500/15 text-green-400 border-green-500/25",
  "Financial OSINT": "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
  "Phone Search": "bg-pink-500/15 text-pink-400 border-pink-500/25",
  "Network Analysis": "bg-green-500/15 text-green-400 border-green-500/25",
  "Location Analysis": "bg-amber-500/15 text-amber-400 border-amber-500/25",
  "Domain Lookup": "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
  "Vehicle & VIN Lookup": "bg-red-500/15 text-red-400 border-red-500/25",
  "Data Extraction": "bg-blue-500/15 text-blue-400 border-blue-500/25",
  "Email OSINT": "bg-pink-500/15 text-pink-400 border-pink-500/25",
  "Automation": "bg-green-500/15 text-green-400 border-green-500/25",
  "OSINT Resource": "bg-amber-500/15 text-amber-400 border-amber-500/25",
  "Investigation Platform": "bg-red-500/15 text-red-400 border-red-500/25",
};

function HealthBadge({ status, responseTimeMs }: { status?: string; responseTimeMs?: number | null }) {
  if (!status) return null;
  const config = {
    online: { icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/10", label: "ONLINE" },
    offline: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10", label: "OFFLINE" },
    degraded: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10", label: "DEGRADED" },
    unknown: { icon: Wifi, color: "text-muted-foreground", bg: "bg-white/5", label: "UNKNOWN" },
  }[status] || { icon: Wifi, color: "text-muted-foreground", bg: "bg-white/5", label: "?" };
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono ${config.bg} ${config.color}`} title={responseTimeMs ? `${responseTimeMs}ms` : undefined}>
      <Icon className="w-3 h-3" />
      {config.label}
      {responseTimeMs != null && <span className="opacity-60">{responseTimeMs}ms</span>}
    </span>
  );
}

export default function OsintTools() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { user } = useAuth();
    const utils = trpc.useUtils();
  const { openLink } = useAppLink();

  const { data, isLoading } = trpc.osintDirectory.getTools.useQuery(
    { category: selectedCategory || undefined, search: search || undefined },
    { placeholderData: (prev: any) => prev }
  );

  const { data: healthData } = trpc.toolHealth.getStatus.useQuery();
  const checkAllMutation = trpc.toolHealth.checkAll.useMutation({
    onSuccess: () => {
      utils.toolHealth.getStatus.invalidate();
      toast.success("Health check complete — all tools pinged");
    },
  });

  const { data: bookmarkData } = trpc.bookmarks.list.useQuery(
    { itemType: "osint_tool" },
    { enabled: !!user }
  );
  const toggleBookmark = trpc.bookmarks.toggle.useMutation({
    onSuccess: () => utils.bookmarks.list.invalidate(),
  });

  const bookmarkedKeys = useMemo(() => {
    return new Set((bookmarkData || []).map((b: any) => b.itemKey));
  }, [bookmarkData]);

  const tools = data?.tools || [];
  const categories = data?.categories || [];
  const total = data?.total || 0;
  const statusMap = healthData?.statusMap || {};

  const grouped = useMemo(() => {
    const map: Record<string, typeof tools> = {};
    for (const t of tools) {
      if (!map[t.category]) map[t.category] = [];
      map[t.category].push(t);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [tools]);

  const onlineCount = Object.values(statusMap).filter((s: any) => s.status === "online").length;
  const offlineCount = Object.values(statusMap).filter((s: any) => s.status === "offline").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold tracking-wider chrome-text flex items-center gap-3">
            <Crosshair className="w-7 h-7 text-neon-amber" />
            OSINT TOOLS DIRECTORY
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono tracking-wide">
            Open-Source Intelligence // {total} Tools // {categories.length} Categories
          </p>
        </div>
        <div className="flex items-center gap-2">
          {healthData && healthData.totalChecked > 0 && (
            <div className="flex items-center gap-2 text-xs font-mono mr-2">
              <span className="text-green-400">{onlineCount} online</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-red-400">{offlineCount} offline</span>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => checkAllMutation.mutate()}
            disabled={checkAllMutation.isPending}
            className="glass-panel border-neon-green/30 text-neon-green hover:bg-neon-green/10 font-mono text-xs"
          >
            {checkAllMutation.isPending ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> CHECKING...</>
            ) : (
              <><Activity className="w-3.5 h-3.5 mr-1.5" /> HEALTH CHECK</>
            )}
          </Button>
          <Badge variant="outline" className="glass-panel border-neon-amber/30 text-neon-amber px-3 py-1.5 font-mono">
            {tools.length} / {total} TOOLS
          </Badge>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tools by name, category, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 glass-panel border-white/10 font-mono text-sm"
          />
        </div>
        {(selectedCategory || search) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setSelectedCategory(null); setSearch(""); }}
            className="glass-panel border-white/10 text-muted-foreground"
          >
            <X className="w-4 h-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Category pills */}
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2 flex-wrap">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className={selectedCategory === null
              ? "bg-neon-amber/20 text-neon-amber border border-neon-amber/30"
              : "glass-panel border-white/10 text-muted-foreground hover:text-foreground"
            }
          >
            <Filter className="w-3.5 h-3.5 mr-1.5" /> All ({total})
          </Button>
          {categories.map(cat => {
            const Icon = CATEGORY_ICONS[cat] || Globe;
            const isActive = selectedCategory === cat;
            return (
              <Button
                key={cat}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(isActive ? null : cat)}
                className={isActive
                  ? "bg-neon-amber/20 text-neon-amber border border-neon-amber/30"
                  : "glass-panel border-white/10 text-muted-foreground hover:text-foreground"
                }
              >
                <Icon className="w-3.5 h-3.5 mr-1.5" />
                {cat}
                {selectedCategory === null && <span className="ml-1 opacity-60">({data?.tools.filter(t => t.category === cat).length || 0})</span>}
              </Button>
            );
          })}
        </div>
      </ScrollArea>

      {/* Tools grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <Card key={i} className="glass-panel border-white/5 animate-pulse h-32" />
          ))}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedCategory || "all"}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {grouped.map(([category, catTools]) => {
              const Icon = CATEGORY_ICONS[category] || Globe;
              const colorClass = CATEGORY_COLORS[category] || "text-neon-cyan";
              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className={`w-5 h-5 ${colorClass}`} />
                    <h2 className={`font-heading text-sm tracking-widest uppercase ${colorClass}`}>
                      {category}
                    </h2>
                    <span className="text-xs text-muted-foreground font-mono">({catTools.length})</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {catTools.map((tool, idx) => {
                      const health = statusMap[tool.url];
                      const isBookmarked = bookmarkedKeys.has(tool.url);
                      return (
                        <motion.div
                          key={tool.name}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03 }}
                        >
                          <Card className="glass-panel border-white/5 hover:border-white/15 transition-all group h-full" onClick={() => openLink(tool.url, tool.name)}>
                            <CardContent className="p-4 flex flex-col h-full">
                              <div className="flex items-start justify-between mb-2 gap-1">
                                <h3 className="font-semibold text-sm text-foreground group-hover:text-neon-cyan transition-colors leading-tight flex-1">
                                  {tool.name}
                                </h3>
                                <div className="flex items-center gap-1 shrink-0">
                                  {user && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleBookmark.mutate({
                                          itemType: "osint_tool",
                                          itemKey: tool.url,
                                          label: tool.name,
                                          metadata: { category: tool.category, url: tool.url },
                                        });
                                      }}
                                      className={`p-0.5 transition-colors ${isBookmarked ? "text-neon-amber" : "text-muted-foreground/40 hover:text-neon-amber/70"}`}
                                      title={isBookmarked ? "Remove bookmark" : "Bookmark this tool"}
                                    >
                                      <Star className={`w-3.5 h-3.5 ${isBookmarked ? "fill-current" : ""}`} />
                                    </button>
                                  )}
<button
                                    onClick={(e) => { e.stopPropagation(); openLink(tool.url, tool.name); }}
                                    className="text-muted-foreground hover:text-neon-cyan transition-colors p-0.5"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                              {tool.description && (
                                <p className="text-xs text-muted-foreground mb-3 leading-relaxed flex-1">
                                  {tool.description}
                                </p>
                              )}
                              <div className="flex items-center justify-between mt-auto pt-2 gap-2">
                                <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${BADGE_COLORS[tool.category] || "bg-white/5 text-white/60 border-white/10"}`}>
                                  {tool.category}
                                </Badge>
                                <div className="flex items-center gap-2">
                                  {health && <HealthBadge status={health.status} responseTimeMs={health.responseTimeMs} />}
                                  <button
                                    onClick={() => openLink(tool.url, tool.name)}
                                    className="text-[10px] font-mono text-muted-foreground hover:text-neon-cyan truncate max-w-[120px] text-left"
                                  >
                                    {tool.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                                  </button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {tools.length === 0 && (
              <div className="text-center py-16">
                <Search className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground font-mono">No tools match your search</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
