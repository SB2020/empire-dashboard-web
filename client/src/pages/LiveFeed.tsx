import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import {
  Radio, Search, Filter, RefreshCw, ChevronDown, ExternalLink,
  Copy, Share2, MapPin, Clock, Shield, AlertTriangle, Eye,
  FileText, Image, Video, Globe, Wifi, Zap, TrendingUp,
  ChevronRight, Plus, Bookmark, MoreHorizontal, Map as MapIcon,
  X, Loader2, Crosshair, Activity, Newspaper, Bug, CloudRain,
  Plane, Waves, Hash, ArrowUp, PanelRightOpen, PanelRightClose,
  Briefcase, Flag, Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { MapView } from "@/components/Map";
import { useAppLink } from "@/hooks/useAppLink";

type FeedFilter = "all" | "post" | "image" | "video" | "article" | "stream" | "alert" | "domain" | "camera";
type SeverityFilter = "all" | "low" | "medium" | "high" | "critical";
type DataSource = "all" | "osint_db" | "earthquakes" | "cves" | "news" | "geo_events" | "social_trends" | "flights" | "weather" | "live_cams";

const typeIcons: Record<string, any> = {
  post: FileText, image: Image, video: Video, article: Globe,
  stream: Wifi, alert: AlertTriangle, domain: Globe, camera: Eye,
  earthquake: Waves, cve: Bug, news: Newspaper, geo_event: Activity,
  social_trend: TrendingUp, flight: Plane, weather: CloudRain,
  live_cam: Eye,
};

const typeColors: Record<string, string> = {
  post: "text-blue-400", image: "text-purple-400", video: "text-pink-400",
  article: "text-emerald-400", stream: "text-red-400", alert: "text-orange-400",
  domain: "text-cyan-400", camera: "text-yellow-400",
  earthquake: "text-orange-500", cve: "text-red-500", news: "text-emerald-400",
  geo_event: "text-amber-400", social_trend: "text-neon-magenta", flight: "text-neon-cyan",
  weather: "text-blue-300",
  live_cam: "text-neon-green",
};

const severityColors: Record<string, string> = {
  low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  LOW: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  MEDIUM: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  HIGH: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  CRITICAL: "bg-red-500/20 text-red-400 border-red-500/30",
};

function timeAgo(date: string | Date | number): string {
  const now = Date.now();
  const then = typeof date === "number" ? date : new Date(date).getTime();
  const diff = now - then;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

// Normalize all data sources into a unified feed item
interface UnifiedFeedItem {
  id: string;
  type: string;
  title: string;
  content: string;
  source: string;
  severity: string;
  confidence: number;
  latitude: number | null;
  longitude: number | null;
  timestamp: string;
  url: string | null;
  imageUrl: string | null;
  entities: any[];
  tags: string[];
  transformationChain: string[];
  raw: any;
  location?: string;
  embedUrl?: string;
  metadata?: Record<string, any>;
}

function normalizeOsintRecord(r: any): UnifiedFeedItem {
  return {
    id: `osint-${r.id}`,
    type: r.recordType || "article",
    title: r.title || r.content?.substring(0, 80) || "Untitled Record",
    content: r.content || "",
    source: r.collectorId || "osint_db",
    severity: r.severity || "low",
    confidence: r.confidence || 50,
    latitude: r.latitude ? Number(r.latitude) : null,
    longitude: r.longitude ? Number(r.longitude) : null,
    timestamp: r.collectedAt || r.createdAt || new Date().toISOString(),
    url: r.sourceUrl || null,
    imageUrl: r.imageUrl || null,
    entities: Array.isArray(r.entities) ? r.entities : [],
    tags: Array.isArray(r.tags) ? r.tags : [],
    transformationChain: Array.isArray(r.transformationChain) ? r.transformationChain : [],
    raw: r,
  };
}

function normalizeEarthquake(q: any): UnifiedFeedItem {
  return {
    id: `eq-${q.id}`, type: "earthquake",
    title: `M${q.magnitude} — ${q.place}`,
    content: `Magnitude ${q.magnitude} earthquake at depth ${q.depth}km. ${q.tsunami ? "TSUNAMI WARNING ISSUED." : ""}`,
    source: "USGS", severity: q.magnitude >= 6 ? "critical" : q.magnitude >= 4.5 ? "high" : q.magnitude >= 3 ? "medium" : "low",
    confidence: 95, latitude: q.latitude, longitude: q.longitude,
    timestamp: new Date(q.time).toISOString(), url: q.url, imageUrl: null,
    entities: [], tags: ["earthquake", "seismic"], transformationChain: ["USGS API"], raw: q,
  };
}

function normalizeCVE(c: any, index: number): UnifiedFeedItem {
  const cveId = c.id || c.cveId || c.cve_id || `idx-${index}`;
  return {
    id: `cve-${cveId}`, type: "cve",
    title: `${cveId} (CVSS ${c.score})`,
    content: c.description,
    source: "NVD", severity: c.severity?.toLowerCase() || "medium",
    confidence: 90, latitude: null, longitude: null,
    timestamp: c.published, url: `https://nvd.nist.gov/vuln/detail/${c.id}`, imageUrl: null,
    entities: [], tags: ["cve", "vulnerability", "cyber"], transformationChain: ["NVD API"], raw: c,
  };
}

function normalizeNews(n: any): UnifiedFeedItem {
  return {
    id: `news-${n.title?.slice(0, 20)}-${Math.random().toString(36).slice(2, 6)}`, type: "news",
    title: n.title, content: n.summary || n.title,
    source: n.source || "Global News", severity: "medium",
    confidence: 70, latitude: null, longitude: null,
    timestamp: n.published || new Date().toISOString(), url: n.url || null, imageUrl: null,
    entities: [], tags: [n.region || "global", "news"], transformationChain: ["News API"], raw: n,
  };
}

function normalizeGeoEvent(g: any): UnifiedFeedItem {
  return {
    id: `geo-${g.id}`, type: "geo_event",
    title: g.title, content: g.description || g.title,
    source: g.source || "GDELT", severity: g.severity?.toLowerCase() || "medium",
    confidence: 75, latitude: g.latitude, longitude: g.longitude,
    timestamp: g.timestamp || new Date().toISOString(), url: g.url || null, imageUrl: null,
    entities: [], tags: [g.type, g.country].filter(Boolean), transformationChain: ["GDELT"], raw: g,
  };
}

function normalizeSocialTrend(t: any): UnifiedFeedItem {
  return {
    id: `trend-${t.topic?.slice(0, 20)}-${Math.random().toString(36).slice(2, 6)}`, type: "social_trend",
    title: `${t.topic} — ${t.volume?.toLocaleString()} mentions`,
    content: `Trending on ${t.platform}: ${t.topic} (${t.sentiment} sentiment, ${t.volume?.toLocaleString()} mentions)`,
    source: t.platform || "Social", severity: t.sentiment === "negative" ? "high" : "low",
    confidence: 60, latitude: null, longitude: null,
    timestamp: new Date().toISOString(), url: null, imageUrl: null,
    entities: [], tags: ["social", "trending", t.platform].filter(Boolean), transformationChain: ["Social API"], raw: t,
  };
}

function normalizeWeather(w: any): UnifiedFeedItem {
  return {
    id: `wx-${w.event?.slice(0, 20)}-${Math.random().toString(36).slice(2, 6)}`, type: "weather",
    title: w.headline || w.event,
    content: w.description || w.headline,
    source: "NWS", severity: w.severity === "Extreme" ? "critical" : w.severity === "Severe" ? "high" : "medium",
    confidence: 85, latitude: null, longitude: null,
    timestamp: w.onset || new Date().toISOString(), url: null, imageUrl: null,
    entities: [], tags: ["weather", w.event].filter(Boolean), transformationChain: ["NWS API"], raw: w,
  };
}

export default function LiveFeed() {
  const [typeFilter, setTypeFilter] = useState<FeedFilter>("all");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [dataSource, setDataSource] = useState<DataSource>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [allRecords, setAllRecords] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showIngest, setShowIngest] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const [newItemsCount, setNewItemsCount] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const [addToCaseItem, setAddToCaseItem] = useState<UnifiedFeedItem | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [newCaseTitle, setNewCaseTitle] = useState("");
  const [runPlaybookItem, setRunPlaybookItem] = useState<UnifiedFeedItem | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const feedItemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { openLink } = useAppLink();

  // Cases for feed-to-case
  const { data: casesData } = trpc.cases.list.useQuery();
  const addEvidence = trpc.cases.addEvidence.useMutation({
    onSuccess: () => { toast.success("Evidence added to case"); setAddToCaseItem(null); },
    onError: (e) => toast.error(e.message),
  });
  const createCase = trpc.cases.create.useMutation({
    onSuccess: (newCase) => {
      if (addToCaseItem && newCase?.id) {
        addEvidence.mutate({
          caseId: newCase.id,
          evidenceType: "record",
          title: addToCaseItem.title,
          content: addToCaseItem.content,
          sourceUrl: addToCaseItem.url || undefined,
          confidence: addToCaseItem.confidence,
          notes: `Auto-added from Live Feed. Source: ${addToCaseItem.source}. Type: ${addToCaseItem.type}.`,
        });
      }
      setNewCaseTitle("");
      toast.success("Case created");
    },
  });

  const handleAddToCase = useCallback((item: UnifiedFeedItem) => {
    setAddToCaseItem(item);
  }, []);

  const handleConfirmAddToCase = useCallback(() => {
    if (!addToCaseItem) return;
    if (selectedCaseId) {
      addEvidence.mutate({
        caseId: selectedCaseId,
        evidenceType: "record",
        title: addToCaseItem.title,
        content: addToCaseItem.content,
        sourceUrl: addToCaseItem.url || undefined,
        confidence: addToCaseItem.confidence,
        notes: `Auto-added from Live Feed. Source: ${addToCaseItem.source}. Type: ${addToCaseItem.type}. Tags: ${addToCaseItem.tags.join(", ")}`,
      });
    } else if (newCaseTitle) {
      createCase.mutate({
        title: newCaseTitle,
        description: `Created from Live Feed item: ${addToCaseItem.title}`,
        priority: addToCaseItem.severity === "critical" ? "critical" : addToCaseItem.severity === "high" ? "high" : "medium",
        tags: addToCaseItem.tags,
      });
    }
  }, [addToCaseItem, selectedCaseId, newCaseTitle]);

  const handleRunPlaybook = useCallback((item: UnifiedFeedItem) => {
    setRunPlaybookItem(item);
  }, []);

  // Fetch OSINT DB records
  const queryInput = useMemo(() => ({
    limit: 30, offset,
    type: typeFilter !== "all" ? typeFilter : undefined,
    severity: severityFilter !== "all" ? severityFilter : undefined,
    search: searchQuery || undefined,
  }), [offset, typeFilter, severityFilter, searchQuery]);

  const { data: osintData, isLoading: osintLoading, refetch: refetchOsint } = trpc.records.list.useQuery(queryInput, {
    refetchInterval: 30000,
  });

  // Fetch live feeds
  const { data: dashboardData, refetch: refetchDashboard } = trpc.osint.dashboard.useQuery(undefined, {
    refetchInterval: 60000,
  });

  // Fetch aggregated live cams
  const { data: liveCamsData, refetch: refetchLiveCams } = trpc.osint.aggregatedLiveCams.useQuery(undefined, {
    refetchInterval: 120000,
  });

  // Build unified feed
  const unifiedFeed = useMemo(() => {
    const items: UnifiedFeedItem[] = [];

    // OSINT DB records
    if (dataSource === "all" || dataSource === "osint_db") {
      for (const r of (osintData?.records || [])) {
        items.push(normalizeOsintRecord(r));
      }
    }

    if (dashboardData && (dataSource === "all" || dataSource !== "osint_db")) {
      if (dataSource === "all" || dataSource === "earthquakes") {
        for (const q of (dashboardData.earthquakes || []).slice(0, 20)) {
          items.push(normalizeEarthquake(q));
        }
      }
      if (dataSource === "all" || dataSource === "cves") {
        (dashboardData.cves || []).slice(0, 15).forEach((c: any, idx: number) => {
          items.push(normalizeCVE(c, idx));
        });
      }
      if (dataSource === "all" || dataSource === "news") {
        for (const n of (dashboardData.globalNews || dashboardData.news || []).slice(0, 20)) {
          items.push(normalizeNews(n));
        }
      }
      if (dataSource === "all" || dataSource === "geo_events") {
        for (const g of (dashboardData.geoEvents || []).slice(0, 15)) {
          items.push(normalizeGeoEvent(g));
        }
      }
      if (dataSource === "all" || dataSource === "social_trends") {
        for (const t of (dashboardData.socialTrends || []).slice(0, 10)) {
          items.push(normalizeSocialTrend(t));
        }
      }
      if (dataSource === "all" || dataSource === "weather") {
        for (const w of (dashboardData.weatherAlerts || []).slice(0, 10)) {
          items.push(normalizeWeather(w));
        }
      }
    }

    // Live Cams from aggregated sources
    if (liveCamsData && (dataSource === "all" || dataSource === "live_cams")) {
      for (const cam of liveCamsData.slice(0, dataSource === "live_cams" ? 100 : 15)) {
        items.push({
          id: `livecam-${cam.id}`,
          type: "live_cam",
          title: cam.title,
          content: cam.description,
          source: cam.provider.toUpperCase(),
          timestamp: new Date().toISOString(),
          severity: "low",
          confidence: cam.isPriority ? 95 : 70,
          latitude: cam.latitude,
          longitude: cam.longitude,
          location: `${cam.city}, ${cam.country}`,
          entities: [cam.category, cam.continent, cam.provider],
          tags: [cam.category, cam.provider, cam.isPriority ? "priority" : "standard"],
          url: cam.viewUrl,
          imageUrl: null,
          transformationChain: ["cameras.ts", "aggregatedLiveCams"],
          raw: cam,
          embedUrl: cam.embedUrl,
          metadata: { viewers: cam.viewers, provider: cam.provider, isPriority: cam.isPriority },
        });
      }
    }

    // Deduplicate by id (keep first occurrence)
    const seen = new Set<string>();
    const deduped = items.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });

    // Sort by timestamp descending
    deduped.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply severity filter
    if (severityFilter !== "all") {
      return deduped.filter(i => i.severity.toLowerCase() === severityFilter);
    }

    return deduped;
  }, [osintData, dashboardData, liveCamsData, dataSource, severityFilter]);

  // Filter by search
  const filteredFeed = useMemo(() => {
    if (!searchQuery) return unifiedFeed;
    const q = searchQuery.toLowerCase();
    return unifiedFeed.filter(item =>
      item.title.toLowerCase().includes(q) ||
      item.content.toLowerCase().includes(q) ||
      item.source.toLowerCase().includes(q) ||
      item.tags.some(t => t.toLowerCase().includes(q))
    );
  }, [unifiedFeed, searchQuery]);

  // Items with geo data for map
  const geoItems = useMemo(() =>
    filteredFeed.filter(item => item.latitude !== null && item.longitude !== null),
    [filteredFeed]
  );

  // Update map markers when geoItems change
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    // Clear old markers
    for (const m of markersRef.current) { m.map = null; }
    markersRef.current = [];

    for (const item of geoItems.slice(0, 100)) {
      const markerEl = document.createElement("div");
      markerEl.className = "relative";
      const dot = document.createElement("div");
      const isHighlighted = highlightedItemId === item.id;
      const sevColor = item.severity === "critical" ? "#ef4444" : item.severity === "high" ? "#f97316" : item.severity === "medium" ? "#eab308" : "#22c55e";
      dot.style.cssText = `width:${isHighlighted ? 16 : 10}px;height:${isHighlighted ? 16 : 10}px;border-radius:50%;background:${sevColor};border:2px solid rgba(255,255,255,0.8);box-shadow:0 0 ${isHighlighted ? 12 : 6}px ${sevColor};cursor:pointer;transition:all 0.2s;`;
      markerEl.appendChild(dot);

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: mapRef.current,
        position: { lat: item.latitude!, lng: item.longitude! },
        content: markerEl,
        title: item.title,
      });

      marker.addListener("click", () => {
        setHighlightedItemId(item.id);
        setExpandedId(item.id);
        // Scroll to item in feed
        const el = feedItemRefs.current[item.id];
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      });

      markersRef.current.push(marker);
    }
  }, [geoItems, mapReady, highlightedItemId]);

  // Reset on filter change
  useEffect(() => {
    setOffset(0);
    setAllRecords([]);
  }, [typeFilter, severityFilter, searchQuery, dataSource]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && osintData?.hasMore && !osintLoading) {
          setOffset((prev) => prev + 30);
        }
      },
      { threshold: 0.1 }
    );
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [osintData?.hasMore, osintLoading]);

  const copyRecord = useCallback((item: UnifiedFeedItem) => {
    const text = `${item.title}\n${item.content}\nSource: ${item.source}\nSeverity: ${item.severity}\nTime: ${item.timestamp}`;
    navigator.clipboard.writeText(text);
    toast.success("Record copied to clipboard");
  }, []);

  const shareRecord = useCallback((item: UnifiedFeedItem) => {
    const url = `${window.location.origin}/feed?id=${item.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Share link copied");
  }, []);

  const handleItemClick = useCallback((item: UnifiedFeedItem) => {
    setExpandedId(expandedId === item.id ? null : item.id);
    setHighlightedItemId(item.id);
    if (item.latitude && item.longitude && mapRef.current) {
      mapRef.current.panTo({ lat: item.latitude, lng: item.longitude });
      mapRef.current.setZoom(8);
    }
  }, [expandedId]);

  const refreshAll = useCallback(() => {
    setOffset(0);
    refetchOsint();
    refetchDashboard();
    refetchLiveCams();
    setNewItemsCount(0);
    toast.success("Refreshing all feeds...");
  }, [refetchOsint, refetchDashboard, refetchLiveCams]);

  // Ingest form
  const ingestMutation = trpc.records.ingest.useMutation({
    onSuccess: () => { toast.success("Record ingested and enriched"); setShowIngest(false); setOffset(0); refetchOsint(); },
    onError: (err: any) => toast.error(err.message),
  });

  const [ingestForm, setIngestForm] = useState({
    collectorId: "manual_v1", recordType: "article" as const,
    title: "", content: "", sourceUrl: "", severity: "low" as const,
  });

  const sourceStats = useMemo(() => {
    const stats: Record<string, number> = {};
    for (const item of unifiedFeed) {
      stats[item.type] = (stats[item.type] || 0) + 1;
    }
    return stats;
  }, [unifiedFeed]);

  return (
    <div className="h-full flex flex-col gap-2 p-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg glass-panel flex items-center justify-center relative">
            <Radio className="w-5 h-5 text-red-400" />
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-wide">LIVE FEED</h1>
            <p className="text-xs text-muted-foreground font-mono">
              {filteredFeed.length} ITEMS | {geoItems.length} GEO-TAGGED | {Object.keys(sourceStats).length} SOURCES ACTIVE
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {newItemsCount > 0 && (
            <Button size="sm" onClick={refreshAll} className="gap-1 text-xs bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30 hover:bg-neon-cyan/30">
              <ArrowUp className="w-3 h-3" /> {newItemsCount} NEW
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowMap(!showMap)} className="gap-1 text-xs">
            {showMap ? <PanelRightClose className="w-3 h-3" /> : <PanelRightOpen className="w-3 h-3" />}
            {showMap ? "HIDE MAP" : "SHOW MAP"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowIngest(!showIngest)} className="gap-1 text-xs">
            <Plus className="w-3 h-3" /> INGEST
          </Button>
          <Button variant="outline" size="sm" onClick={refreshAll} className="gap-1 text-xs">
            <RefreshCw className={`w-3 h-3 ${osintLoading ? "animate-spin" : ""}`} /> REFRESH
          </Button>
        </div>
      </div>

      {/* Ingest Panel */}
      <AnimatePresence>
        {showIngest && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="glass-panel rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-bold text-foreground">INGEST NEW RECORD</h3>
              <div className="grid grid-cols-2 gap-3">
                <input className="bg-background/50 border border-border rounded px-3 py-2 text-sm text-foreground" placeholder="Title" value={ingestForm.title} onChange={(e) => setIngestForm((f) => ({ ...f, title: e.target.value }))} />
                <input className="bg-background/50 border border-border rounded px-3 py-2 text-sm text-foreground" placeholder="Source URL" value={ingestForm.sourceUrl} onChange={(e) => setIngestForm((f) => ({ ...f, sourceUrl: e.target.value }))} />
              </div>
              <textarea className="w-full bg-background/50 border border-border rounded px-3 py-2 text-sm text-foreground h-20 resize-none" placeholder="Content / intelligence text..." value={ingestForm.content} onChange={(e) => setIngestForm((f) => ({ ...f, content: e.target.value }))} />
              <div className="flex items-center gap-3">
                <select className="bg-background/50 border border-border rounded px-3 py-2 text-sm text-foreground" value={ingestForm.recordType} onChange={(e) => setIngestForm((f) => ({ ...f, recordType: e.target.value as any }))}>
                  {["post", "image", "video", "article", "stream", "alert", "domain", "camera"].map((t) => (<option key={t} value={t}>{t.toUpperCase()}</option>))}
                </select>
                <select className="bg-background/50 border border-border rounded px-3 py-2 text-sm text-foreground" value={ingestForm.severity} onChange={(e) => setIngestForm((f) => ({ ...f, severity: e.target.value as any }))}>
                  {["low", "medium", "high", "critical"].map((s) => (<option key={s} value={s}>{s.toUpperCase()}</option>))}
                </select>
                <Button size="sm" onClick={() => ingestMutation.mutate(ingestForm)} disabled={ingestMutation.isPending || !ingestForm.content} className="ml-auto">
                  {ingestMutation.isPending ? "ENRICHING..." : "INGEST & ENRICH"}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Source Ribbon */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {([
          { key: "all", label: "ALL SOURCES", icon: Radio },
          { key: "osint_db", label: "OSINT DB", icon: FileText },
          { key: "earthquakes", label: "SEISMIC", icon: Waves },
          { key: "cves", label: "CVEs", icon: Bug },
          { key: "news", label: "NEWS", icon: Newspaper },
          { key: "geo_events", label: "GEO EVENTS", icon: Activity },
          { key: "social_trends", label: "SOCIAL", icon: TrendingUp },
          { key: "weather", label: "WEATHER", icon: CloudRain },
          { key: "live_cams", label: "LIVE CAMS", icon: Eye },
        ] as { key: DataSource; label: string; icon: any }[]).map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={dataSource === key ? "default" : "outline"}
            size="sm"
            onClick={() => setDataSource(key)}
            className="text-[10px] px-2 py-1 h-6 gap-1 shrink-0"
          >
            <Icon className="w-3 h-3" />
            {label}
            {key !== "all" && sourceStats[key === "osint_db" ? "article" : key.replace("_", "")] ? (
              <span className="ml-0.5 text-[9px] opacity-60">({sourceStats[key === "osint_db" ? "article" : key.replace("_", "")] || 0})</span>
            ) : null}
          </Button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            className="w-full bg-background/50 border border-border rounded-lg pl-9 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground"
            placeholder="Search all feeds..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1">
          {(["all", "critical", "high", "medium", "low"] as SeverityFilter[]).map((s) => (
            <Button key={s} variant={severityFilter === s ? "default" : "outline"} size="sm" onClick={() => setSeverityFilter(s)} className="text-[10px] px-2 py-1 h-6">
              {s === "all" ? "ALL SEV" : s.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Content: Feed + Map */}
      <div className="flex-1 flex gap-2 overflow-hidden">
        {/* Feed Column */}
        <ScrollArea className={`${showMap ? "w-1/2" : "w-full"} transition-all`} ref={scrollRef}>
          <div className="space-y-1.5 pr-2">
            <AnimatePresence mode="popLayout">
              {filteredFeed.map((item, i) => {
                const TypeIcon = typeIcons[item.type] || FileText;
                const isExpanded = expandedId === item.id;
                const isHighlighted = highlightedItemId === item.id;

                return (
                  <motion.div
                    key={item.id}
                    ref={(el) => { feedItemRefs.current[item.id] = el; }}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: Math.min(i * 0.015, 0.2) }}
                    className={`glass-panel rounded-lg border overflow-hidden cursor-pointer transition-all ${
                      isHighlighted ? "border-neon-cyan/50 ring-1 ring-neon-cyan/20" : "border-border/50 hover:border-primary/30"
                    }`}
                    onClick={() => handleItemClick(item)}
                  >
                    <div className="p-2.5 flex items-start gap-2.5">
                      {/* Type Icon */}
                      <div className={`w-7 h-7 rounded flex items-center justify-center bg-background/50 shrink-0 ${typeColors[item.type] || "text-foreground"}`}>
                        <TypeIcon className="w-3.5 h-3.5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-semibold text-foreground truncate">{item.title}</span>
                          <Badge variant="outline" className={`text-[9px] shrink-0 ${severityColors[item.severity] || severityColors.low}`}>
                            {item.severity.toUpperCase()}
                          </Badge>
                          {item.confidence >= 60 && (
                            <Badge variant="outline" className="text-[9px] shrink-0 text-cyan-400 border-cyan-500/30">
                              {item.confidence}%
                            </Badge>
                          )}
                        </div>

                        {!isExpanded && item.content && (
                          <p className="text-[11px] text-muted-foreground line-clamp-1">{item.content.substring(0, 150)}</p>
                        )}

                        {/* Provenance footer */}
                        <div className="flex items-center gap-2 mt-1 text-[9px] text-muted-foreground font-mono">
                          <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{timeAgo(item.timestamp)}</span>
                          <span className="px-1 py-0.5 rounded bg-background/50 border border-border/30">{item.source}</span>
                          {item.latitude !== null && (
                            <span className="flex items-center gap-0.5 text-neon-cyan"><MapPin className="w-2.5 h-2.5" />{item.latitude.toFixed(1)},{item.longitude!.toFixed(1)}</span>
                          )}
                          {item.tags.length > 0 && (
                            <span className="flex items-center gap-0.5"><Hash className="w-2.5 h-2.5" />{item.tags.slice(0, 2).join(", ")}</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); copyRecord(item); }} className="p-1 rounded hover:bg-background/50 text-muted-foreground hover:text-foreground transition-colors">
                          <Copy className="w-3 h-3" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); shareRecord(item); }} className="p-1 rounded hover:bg-background/50 text-muted-foreground hover:text-foreground transition-colors">
                          <Share2 className="w-3 h-3" />
                        </button>
                        {item.url && (
                          <button onClick={(e) => { e.stopPropagation(); openLink(item.url!, item.title); }} className="p-1 rounded hover:bg-background/50 text-muted-foreground hover:text-foreground transition-colors">
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                        <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </div>

                    {/* Expanded Detail */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                          <div className="px-2.5 pb-2.5 pt-1 border-t border-border/30 space-y-2">
                            {item.content && (
                              <div>
                                <h4 className="text-[9px] font-bold text-muted-foreground mb-0.5">CONTENT</h4>
                                <p className="text-[11px] text-foreground/80 whitespace-pre-wrap">{item.content}</p>
                              </div>
                            )}
                            {item.entities.length > 0 && (
                              <div>
                                <h4 className="text-[9px] font-bold text-muted-foreground mb-0.5">ENTITIES ({item.entities.length})</h4>
                                <div className="flex flex-wrap gap-1">
                                  {item.entities.map((e: any, idx: number) => (
                                    <Badge key={idx} variant="outline" className="text-[9px]">{e.type}: {e.name}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {item.transformationChain.length > 0 && (
                              <div>
                                <h4 className="text-[9px] font-bold text-muted-foreground mb-0.5">PIPELINE</h4>
                                <div className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground">
                                  {item.transformationChain.map((step: string, idx: number) => (
                                    <span key={idx} className="flex items-center gap-0.5">
                                      {idx > 0 && <ChevronRight className="w-2.5 h-2.5" />}
                                      <span className="px-1 py-0.5 rounded bg-background/50 border border-border/30">{step}</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 pt-1 border-t border-border/20">
                              <Button variant="outline" size="sm" className="text-[10px] h-6 gap-1 text-cyan-400 border-cyan-500/30" onClick={(e) => { e.stopPropagation(); handleAddToCase(item); }}>
                                <Briefcase className="w-3 h-3" /> ADD TO CASE
                              </Button>
                              <Button variant="outline" size="sm" className="text-[10px] h-6 gap-1 text-neon-magenta border-neon-magenta/30" onClick={(e) => { e.stopPropagation(); handleRunPlaybook(item); }}>
                                <Play className="w-3 h-3" /> RUN PLAYBOOK
                              </Button>
                              <Button variant="outline" size="sm" className="text-[10px] h-6 gap-1 text-orange-400 border-orange-500/30" onClick={(e) => { e.stopPropagation(); toast.success("Item flagged for review"); }}>
                                <Flag className="w-3 h-3" /> FLAG
                              </Button>
                            </div>
                            <div className="text-[9px] font-mono text-muted-foreground/50">
                              Provenance: {item.source} | {new Date(item.timestamp).toISOString()} | [{item.transformationChain.join(" → ")}]
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Empty state */}
            {!osintLoading && filteredFeed.length === 0 && (
              <div className="text-center py-16">
                <Radio className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-sm font-bold text-muted-foreground">NO RECORDS IN FEED</h3>
                <p className="text-xs text-muted-foreground/60 mt-1">Use INGEST to add records, or wait for automated collectors.</p>
              </div>
            )}

            {/* Load more trigger */}
            <div ref={loadMoreRef} className="h-8 flex items-center justify-center">
              {osintLoading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" /> Loading more records...
                </div>
              )}
              {osintData?.hasMore && !osintLoading && (
                <Button variant="ghost" size="sm" onClick={() => setOffset((p) => p + 30)} className="text-xs">Load more</Button>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Map Correlation Panel */}
        <AnimatePresence>
          {showMap && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "50%", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="rounded-lg overflow-hidden border border-border/30 relative"
            >
              <MapView
                initialCenter={{ lat: 20, lng: 0 }}
                initialZoom={2}
                onMapReady={(map) => {
                  mapRef.current = map;
                  setMapReady(true);
                  // Dark map style
                  map.setOptions({
                    mapId: "DEMO_MAP_ID",
                    styles: [
                      { elementType: "geometry", stylers: [{ color: "#0a0e17" }] },
                      { elementType: "labels.text.stroke", stylers: [{ color: "#0a0e17" }] },
                      { elementType: "labels.text.fill", stylers: [{ color: "#5a6a7a" }] },
                      { featureType: "water", elementType: "geometry", stylers: [{ color: "#0d1520" }] },
                      { featureType: "road", elementType: "geometry", stylers: [{ color: "#1a2535" }] },
                    ],
                  });
                }}
              />
              {/* Map Stats Overlay */}
              <div className="absolute top-2 left-2 glass-panel rounded-lg px-3 py-2 text-[10px] font-mono text-foreground/80 space-y-0.5">
                <div className="flex items-center gap-1"><MapPin className="w-3 h-3 text-neon-cyan" /> {geoItems.length} geo-tagged items</div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500" /> Critical
                  <div className="w-2 h-2 rounded-full bg-orange-500 ml-1" /> High
                  <div className="w-2 h-2 rounded-full bg-yellow-500 ml-1" /> Med
                  <div className="w-2 h-2 rounded-full bg-green-500 ml-1" /> Low
                </div>
              </div>
              {highlightedItemId && (
                <div className="absolute bottom-2 left-2 right-2 glass-panel rounded-lg px-3 py-2">
                  <div className="text-xs font-semibold text-foreground truncate">
                    {filteredFeed.find(i => i.id === highlightedItemId)?.title}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {filteredFeed.find(i => i.id === highlightedItemId)?.source} — Click feed item for details
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add to Case Modal */}
      <Dialog open={!!addToCaseItem} onOpenChange={(open) => !open && setAddToCaseItem(null)}>
        <DialogContent className="bg-card border-border/50 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-cyan-400" /> ADD TO CASE
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="glass-panel rounded-lg p-2 text-xs">
              <div className="font-semibold text-foreground truncate">{addToCaseItem?.title}</div>
              <div className="text-muted-foreground mt-0.5">{addToCaseItem?.source} — {addToCaseItem?.type}</div>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">SELECT EXISTING CASE</label>
              <Select value={selectedCaseId?.toString() || ""} onValueChange={(v) => { setSelectedCaseId(Number(v)); setNewCaseTitle(""); }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Choose a case..." />
                </SelectTrigger>
                <SelectContent>
                  {(casesData as any[])?.map((c: any) => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-center text-[10px] text-muted-foreground">— OR —</div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">CREATE NEW CASE</label>
              <Input
                className="h-8 text-xs"
                placeholder="New case title..."
                value={newCaseTitle}
                onChange={(e) => { setNewCaseTitle(e.target.value); setSelectedCaseId(null); }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAddToCaseItem(null)}>Cancel</Button>
            <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700" onClick={handleConfirmAddToCase}
              disabled={!selectedCaseId && !newCaseTitle}>
              {addEvidence.isPending ? "Adding..." : "Add Evidence"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Run Playbook Modal */}
      <Dialog open={!!runPlaybookItem} onOpenChange={(open) => !open && setRunPlaybookItem(null)}>
        <DialogContent className="bg-card border-border/50 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Play className="w-4 h-4 text-neon-magenta" /> RUN PLAYBOOK
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="glass-panel rounded-lg p-2 text-xs">
              <div className="font-semibold text-foreground truncate">{runPlaybookItem?.title}</div>
              <div className="text-muted-foreground mt-0.5">{runPlaybookItem?.source} — {runPlaybookItem?.type}</div>
            </div>
            <div className="space-y-1.5">
              {["domain-recon", "ip-enrichment", "person-osint", "threat-assessment", "media-forensics"].map((pb) => (
                <button
                  key={pb}
                  onClick={() => {
                    toast.success(`Playbook "${pb}" queued for: ${runPlaybookItem?.title}`);
                    setRunPlaybookItem(null);
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded-lg border border-border/30 hover:border-neon-magenta/50 hover:bg-neon-magenta/5 transition-all text-left"
                >
                  <Zap className="w-3.5 h-3.5 text-neon-magenta shrink-0" />
                  <div>
                    <div className="text-xs font-semibold">{pb.replace(/-/g, " ").toUpperCase()}</div>
                    <div className="text-[10px] text-muted-foreground">Automated enrichment pipeline</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
