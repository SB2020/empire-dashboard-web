import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import {
  Network, User, Building, MapPin, Cpu, Link2, Calendar,
  Image, Search, ZoomIn, ZoomOut, Maximize2, Filter,
  Copy, Share2, Plus, ChevronRight, RefreshCw, Eye,
  X, Info, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

const entityTypeConfig: Record<string, { icon: any; color: string; bg: string }> = {
  person: { icon: User, color: "#3b82f6", bg: "bg-blue-500/10 text-blue-400" },
  organization: { icon: Building, color: "#a855f7", bg: "bg-purple-500/10 text-purple-400" },
  location: { icon: MapPin, color: "#22c55e", bg: "bg-emerald-500/10 text-emerald-400" },
  device: { icon: Cpu, color: "#f97316", bg: "bg-orange-500/10 text-orange-400" },
  domain: { icon: Link2, color: "#06b6d4", bg: "bg-cyan-500/10 text-cyan-400" },
  event: { icon: Calendar, color: "#eab308", bg: "bg-yellow-500/10 text-yellow-400" },
  media: { icon: Image, color: "#ec4899", bg: "bg-pink-500/10 text-pink-400" },
};

interface GraphNode {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  name: string;
  entityType: string;
  confidence: number;
  sourceCount: number;
  pinned: boolean;
}

interface GraphEdge {
  from: number;
  to: number;
  relationType: string;
  confidence: number;
}

function useForceLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number
) {
  const nodesRef = useRef<GraphNode[]>([]);
  const frameRef = useRef<number>(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    // Initialize positions
    nodesRef.current = nodes.map((n, i) => ({
      ...n,
      x: n.x || width / 2 + (Math.random() - 0.5) * width * 0.6,
      y: n.y || height / 2 + (Math.random() - 0.5) * height * 0.6,
      vx: 0,
      vy: 0,
    }));

    let running = true;
    let iteration = 0;

    function simulate() {
      if (!running) return;
      const ns = nodesRef.current;
      const alpha = Math.max(0.001, 0.1 * Math.pow(0.99, iteration));

      // Repulsion
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const dx = ns[j].x - ns[i].x;
          const dy = ns[j].y - ns[i].y;
          const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
          const force = (200 * 200) / dist;
          const fx = (dx / dist) * force * alpha;
          const fy = (dy / dist) * force * alpha;
          if (!ns[i].pinned) { ns[i].vx -= fx; ns[i].vy -= fy; }
          if (!ns[j].pinned) { ns[j].vx += fx; ns[j].vy += fy; }
        }
      }

      // Attraction (edges)
      const nodeMap = new Map(ns.map((n) => [n.id, n]));
      for (const edge of edges) {
        const a = nodeMap.get(edge.from);
        const b = nodeMap.get(edge.to);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const force = (dist - 120) * 0.01 * alpha;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        if (!a.pinned) { a.vx += fx; a.vy += fy; }
        if (!b.pinned) { b.vx -= fx; b.vy -= fy; }
      }

      // Center gravity
      for (const n of ns) {
        if (n.pinned) continue;
        n.vx += (width / 2 - n.x) * 0.001 * alpha;
        n.vy += (height / 2 - n.y) * 0.001 * alpha;
        n.vx *= 0.9;
        n.vy *= 0.9;
        n.x += n.vx;
        n.y += n.vy;
        n.x = Math.max(30, Math.min(width - 30, n.x));
        n.y = Math.max(30, Math.min(height - 30, n.y));
      }

      iteration++;
      setTick((t) => t + 1);
      if (iteration < 300) {
        frameRef.current = requestAnimationFrame(simulate);
      }
    }

    frameRef.current = requestAnimationFrame(simulate);
    return () => {
      running = false;
      cancelAnimationFrame(frameRef.current);
    };
  }, [nodes.length, edges.length, width, height]);

  return { nodes: nodesRef.current, tick };
}

export default function EntityGraph() {
  const [selectedEntity, setSelectedEntity] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showAddRelation, setShowAddRelation] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragNodeRef = useRef<number | null>(null);

  const { data: graphData, isLoading, refetch } = trpc.entities.graph.useQuery({ limit: 100 });
  const { data: entityList } = trpc.entities.list.useQuery({
    limit: 50,
    type: typeFilter !== "all" ? typeFilter : undefined,
    search: searchQuery || undefined,
  });

  const addRelationMutation = trpc.entities.addRelation.useMutation({
    onSuccess: () => { toast.success("Relation added"); refetch(); setShowAddRelation(false); },
    onError: (err) => toast.error(err.message),
  });

  // Measure container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width: Math.max(400, width), height: Math.max(300, height) });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Build graph data
  const graphNodes = useMemo<GraphNode[]>(() => {
    if (!graphData?.entities) return [];
    return graphData.entities.map((e: any) => ({
      id: e.id,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      name: e.name,
      entityType: e.entityType,
      confidence: e.confidence,
      sourceCount: e.sourceCount,
      pinned: false,
    }));
  }, [graphData?.entities]);

  const graphEdges = useMemo<GraphEdge[]>(() => {
    if (!graphData?.relations) return [];
    return graphData.relations.map((r: any) => ({
      from: r.fromEntityId,
      to: r.toEntityId,
      relationType: r.relationType,
      confidence: r.confidence,
    }));
  }, [graphData?.relations]);

  const { nodes: layoutNodes, tick } = useForceLayout(
    graphNodes, graphEdges, dimensions.width, dimensions.height
  );

  const nodeMap = useMemo(() => new Map(layoutNodes.map((n) => [n.id, n])), [layoutNodes, tick]);

  const selectedEntityData = selectedEntity
    ? graphData?.entities?.find((e: any) => e.id === selectedEntity)
    : null;

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === "svg") {
      isDragging.current = true;
      dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging.current) {
      setPan({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    dragNodeRef.current = null;
  }, []);

  return (
    <div className="h-full flex flex-col gap-4 p-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg glass-panel flex items-center justify-center">
            <Network className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-wide">ENTITY GRAPH</h1>
            <p className="text-xs text-muted-foreground font-mono">
              {graphData?.entities?.length || 0} NODES | {graphData?.relations?.length || 0} RELATIONS
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAddRelation(!showAddRelation)} className="gap-1 text-xs">
            <Plus className="w-3 h-3" /> LINK
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1 text-xs">
            <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} /> REFRESH
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            className="w-full bg-background/50 border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground"
            placeholder="Search entities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1">
          {["all", "person", "organization", "location", "domain", "device", "event"].map((t) => (
            <Button
              key={t}
              variant={typeFilter === t ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter(t)}
              className="text-xs px-2 py-1 h-7"
            >
              {t.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-3 min-h-0">
        {/* Graph Canvas */}
        <div
          ref={containerRef}
          className="flex-1 glass-panel rounded-lg border border-border/50 overflow-hidden relative cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <svg
            width={dimensions.width}
            height={dimensions.height}
            className="w-full h-full"
            style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)` }}
          >
            {/* Edges */}
            {graphEdges.map((edge, i) => {
              const from = nodeMap.get(edge.from);
              const to = nodeMap.get(edge.to);
              if (!from || !to) return null;
              const opacity = Math.max(0.15, edge.confidence / 100);
              return (
                <g key={`e-${i}`}>
                  <line
                    x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                    stroke="currentColor"
                    strokeOpacity={opacity}
                    strokeWidth={1}
                    className="text-muted-foreground"
                  />
                  <text
                    x={(from.x + to.x) / 2}
                    y={(from.y + to.y) / 2 - 4}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[8px] font-mono"
                    opacity={0.5}
                  >
                    {edge.relationType}
                  </text>
                </g>
              );
            })}

            {/* Nodes */}
            {layoutNodes.map((node) => {
              const config = entityTypeConfig[node.entityType] || entityTypeConfig.domain;
              const isSelected = selectedEntity === node.id;
              const size = Math.max(12, Math.min(24, 8 + node.sourceCount * 2));
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  className="cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); setSelectedEntity(isSelected ? null : node.id); }}
                >
                  {/* Glow */}
                  {isSelected && (
                    <circle r={size + 8} fill={config.color} opacity={0.15}>
                      <animate attributeName="r" values={`${size + 6};${size + 12};${size + 6}`} dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}
                  {/* Node circle */}
                  <circle
                    r={size}
                    fill={config.color}
                    fillOpacity={0.2}
                    stroke={config.color}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    strokeOpacity={isSelected ? 1 : 0.6}
                  />
                  {/* Inner dot */}
                  <circle r={3} fill={config.color} opacity={0.9} />
                  {/* Label */}
                  <text
                    y={size + 14}
                    textAnchor="middle"
                    className="fill-foreground text-[9px] font-mono font-medium"
                  >
                    {node.name.length > 16 ? node.name.substring(0, 14) + "..." : node.name}
                  </text>
                  <text
                    y={size + 24}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[7px] font-mono"
                  >
                    {node.entityType} | {node.confidence}%
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Zoom Controls */}
          <div className="absolute bottom-3 right-3 flex flex-col gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.min(3, z * 1.2))}>
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.max(0.3, z / 1.2))}>
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
              <Maximize2 className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Empty state */}
          {!isLoading && layoutNodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Network className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                <h3 className="text-sm font-bold text-muted-foreground">NO ENTITIES YET</h3>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Ingest records through the Live Feed to auto-extract entities.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Side Panel */}
        <div className="w-72 shrink-0 flex flex-col gap-3">
          {/* Entity Detail */}
          {selectedEntityData && (
            <div className="glass-panel rounded-lg p-3 border border-border/50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-foreground">ENTITY DETAIL</h3>
                <button onClick={() => setSelectedEntity(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {(() => {
                    const config = entityTypeConfig[selectedEntityData.entityType];
                    const Icon = config?.icon || Link2;
                    return <div className={`w-8 h-8 rounded flex items-center justify-center ${config?.bg || "bg-background/50"}`}><Icon className="w-4 h-4" /></div>;
                  })()}
                  <div>
                    <p className="text-sm font-semibold text-foreground">{selectedEntityData.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{selectedEntityData.entityType}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="glass-panel rounded p-2">
                    <span className="text-muted-foreground">Confidence</span>
                    <p className="text-sm font-bold text-foreground">{selectedEntityData.confidence}%</p>
                  </div>
                  <div className="glass-panel rounded p-2">
                    <span className="text-muted-foreground">Sources</span>
                    <p className="text-sm font-bold text-foreground">{selectedEntityData.sourceCount}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="text-[10px] flex-1" onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(selectedEntityData, null, 2));
                    toast.success("Entity data copied");
                  }}>
                    <Copy className="w-3 h-3 mr-1" /> COPY
                  </Button>
                  <Button variant="outline" size="sm" className="text-[10px] flex-1" onClick={() => toast.info("Feature coming soon")}>
                    <Eye className="w-3 h-3 mr-1" /> INVESTIGATE
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Entity List */}
          <div className="glass-panel rounded-lg border border-border/50 flex-1 flex flex-col min-h-0">
            <div className="p-3 border-b border-border/30">
              <h3 className="text-xs font-bold text-foreground">ALL ENTITIES ({entityList?.length || 0})</h3>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {entityList?.map((entity: any) => {
                  const config = entityTypeConfig[entity.entityType];
                  const Icon = config?.icon || Link2;
                  return (
                    <button
                      key={entity.id}
                      onClick={() => setSelectedEntity(entity.id)}
                      className={`w-full flex items-center gap-2 p-2 rounded text-left hover:bg-background/50 transition-colors ${selectedEntity === entity.id ? "bg-primary/10 border border-primary/30" : ""}`}
                    >
                      <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${config?.bg || "bg-background/50"}`}>
                        <Icon className="w-3 h-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{entity.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {entity.entityType} | {entity.confidence}% | {entity.sourceCount} src
                        </p>
                      </div>
                    </button>
                  );
                })}
                {(!entityList || entityList.length === 0) && (
                  <p className="text-xs text-muted-foreground text-center py-4">No entities found</p>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}
