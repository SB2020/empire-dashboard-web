/**
 * TIMELINE VIEW — Temporal Intelligence Visualization
 * See events in time to follow how a story unfolds.
 * Palantir-class temporal analysis with zoom, pan, entity filtering, and story threading.
 */
import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Filter, Search,
  AlertTriangle, Globe, Shield, Radio, Eye, Copy, ExternalLink,
  Calendar, Activity, TrendingUp, Layers, Maximize2, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { useAppLink } from "@/hooks/useAppLink";

// ─── Types ──────────────────────────────────────────────────────────────────
interface TimelineEvent {
  id: string;
  timestamp: number;
  title: string;
  content: string;
  type: "record" | "alert" | "command" | "entity" | "case";
  subType: string;
  severity: "low" | "medium" | "high" | "critical";
  sourceUrl?: string;
  latitude?: string;
  longitude?: string;
  entities?: string[];
  confidence?: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────
const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const SEVERITY_DOT: Record<string, string> = {
  critical: "bg-red-500 shadow-red-500/50",
  high: "bg-orange-500 shadow-orange-500/50",
  medium: "bg-yellow-500 shadow-yellow-500/50",
  low: "bg-blue-500 shadow-blue-500/50",
};

const TYPE_ICONS: Record<string, typeof Clock> = {
  record: Globe,
  alert: AlertTriangle,
  command: Radio,
  entity: Eye,
  case: Shield,
};

const ZOOM_LEVELS = [
  { label: "1H", ms: 3600000 },
  { label: "6H", ms: 21600000 },
  { label: "1D", ms: 86400000 },
  { label: "3D", ms: 259200000 },
  { label: "1W", ms: 604800000 },
  { label: "1M", ms: 2592000000 },
  { label: "3M", ms: 7776000000 },
  { label: "ALL", ms: 0 },
];

// ─── Utility ────────────────────────────────────────────────────────────────
function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function formatDateHeader(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function TimelineView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [zoomLevel, setZoomLevel] = useState(4); // 1W default
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set(["record", "alert", "command"]));
  const [selectedSeverities, setSelectedSeverities] = useState<Set<string>>(new Set(["critical", "high", "medium", "low"]));
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [viewMode, setViewMode] = useState<"vertical" | "horizontal">("vertical");
  const [centerTime, setCenterTime] = useState(Date.now());
  const timelineRef = useRef<HTMLDivElement>(null);
  const { openLink } = useAppLink();

  // Fetch OSINT records
  const { data: recordsRaw } = trpc.records.list.useQuery(
    { limit: 200, offset: 0 },
    { refetchInterval: 30000 }
  );
  const recordsData = recordsRaw?.records;

  // Fetch triage alerts
  const { data: alertsData } = trpc.triage.alerts.useQuery(
    { limit: 100 },
    { refetchInterval: 30000 }
  );

  // Fetch recent commands
  const { data: commandsData } = trpc.agents.history.useQuery(
    { limit: 100 },
    { refetchInterval: 30000 }
  );

  // ─── Transform data into timeline events ──────────────────────────────────
  const events = useMemo<TimelineEvent[]>(() => {
    const items: TimelineEvent[] = [];

    // OSINT Records
    if (recordsData) {
      for (const r of recordsData) {
        items.push({
          id: `rec-${r.id}`,
          timestamp: new Date(r.createdAt).getTime(),
          title: r.title || "Untitled Record",
          content: r.content || "",
          type: "record",
          subType: r.recordType,
          severity: r.severity as any,
          sourceUrl: r.sourceUrl || undefined,
          latitude: r.latitude || undefined,
          longitude: r.longitude || undefined,
          entities: Array.isArray(r.entities) ? r.entities as string[] : [],
          confidence: r.confidence || 50,
        });
      }
    }

    // Triage Alerts
    if (alertsData) {
      for (const a of alertsData) {
        const sev = a.score >= 80 ? "critical" : a.score >= 60 ? "high" : a.score >= 40 ? "medium" : "low";
        items.push({
          id: `alert-${a.id}`,
          timestamp: new Date(a.createdAt).getTime(),
          title: `Triage Alert — Score ${a.score}`,
          content: a.explanation || `Auto-triage alert with score ${a.score}`,
          type: "alert",
          subType: a.status,
          severity: sev,
          confidence: a.score,
        });
      }
    }

    // Agent Commands
    if (commandsData) {
      for (const c of commandsData) {
        items.push({
          id: `cmd-${c.id}`,
          timestamp: new Date(c.createdAt).getTime(),
          title: `[${(c.agentId || "unknown").toUpperCase()}] ${(c.command || "").slice(0, 80)}`,
          content: c.command || "",
          type: "command",
          subType: c.agentId || "unknown",
          severity: c.status === "failed" ? "high" : "low",
          confidence: c.status === "completed" ? 90 : 50,
        });
      }
    }

    return items.sort((a, b) => b.timestamp - a.timestamp);
  }, [recordsData, alertsData, commandsData]);

  // ─── Filtered events ──────────────────────────────────────────────────────
  const filteredEvents = useMemo(() => {
    let filtered = events.filter(e => selectedTypes.has(e.type) && selectedSeverities.has(e.severity));

    // Time window
    const zoom = ZOOM_LEVELS[zoomLevel];
    if (zoom.ms > 0) {
      const halfWindow = zoom.ms / 2;
      filtered = filtered.filter(e => Math.abs(e.timestamp - centerTime) <= halfWindow);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.content.toLowerCase().includes(q) ||
        e.subType.toLowerCase().includes(q) ||
        (e.entities || []).some(ent => ent.toLowerCase().includes(q))
      );
    }

    return filtered;
  }, [events, selectedTypes, selectedSeverities, zoomLevel, centerTime, searchQuery]);

  // ─── Group events by date ─────────────────────────────────────────────────
  const groupedEvents = useMemo(() => {
    const groups: Map<string, TimelineEvent[]> = new Map();
    for (const e of filteredEvents) {
      const dateKey = new Date(e.timestamp).toDateString();
      if (!groups.has(dateKey)) groups.set(dateKey, []);
      groups.get(dateKey)!.push(e);
    }
    return groups;
  }, [filteredEvents]);

  // ─── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: filteredEvents.length,
    critical: filteredEvents.filter(e => e.severity === "critical").length,
    high: filteredEvents.filter(e => e.severity === "high").length,
    records: filteredEvents.filter(e => e.type === "record").length,
    alerts: filteredEvents.filter(e => e.type === "alert").length,
  }), [filteredEvents]);

  // ─── Navigation ───────────────────────────────────────────────────────────
  const panTime = useCallback((direction: number) => {
    const zoom = ZOOM_LEVELS[zoomLevel];
    const step = zoom.ms > 0 ? zoom.ms / 4 : 86400000;
    setCenterTime(prev => prev + direction * step);
  }, [zoomLevel]);

  const resetView = useCallback(() => {
    setCenterTime(Date.now());
    setZoomLevel(4);
  }, []);

  const copyEvent = useCallback((event: TimelineEvent) => {
    const text = `[${new Date(event.timestamp).toISOString()}] ${event.title}\n${event.content}\nSeverity: ${event.severity} | Type: ${event.type}/${event.subType}${event.sourceUrl ? `\nSource: ${event.sourceUrl}` : ""}`;
    navigator.clipboard.writeText(text);
    toast.success("Event copied to clipboard");
  }, []);

  const toggleType = useCallback((type: string) => {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const toggleSeverity = useCallback((sev: string) => {
    setSelectedSeverities(prev => {
      const next = new Set(prev);
      if (next.has(sev)) next.delete(sev);
      else next.add(sev);
      return next;
    });
  }, []);

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") panTime(-1);
      if (e.key === "ArrowRight") panTime(1);
      if (e.key === "+" || e.key === "=") setZoomLevel(z => Math.max(0, z - 1));
      if (e.key === "-") setZoomLevel(z => Math.min(ZOOM_LEVELS.length - 1, z + 1));
      if (e.key === "Escape") setSelectedEvent(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [panTime]);

  return (
    <div className="h-full flex flex-col gap-3 p-1">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center">
            <Clock className="w-5 h-5 text-neon-cyan" />
          </div>
          <div>
            <h1 className="text-lg font-heading font-bold text-foreground tracking-wide">TIMELINE</h1>
            <p className="text-xs text-muted-foreground font-mono">TEMPORAL INTELLIGENCE ANALYSIS</p>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-muted-foreground">{stats.total} events</span>
          {stats.critical > 0 && <span className="text-red-400">{stats.critical} CRITICAL</span>}
          {stats.high > 0 && <span className="text-orange-400">{stats.high} HIGH</span>}
          <span className="text-neon-cyan">{stats.records} records</span>
          <span className="text-neon-amber">{stats.alerts} alerts</span>
        </div>
      </div>

      {/* ─── Controls Bar ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap glass-panel p-2 rounded-lg">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search events, entities, sources..."
            className="pl-8 h-8 text-xs bg-background/50 border-border/30"
          />
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 border-l border-border/20 pl-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoomLevel(z => Math.max(0, z - 1))}>
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
          <div className="flex gap-0.5">
            {ZOOM_LEVELS.map((z, i) => (
              <button
                key={z.label}
                onClick={() => setZoomLevel(i)}
                className={`px-1.5 py-0.5 text-[10px] font-mono rounded transition-colors ${
                  i === zoomLevel ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {z.label}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoomLevel(z => Math.min(ZOOM_LEVELS.length - 1, z + 1))}>
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Pan Controls */}
        <div className="flex items-center gap-1 border-l border-border/20 pl-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => panTime(-1)}>
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <button onClick={resetView} className="text-[10px] font-mono text-muted-foreground hover:text-neon-cyan transition-colors px-1">
            NOW
          </button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => panTime(1)}>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 border-l border-border/20 pl-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetView} title="Reset view">
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* ─── Filter Bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[10px] font-mono text-muted-foreground mr-1">TYPE:</span>
        {(["record", "alert", "command"] as const).map(type => {
          const Icon = TYPE_ICONS[type];
          return (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono transition-all border ${
                selectedTypes.has(type)
                  ? "bg-neon-cyan/10 text-neon-cyan border-neon-cyan/30"
                  : "text-muted-foreground border-transparent hover:border-border/30"
              }`}
            >
              <Icon className="w-3 h-3" />
              {type.toUpperCase()}
            </button>
          );
        })}

        <span className="text-[10px] font-mono text-muted-foreground ml-2 mr-1">SEVERITY:</span>
        {(["critical", "high", "medium", "low"] as const).map(sev => (
          <button
            key={sev}
            onClick={() => toggleSeverity(sev)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono transition-all border ${
              selectedSeverities.has(sev)
                ? `${SEVERITY_COLORS[sev]} border`
                : "text-muted-foreground border-transparent hover:border-border/30"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${SEVERITY_DOT[sev]}`} />
            {sev.toUpperCase()}
          </button>
        ))}
      </div>

      {/* ─── Main Timeline ───────────────────────────────────────────────── */}
      <div className="flex-1 flex gap-3 min-h-0">
        {/* Timeline Column */}
        <ScrollArea className="flex-1 overflow-hidden">
          <div ref={timelineRef} className="relative pl-8 pb-8">
            {/* Vertical line */}
            <div className="absolute left-[15px] top-0 bottom-0 w-px bg-gradient-to-b from-neon-cyan/40 via-border/20 to-transparent" />

            {filteredEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Clock className="w-12 h-12 mb-4 opacity-30" />
                <p className="text-sm font-mono">No events in this time window</p>
                <p className="text-xs mt-1">Try adjusting the zoom level or filters</p>
              </div>
            ) : (
              Array.from(groupedEvents.entries()).map(([dateKey, dayEvents]) => (
                <div key={dateKey} className="mb-6">
                  {/* Date Header */}
                  <div className="flex items-center gap-2 mb-3 -ml-8">
                    <div className="w-[31px] h-[31px] rounded-full bg-background border-2 border-neon-cyan/40 flex items-center justify-center z-10">
                      <Calendar className="w-3.5 h-3.5 text-neon-cyan" />
                    </div>
                    <span className="text-xs font-heading font-bold text-neon-cyan tracking-wider">
                      {formatDateHeader(dayEvents[0].timestamp)}
                    </span>
                    <Badge variant="outline" className="text-[9px] font-mono border-neon-cyan/20 text-neon-cyan">
                      {dayEvents.length} events
                    </Badge>
                  </div>

                  {/* Events */}
                  <AnimatePresence mode="popLayout">
                    {dayEvents.map((event, idx) => {
                      const Icon = TYPE_ICONS[event.type] || Globe;
                      const isSelected = selectedEvent?.id === event.id;

                      return (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ delay: idx * 0.02 }}
                          className="mb-2"
                        >
                          <div className="flex items-start gap-3 -ml-8">
                            {/* Timeline dot */}
                            <div className="mt-2 relative z-10">
                              <div className={`w-[11px] h-[11px] rounded-full ${SEVERITY_DOT[event.severity]} shadow-lg ring-2 ring-background`} />
                            </div>

                            {/* Event Card */}
                            <button
                              onClick={() => setSelectedEvent(isSelected ? null : event)}
                              className={`flex-1 text-left glass-panel rounded-lg p-3 transition-all hover:bg-accent/5 group ${
                                isSelected ? "ring-1 ring-neon-cyan/40 bg-neon-cyan/5" : ""
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                  <span className="text-xs font-medium text-foreground truncate">{event.title}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <Badge variant="outline" className={`text-[9px] font-mono ${SEVERITY_COLORS[event.severity]}`}>
                                    {event.severity}
                                  </Badge>
                                  <span className="text-[10px] font-mono text-muted-foreground">{timeAgo(event.timestamp)}</span>
                                </div>
                              </div>

                              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{event.content}</p>

                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-[9px] font-mono text-muted-foreground/60">{formatTimestamp(event.timestamp)}</span>
                                <Badge variant="outline" className="text-[8px] font-mono border-border/20 text-muted-foreground/60">
                                  {event.type}/{event.subType}
                                </Badge>
                                {event.confidence && (
                                  <span className="text-[9px] font-mono text-muted-foreground/60">
                                    {event.confidence}% conf
                                  </span>
                                )}
                                {event.latitude && event.longitude && (
                                  <span className="text-[9px] font-mono text-neon-green/60">
                                    📍 {Number(event.latitude).toFixed(2)}, {Number(event.longitude).toFixed(2)}
                                  </span>
                                )}
                              </div>

                              {/* Entity tags */}
                              {event.entities && event.entities.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {event.entities.slice(0, 5).map((ent, i) => (
                                    <span key={i} className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-neon-cyan/5 text-neon-cyan/60 border border-neon-cyan/10">
                                      {String(ent)}
                                    </span>
                                  ))}
                                  {event.entities.length > 5 && (
                                    <span className="text-[8px] font-mono text-muted-foreground">+{event.entities.length - 5}</span>
                                  )}
                                </div>
                              )}
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* ─── Detail Panel ──────────────────────────────────────────────── */}
        <AnimatePresence>
          {selectedEvent && (
            <motion.div
              initial={{ opacity: 0, x: 20, width: 0 }}
              animate={{ opacity: 1, x: 0, width: 360 }}
              exit={{ opacity: 0, x: 20, width: 0 }}
              className="shrink-0 overflow-hidden"
            >
              <div className="glass-panel rounded-lg h-full flex flex-col w-[360px]">
                <div className="p-3 border-b border-border/10">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-heading font-bold text-foreground tracking-wider">EVENT DETAIL</h3>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyEvent(selectedEvent)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                      {selectedEvent.sourceUrl && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openLink(selectedEvent.sourceUrl!, "Source")}>
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedEvent(null)}>
                        <span className="text-xs">✕</span>
                      </Button>
                    </div>
                  </div>
                </div>

                <ScrollArea className="flex-1 overflow-hidden">
                  <div className="p-3 space-y-3">
                    {/* Title */}
                    <div>
                      <p className="text-sm font-medium text-foreground">{selectedEvent.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={`text-[9px] ${SEVERITY_COLORS[selectedEvent.severity]}`}>
                          {selectedEvent.severity}
                        </Badge>
                        <Badge variant="outline" className="text-[9px] font-mono border-border/20">
                          {selectedEvent.type}/{selectedEvent.subType}
                        </Badge>
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className="glass-panel rounded p-2">
                      <p className="text-[9px] font-mono text-muted-foreground mb-0.5">TIMESTAMP</p>
                      <p className="text-xs font-mono text-foreground">{new Date(selectedEvent.timestamp).toISOString()}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(selectedEvent.timestamp)}</p>
                    </div>

                    {/* Content */}
                    <div className="glass-panel rounded p-2">
                      <p className="text-[9px] font-mono text-muted-foreground mb-0.5">CONTENT</p>
                      <p className="text-xs text-foreground whitespace-pre-wrap">{selectedEvent.content}</p>
                    </div>

                    {/* Confidence */}
                    {selectedEvent.confidence && (
                      <div className="glass-panel rounded p-2">
                        <p className="text-[9px] font-mono text-muted-foreground mb-1">CONFIDENCE</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-background/50 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-neon-cyan transition-all"
                              style={{ width: `${selectedEvent.confidence}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-neon-cyan">{selectedEvent.confidence}%</span>
                        </div>
                      </div>
                    )}

                    {/* Location */}
                    {selectedEvent.latitude && selectedEvent.longitude && (
                      <div className="glass-panel rounded p-2">
                        <p className="text-[9px] font-mono text-muted-foreground mb-0.5">GEOLOCATION</p>
                        <p className="text-xs font-mono text-foreground">
                          {Number(selectedEvent.latitude).toFixed(6)}, {Number(selectedEvent.longitude).toFixed(6)}
                        </p>
                      </div>
                    )}

                    {/* Entities */}
                    {selectedEvent.entities && selectedEvent.entities.length > 0 && (
                      <div className="glass-panel rounded p-2">
                        <p className="text-[9px] font-mono text-muted-foreground mb-1">LINKED ENTITIES</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedEvent.entities.map((ent, i) => (
                            <Badge key={i} variant="outline" className="text-[9px] font-mono border-neon-cyan/20 text-neon-cyan">
                              {String(ent)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Source */}
                    {selectedEvent.sourceUrl && (
                      <div className="glass-panel rounded p-2">
                        <p className="text-[9px] font-mono text-muted-foreground mb-0.5">SOURCE</p>
                        <span
                            role="button"
                            onClick={() => openLink(selectedEvent.sourceUrl!, "Source")}
                            className="text-xs text-neon-cyan hover:underline break-all cursor-pointer"
                          >
                            {selectedEvent.sourceUrl}
                          </span>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Horizontal Timeline Bar (mini-map) ──────────────────────────── */}
      <div className="glass-panel rounded-lg p-2">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-muted-foreground shrink-0">
            {ZOOM_LEVELS[zoomLevel].label} WINDOW
          </span>
          <div className="flex-1 h-8 relative rounded bg-background/30 overflow-hidden">
            {/* Time markers */}
            {filteredEvents.length > 0 && (() => {
              const zoom = ZOOM_LEVELS[zoomLevel];
              const windowMs = zoom.ms > 0 ? zoom.ms : (Date.now() - Math.min(...filteredEvents.map(e => e.timestamp)) + 86400000);
              const startTime = zoom.ms > 0 ? centerTime - windowMs / 2 : Math.min(...filteredEvents.map(e => e.timestamp));

              return filteredEvents.map(event => {
                const pos = ((event.timestamp - startTime) / windowMs) * 100;
                if (pos < 0 || pos > 100) return null;
                return (
                  <div
                    key={event.id}
                    className={`absolute top-1 w-1 rounded-full transition-all cursor-pointer hover:scale-150 ${
                      SEVERITY_DOT[event.severity]
                    } ${selectedEvent?.id === event.id ? "h-6 w-1.5" : "h-4"}`}
                    style={{ left: `${pos}%` }}
                    onClick={() => setSelectedEvent(event)}
                    title={`${event.title} — ${formatTimestamp(event.timestamp)}`}
                  />
                );
              });
            })()}

            {/* Center marker */}
            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-neon-cyan/40" />
          </div>
          <span className="text-[9px] font-mono text-muted-foreground shrink-0">
            {formatTimestamp(centerTime)}
          </span>
        </div>
      </div>
    </div>
  );
}
