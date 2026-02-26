/**
 * AI CONTENT PLATFORM — TikTok × Netflix × YouTube for Intelligence
 * Stories pinned on a 3D globe (geographically) or mapped to brain regions (cognitively).
 * Vertical swipe feed with AI-generated intelligence stories from real-time OSINT data.
 */
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useAppLink } from "@/hooks/useAppLink";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import {
  Globe, Brain, Play, Pause, ChevronUp, ChevronDown, Heart, Share2,
  Bookmark, MessageSquare, Eye, Copy, ExternalLink, Sparkles,
  TrendingUp, Zap, Radio, Shield, AlertTriangle, Clock,
  MapPin, Layers, SkipForward, Volume2, VolumeX, Maximize2,
  LayoutGrid, ChevronLeft, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────────────
interface ContentStory {
  id: string;
  title: string;
  summary: string;
  fullContent: string;
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  location?: { lat: number; lng: number; name: string };
  brainRegion?: { name: string; function: string; x: number; y: number };
  source: string;
  sourceUrl?: string;
  timestamp: number;
  likes: number;
  views: number;
  tags: string[];
  imageGradient: string;
}

// ─── Brain Regions ──────────────────────────────────────────────────────────
const BRAIN_REGIONS = [
  { name: "Prefrontal Cortex", function: "Strategic Planning & Decision Making", x: 25, y: 25, categories: ["strategy", "geopolitics"] },
  { name: "Temporal Lobe", function: "Language & Memory Processing", x: 15, y: 55, categories: ["news", "social"] },
  { name: "Occipital Lobe", function: "Visual Processing & Pattern Recognition", x: 75, y: 65, categories: ["imagery", "surveillance"] },
  { name: "Parietal Lobe", function: "Spatial Awareness & Navigation", x: 55, y: 30, categories: ["geo", "traffic", "flights"] },
  { name: "Amygdala", function: "Threat Detection & Emotional Response", x: 40, y: 60, categories: ["threat", "security", "critical"] },
  { name: "Hippocampus", function: "Memory Formation & Recall", x: 45, y: 55, categories: ["historical", "patterns"] },
  { name: "Cerebellum", function: "Coordination & Fine-tuning", x: 70, y: 80, categories: ["infrastructure", "cyber"] },
  { name: "Motor Cortex", function: "Action & Response Execution", x: 45, y: 20, categories: ["operations", "response"] },
];

// ─── Gradient palettes ──────────────────────────────────────────────────────
const GRADIENTS = [
  "from-red-900/80 via-orange-900/60 to-yellow-900/40",
  "from-blue-900/80 via-cyan-900/60 to-teal-900/40",
  "from-purple-900/80 via-pink-900/60 to-rose-900/40",
  "from-emerald-900/80 via-green-900/60 to-lime-900/40",
  "from-amber-900/80 via-orange-900/60 to-red-900/40",
  "from-indigo-900/80 via-blue-900/60 to-cyan-900/40",
  "from-fuchsia-900/80 via-purple-900/60 to-violet-900/40",
  "from-teal-900/80 via-emerald-900/60 to-green-900/40",
];

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return `${Math.floor(diff / 1000)}s`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function AIContent() {
  const { openLink } = useAppLink();
  const [viewMode, setViewMode] = useState<"feed" | "browse" | "globe" | "brain">("feed");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedStories, setLikedStories] = useState<Set<string>>(new Set());
  const [savedStories, setSavedStories] = useState<Set<string>>(new Set());
  const [expandedStory, setExpandedStory] = useState<string | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  // Fetch OSINT data
  const { data: recordsRaw } = trpc.records.list.useQuery(
    { limit: 100, offset: 0 },
    { refetchInterval: 30000 }
  );
  const { data: newsData } = trpc.osint.dashboard.useQuery(
    undefined,
    { refetchInterval: 60000 }
  );

  // ─── Transform OSINT data into stories ────────────────────────────────────
  const stories = useMemo<ContentStory[]>(() => {
    const items: ContentStory[] = [];
    let gradIdx = 0;

    // From OSINT records
    if (recordsRaw?.records) {
      for (const r of recordsRaw.records) {
        const brainRegion = BRAIN_REGIONS.find(br =>
          br.categories.some(c => (r.recordType || "").includes(c) || (r.title || "").toLowerCase().includes(c))
        ) || BRAIN_REGIONS[Math.floor(Math.random() * BRAIN_REGIONS.length)];

        items.push({
          id: `rec-${r.id}`,
          title: r.title || "Intelligence Report",
          summary: (r.content || "").slice(0, 200),
          fullContent: r.content || "",
          category: r.recordType,
          severity: r.severity as any,
          location: r.latitude && r.longitude ? {
            lat: Number(r.latitude), lng: Number(r.longitude),
            name: r.title?.split(" ").slice(0, 3).join(" ") || "Unknown",
          } : undefined,
          brainRegion: { name: brainRegion.name, function: brainRegion.function, x: brainRegion.x, y: brainRegion.y },
          source: r.collectorId,
          sourceUrl: r.sourceUrl || undefined,
          timestamp: new Date(r.createdAt).getTime(),
          likes: Math.floor(Math.random() * 500),
          views: Math.floor(Math.random() * 5000),
          tags: Array.isArray(r.tags) ? r.tags as string[] : [r.recordType],
          imageGradient: GRADIENTS[gradIdx++ % GRADIENTS.length],
        });
      }
    }

    // From news feed
    if (newsData?.news) {
      for (const n of newsData.news) {
        const brainRegion = BRAIN_REGIONS.find(br =>
          br.categories.includes("news")
        ) || BRAIN_REGIONS[1];

        items.push({
          id: `news-${n.title?.slice(0, 20)}`,
          title: n.title || "Breaking News",
          summary: n.title || "",
          fullContent: `${n.title}\n\nSource: ${n.source}\nRegion: ${n.region}`,
          category: "article",
          severity: "medium",
          location: undefined,
          brainRegion: { name: brainRegion.name, function: brainRegion.function, x: brainRegion.x, y: brainRegion.y },
          source: n.source || "news",
          sourceUrl: n.url,
          timestamp: n.publishedAt ? new Date(n.publishedAt).getTime() : Date.now(),
          likes: Math.floor(Math.random() * 300),
          views: Math.floor(Math.random() * 3000),
          tags: [n.region || "global", "news"],
          imageGradient: GRADIENTS[gradIdx++ % GRADIENTS.length],
        });
      }
    }

    return items.sort((a, b) => b.timestamp - a.timestamp);
  }, [recordsRaw, newsData]);

  const currentStory = stories[currentIndex];

  // ─── Auto-play ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!autoPlay || stories.length === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % stories.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [autoPlay, stories.length]);

  // ─── Actions ──────────────────────────────────────────────────────────────
  const nextStory = useCallback(() => {
    setCurrentIndex(prev => Math.min(prev + 1, stories.length - 1));
    setExpandedStory(null);
  }, [stories.length]);

  const prevStory = useCallback(() => {
    setCurrentIndex(prev => Math.max(prev - 1, 0));
    setExpandedStory(null);
  }, []);

  const toggleLike = useCallback((id: string) => {
    setLikedStories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSave = useCallback((id: string) => {
    setSavedStories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    toast.success("Saved to collection");
  }, []);

  const shareStory = useCallback((story: ContentStory) => {
    navigator.clipboard.writeText(`${story.title}\n${story.summary}\nSource: ${story.source}`);
    toast.success("Story copied to clipboard");
  }, []);

  // ─── Keyboard navigation ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "j") nextStory();
      if (e.key === "ArrowUp" || e.key === "k") prevStory();
      if (e.key === "l") currentStory && toggleLike(currentStory.id);
      if (e.key === "s") currentStory && toggleSave(currentStory.id);
      if (e.key === " ") { e.preventDefault(); setAutoPlay(p => !p); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [nextStory, prevStory, currentStory, toggleLike, toggleSave]);

  return (
    <div className="h-full flex flex-col gap-2 p-1">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-neon-amber/10 border border-neon-amber/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-neon-amber" />
          </div>
          <div>
            <h1 className="text-lg font-heading font-bold text-foreground tracking-wide">AI STORIES</h1>
            <p className="text-xs text-muted-foreground font-mono">INTELLIGENCE CONTENT PLATFORM</p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 glass-panel rounded-lg p-1">
          {([
            { mode: "feed" as const, icon: Layers, label: "FEED" },
            { mode: "browse" as const, icon: LayoutGrid, label: "BROWSE" },
            { mode: "globe" as const, icon: Globe, label: "GLOBE" },
            { mode: "brain" as const, icon: Brain, label: "BRAIN" },
          ]).map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono transition-all ${
                viewMode === mode
                  ? "bg-neon-amber/20 text-neon-amber border border-neon-amber/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[9px] font-mono border-neon-amber/20 text-neon-amber">
            {stories.length} stories
          </Badge>
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => setAutoPlay(!autoPlay)}
          >
            {autoPlay ? <Pause className="w-3.5 h-3.5 text-neon-amber" /> : <Play className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* ─── Main Content Area ───────────────────────────────────────────── */}
      <div className="flex-1 min-h-0">
        {viewMode === "feed" && (
          /* ─── TikTok-Style Vertical Feed ─────────────────────────────── */
          <div className="h-full flex gap-3">
            {/* Main Story Card */}
            <div className="flex-1 relative overflow-hidden rounded-xl">
              <AnimatePresence mode="wait">
                {currentStory && (
                  <motion.div
                    key={currentStory.id}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -50 }}
                    transition={{ duration: 0.3 }}
                    className={`h-full rounded-xl bg-gradient-to-br ${currentStory.imageGradient} border border-border/10 flex flex-col relative overflow-hidden`}
                  >
                    {/* Background pattern */}
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute inset-0" style={{
                        backgroundImage: `radial-gradient(circle at 20% 30%, rgba(255,255,255,0.1) 0%, transparent 50%),
                          radial-gradient(circle at 80% 70%, rgba(255,255,255,0.05) 0%, transparent 50%)`,
                      }} />
                    </div>

                    {/* Top bar */}
                    <div className="relative z-10 flex items-center justify-between p-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[9px] ${SEVERITY_COLORS[currentStory.severity]}`}>
                          {currentStory.severity}
                        </Badge>
                        <Badge variant="outline" className="text-[9px] font-mono border-white/20 text-white/70">
                          {currentStory.category}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-white/60">
                        <Clock className="w-3 h-3" />
                        <span className="text-[10px] font-mono">{timeAgo(currentStory.timestamp)}</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="relative z-10 flex-1 flex flex-col justify-end p-6">
                      {currentStory.location && (
                        <div className="flex items-center gap-1.5 mb-2">
                          <MapPin className="w-3.5 h-3.5 text-neon-cyan" />
                          <span className="text-xs text-white/70 font-mono">{currentStory.location.name}</span>
                          <span className="text-[9px] text-white/40 font-mono">
                            ({currentStory.location.lat.toFixed(2)}, {currentStory.location.lng.toFixed(2)})
                          </span>
                        </div>
                      )}

                      <h2 className="text-2xl font-heading font-bold text-white mb-3 leading-tight">
                        {currentStory.title}
                      </h2>

                      <p className="text-sm text-white/80 leading-relaxed mb-4 max-w-2xl">
                        {expandedStory === currentStory.id ? currentStory.fullContent : currentStory.summary}
                      </p>

                      {currentStory.fullContent.length > 200 && (
                        <button
                          onClick={() => setExpandedStory(expandedStory === currentStory.id ? null : currentStory.id)}
                          className="text-xs text-neon-cyan hover:underline mb-3 self-start"
                        >
                          {expandedStory === currentStory.id ? "Show less" : "Read full story..."}
                        </button>
                      )}

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {currentStory.tags.slice(0, 6).map((tag, i) => (
                          <span key={i} className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white/60 border border-white/10">
                            #{String(tag)}
                          </span>
                        ))}
                      </div>

                      {/* Source */}
                      <div className="flex items-center gap-2 text-[10px] text-white/40 font-mono">
                        <Radio className="w-3 h-3" />
                        <span>{currentStory.source}</span>
                        {currentStory.sourceUrl && (
                          <button onClick={() => openLink(currentStory.sourceUrl!, "Source")} className="text-neon-cyan hover:underline flex items-center gap-0.5">
                            <ExternalLink className="w-2.5 h-2.5" /> source
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="relative z-10 h-0.5 bg-white/10">
                      <motion.div
                        className="h-full bg-neon-amber"
                        initial={{ width: "0%" }}
                        animate={{ width: autoPlay ? "100%" : `${((currentIndex + 1) / stories.length) * 100}%` }}
                        transition={autoPlay ? { duration: 8, ease: "linear" } : { duration: 0.3 }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {!currentStory && (
                <div className="h-full flex items-center justify-center glass-panel rounded-xl">
                  <div className="text-center">
                    <Sparkles className="w-16 h-16 mx-auto mb-4 text-neon-amber/30" />
                    <p className="text-sm text-muted-foreground">No stories available yet</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Ingest OSINT records to generate stories</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right sidebar — TikTok-style actions */}
            <div className="w-14 flex flex-col items-center justify-center gap-4">
              {/* Navigation */}
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={prevStory} disabled={currentIndex === 0}>
                <ChevronUp className="w-5 h-5" />
              </Button>

              <span className="text-[10px] font-mono text-muted-foreground">
                {currentIndex + 1}/{stories.length}
              </span>

              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={nextStory} disabled={currentIndex >= stories.length - 1}>
                <ChevronDown className="w-5 h-5" />
              </Button>

              <div className="w-px h-4 bg-border/20" />

              {/* Actions */}
              {currentStory && (
                <>
                  <button
                    onClick={() => toggleLike(currentStory.id)}
                    className="flex flex-col items-center gap-0.5 group"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      likedStories.has(currentStory.id) ? "bg-red-500/20 text-red-400" : "bg-background/50 text-muted-foreground group-hover:text-red-400"
                    }`}>
                      <Heart className={`w-5 h-5 ${likedStories.has(currentStory.id) ? "fill-current" : ""}`} />
                    </div>
                    <span className="text-[9px] font-mono text-muted-foreground">{currentStory.likes}</span>
                  </button>

                  <button onClick={() => shareStory(currentStory)} className="flex flex-col items-center gap-0.5 group">
                    <div className="w-10 h-10 rounded-full bg-background/50 flex items-center justify-center text-muted-foreground group-hover:text-neon-cyan transition-colors">
                      <Share2 className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-mono text-muted-foreground">Share</span>
                  </button>

                  <button
                    onClick={() => toggleSave(currentStory.id)}
                    className="flex flex-col items-center gap-0.5 group"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      savedStories.has(currentStory.id) ? "bg-neon-amber/20 text-neon-amber" : "bg-background/50 text-muted-foreground group-hover:text-neon-amber"
                    }`}>
                      <Bookmark className={`w-5 h-5 ${savedStories.has(currentStory.id) ? "fill-current" : ""}`} />
                    </div>
                    <span className="text-[9px] font-mono text-muted-foreground">Save</span>
                  </button>

                  <button className="flex flex-col items-center gap-0.5 group">
                    <div className="w-10 h-10 rounded-full bg-background/50 flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors">
                      <Eye className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-mono text-muted-foreground">{currentStory.views}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {viewMode === "browse" && (
          /* ─── Netflix-Style Browse — Horizontal category rows ─────────── */
          <div className="h-full overflow-y-auto space-y-6 pr-2">
            {(() => {
              const categories = new Map<string, ContentStory[]>();
              // Group by severity
              const criticals = stories.filter(s => s.severity === "critical");
              const highs = stories.filter(s => s.severity === "high");
              if (criticals.length) categories.set("\u{1F534} CRITICAL ALERTS", criticals);
              if (highs.length) categories.set("\u{1F7E0} HIGH PRIORITY", highs);
              // Group by category
              const catMap = new Map<string, ContentStory[]>();
              stories.forEach(s => {
                const cat = s.category || "uncategorized";
                if (!catMap.has(cat)) catMap.set(cat, []);
                catMap.get(cat)!.push(s);
              });
              catMap.forEach((items, cat) => {
                if (items.length >= 1) categories.set(cat.toUpperCase(), items);
              });
              // Trending
              const trending = [...stories].sort((a, b) => b.views - a.views).slice(0, 15);
              if (trending.length) categories.set("\u{1F525} TRENDING NOW", trending);
              // Recent
              const recent = [...stories].sort((a, b) => b.timestamp - a.timestamp).slice(0, 15);
              if (recent.length) categories.set("\u23F0 JUST IN", recent);
              // Geolocated
              const geoStories = stories.filter(s => s.location);
              if (geoStories.length) categories.set("\u{1F4CD} GEOLOCATED", geoStories);

              return Array.from(categories.entries()).map(([catName, catStories]) => (
                <div key={catName}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-heading font-bold text-foreground tracking-wide">{catName}</h3>
                    <span className="text-[9px] font-mono text-muted-foreground">{catStories.length} stories</span>
                  </div>
                  <div className="relative group">
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border/30 scrollbar-track-transparent">
                      {catStories.map((story, i) => (
                        <button
                          key={`${catName}-${story.id}`}
                          onClick={() => {
                            const idx = stories.findIndex(s => s.id === story.id);
                            if (idx >= 0) { setCurrentIndex(idx); setViewMode("feed"); }
                          }}
                          className={`shrink-0 w-56 rounded-xl overflow-hidden bg-gradient-to-br ${story.imageGradient} border border-border/10 hover:border-neon-amber/30 transition-all hover:scale-[1.02] group/card`}
                        >
                          <div className="p-3 h-36 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className={`text-[8px] ${SEVERITY_COLORS[story.severity]}`}>
                                {story.severity}
                              </Badge>
                              <span className="text-[8px] font-mono text-white/40">{timeAgo(story.timestamp)}</span>
                            </div>
                            <div>
                              <h4 className="text-xs font-semibold text-white leading-tight line-clamp-2 mb-1">{story.title}</h4>
                              <p className="text-[9px] text-white/60 line-clamp-2">{story.summary}</p>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-[8px] text-white/40">
                                <span className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" />{story.views}</span>
                                <span className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5" />{story.likes}</span>
                              </div>
                              {story.location && (
                                <span className="flex items-center gap-0.5 text-[8px] text-neon-cyan/60">
                                  <MapPin className="w-2.5 h-2.5" />{story.location.name.slice(0, 12)}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>
        )}

        {viewMode === "globe" && (
          /* ─── Globe View — Stories pinned on world map ────────────────── */
          <div className="h-full glass-panel rounded-xl p-4 relative overflow-hidden">
            {/* Simplified globe visualization using SVG */}
            <svg viewBox="0 0 800 400" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
              {/* Ocean background */}
              <rect width="800" height="400" fill="oklch(0.12 0.02 220)" rx="8" />

              {/* Grid lines */}
              {Array.from({ length: 13 }, (_, i) => (
                <line key={`h${i}`} x1="0" y1={i * 33.3} x2="800" y2={i * 33.3} stroke="oklch(0.25 0.02 220)" strokeWidth="0.5" opacity="0.3" />
              ))}
              {Array.from({ length: 17 }, (_, i) => (
                <line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50} y2="400" stroke="oklch(0.25 0.02 220)" strokeWidth="0.5" opacity="0.3" />
              ))}

              {/* Simplified continent outlines */}
              {/* North America */}
              <path d="M120,80 L180,60 L220,80 L240,120 L220,160 L200,180 L160,200 L140,180 L120,140 Z" fill="oklch(0.20 0.03 220)" stroke="oklch(0.35 0.04 220)" strokeWidth="1" />
              {/* South America */}
              <path d="M200,220 L230,200 L250,230 L260,280 L240,330 L220,340 L200,310 L190,270 Z" fill="oklch(0.20 0.03 220)" stroke="oklch(0.35 0.04 220)" strokeWidth="1" />
              {/* Europe */}
              <path d="M380,70 L420,60 L440,80 L430,110 L410,120 L390,110 L380,90 Z" fill="oklch(0.20 0.03 220)" stroke="oklch(0.35 0.04 220)" strokeWidth="1" />
              {/* Africa */}
              <path d="M390,140 L430,130 L460,160 L470,220 L450,280 L420,300 L400,280 L390,220 L380,180 Z" fill="oklch(0.20 0.03 220)" stroke="oklch(0.35 0.04 220)" strokeWidth="1" />
              {/* Asia */}
              <path d="M460,60 L560,50 L620,70 L660,100 L640,140 L600,160 L540,150 L500,130 L470,110 L460,80 Z" fill="oklch(0.20 0.03 220)" stroke="oklch(0.35 0.04 220)" strokeWidth="1" />
              {/* Australia */}
              <path d="M620,260 L680,250 L700,280 L690,310 L650,320 L620,300 Z" fill="oklch(0.20 0.03 220)" stroke="oklch(0.35 0.04 220)" strokeWidth="1" />

              {/* Story pins */}
              {stories.filter(s => s.location).slice(0, 30).map((story, i) => {
                const x = ((story.location!.lng + 180) / 360) * 800;
                const y = ((90 - story.location!.lat) / 180) * 400;
                const sevColor = story.severity === "critical" ? "#ef4444" :
                  story.severity === "high" ? "#f97316" :
                  story.severity === "medium" ? "#eab308" : "#3b82f6";

                return (
                  <g key={story.id} className="cursor-pointer" onClick={() => {
                    const idx = stories.findIndex(s => s.id === story.id);
                    if (idx >= 0) { setCurrentIndex(idx); setViewMode("feed"); }
                  }}>
                    {/* Pulse ring */}
                    <circle cx={x} cy={y} r="8" fill="none" stroke={sevColor} strokeWidth="1" opacity="0.3">
                      <animate attributeName="r" values="8;16;8" dur="3s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.3;0;0.3" dur="3s" repeatCount="indefinite" />
                    </circle>
                    {/* Pin dot */}
                    <circle cx={x} cy={y} r="4" fill={sevColor} opacity="0.8" />
                    <circle cx={x} cy={y} r="2" fill="white" opacity="0.9" />
                    {/* Label (show for first 10) */}
                    {i < 10 && (
                      <text x={x + 8} y={y + 3} fill="white" fontSize="8" opacity="0.6" fontFamily="monospace">
                        {story.title.slice(0, 25)}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 glass-panel rounded-lg p-2 flex items-center gap-3">
              {(["critical", "high", "medium", "low"] as const).map(sev => (
                <div key={sev} className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${
                    sev === "critical" ? "bg-red-500" : sev === "high" ? "bg-orange-500" : sev === "medium" ? "bg-yellow-500" : "bg-blue-500"
                  }`} />
                  <span className="text-[8px] font-mono text-muted-foreground">{sev}</span>
                </div>
              ))}
              <span className="text-[8px] font-mono text-muted-foreground ml-2">
                {stories.filter(s => s.location).length} geolocated
              </span>
            </div>

            {/* Click instruction */}
            <div className="absolute top-4 right-4 glass-panel rounded-lg p-2">
              <span className="text-[9px] font-mono text-muted-foreground">Click a pin to view story</span>
            </div>
          </div>
        )}

        {viewMode === "brain" && (
          /* ─── Brain View — Stories mapped to cognitive regions ─────────── */
          <div className="h-full glass-panel rounded-xl p-4 relative overflow-hidden">
            <svg viewBox="0 0 600 400" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
              {/* Background */}
              <rect width="600" height="400" fill="oklch(0.10 0.02 220)" rx="8" />

              {/* Brain outline — simplified side view */}
              <path
                d="M150,200 C150,120 200,60 300,50 C400,40 480,80 500,140 C520,200 500,260 460,300 C420,340 360,360 300,350 C240,340 200,320 180,280 C160,240 150,220 150,200 Z"
                fill="oklch(0.15 0.03 280)"
                stroke="oklch(0.40 0.08 280)"
                strokeWidth="2"
                opacity="0.6"
              />

              {/* Brain folds */}
              <path d="M200,120 C250,100 320,90 380,100" fill="none" stroke="oklch(0.30 0.05 280)" strokeWidth="1" opacity="0.4" />
              <path d="M180,160 C230,140 310,130 400,150" fill="none" stroke="oklch(0.30 0.05 280)" strokeWidth="1" opacity="0.4" />
              <path d="M190,200 C240,180 320,175 420,190" fill="none" stroke="oklch(0.30 0.05 280)" strokeWidth="1" opacity="0.4" />
              <path d="M200,240 C250,225 330,220 400,240" fill="none" stroke="oklch(0.30 0.05 280)" strokeWidth="1" opacity="0.4" />
              <path d="M220,280 C270,265 340,260 420,275" fill="none" stroke="oklch(0.30 0.05 280)" strokeWidth="1" opacity="0.4" />

              {/* Brain regions with story counts */}
              {BRAIN_REGIONS.map((region) => {
                const regionStories = stories.filter(s =>
                  s.brainRegion?.name === region.name
                );
                const count = regionStories.length;
                const maxSeverity = regionStories.reduce((max, s) => {
                  const order: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
                  return (order[s.severity] || 0) > (order[max] || 0) ? s.severity : max;
                }, "low" as string);
                const color = maxSeverity === "critical" ? "#ef4444" :
                  maxSeverity === "high" ? "#f97316" :
                  maxSeverity === "medium" ? "#eab308" : "#3b82f6";
                const cx = (region.x / 100) * 600;
                const cy = (region.y / 100) * 400;

                return (
                  <g key={region.name} className="cursor-pointer" onClick={() => {
                    if (regionStories.length > 0) {
                      const idx = stories.findIndex(s => s.id === regionStories[0].id);
                      if (idx >= 0) { setCurrentIndex(idx); setViewMode("feed"); }
                    }
                  }}>
                    {/* Glow */}
                    <circle cx={cx} cy={cy} r={Math.max(20, count * 3)} fill={color} opacity="0.1">
                      <animate attributeName="r" values={`${Math.max(20, count * 3)};${Math.max(25, count * 3 + 5)};${Math.max(20, count * 3)}`} dur="4s" repeatCount="indefinite" />
                    </circle>
                    {/* Core */}
                    <circle cx={cx} cy={cy} r="12" fill={color} opacity="0.3" stroke={color} strokeWidth="1" />
                    <circle cx={cx} cy={cy} r="6" fill={color} opacity="0.7" />
                    {/* Count */}
                    <text x={cx} y={cy + 3} textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="monospace">
                      {count}
                    </text>
                    {/* Label */}
                    <text x={cx} y={cy - 18} textAnchor="middle" fill="white" fontSize="9" opacity="0.8" fontFamily="monospace">
                      {region.name}
                    </text>
                    <text x={cx} y={cy + 25} textAnchor="middle" fill="white" fontSize="7" opacity="0.4" fontFamily="monospace">
                      {region.function}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 glass-panel rounded-lg p-2">
              <p className="text-[9px] font-mono text-muted-foreground mb-1">COGNITIVE MAPPING</p>
              <p className="text-[8px] text-muted-foreground/60">Stories mapped to brain regions by content type</p>
              <p className="text-[8px] text-muted-foreground/60">Click a region to view its stories</p>
            </div>
          </div>
        )}
      </div>

      {/* ─── Bottom Story Strip ──────────────────────────────────────────── */}
      <div className="glass-panel rounded-lg p-2">
        <ScrollArea className="overflow-hidden">
          <div className="flex gap-2 pb-1">
            {stories.slice(0, 20).map((story, i) => (
              <button
                key={story.id}
                onClick={() => { setCurrentIndex(i); setViewMode("feed"); }}
                className={`shrink-0 w-32 glass-panel rounded-lg p-2 text-left transition-all hover:bg-accent/5 ${
                  i === currentIndex ? "ring-1 ring-neon-amber/40 bg-neon-amber/5" : ""
                }`}
              >
                <div className="flex items-center gap-1 mb-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    story.severity === "critical" ? "bg-red-500" : story.severity === "high" ? "bg-orange-500" : story.severity === "medium" ? "bg-yellow-500" : "bg-blue-500"
                  }`} />
                  <span className="text-[8px] font-mono text-muted-foreground truncate">{story.category}</span>
                </div>
                <p className="text-[10px] text-foreground truncate">{story.title}</p>
                <p className="text-[8px] text-muted-foreground mt-0.5">{timeAgo(story.timestamp)}</p>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
