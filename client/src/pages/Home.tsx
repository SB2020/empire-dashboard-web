import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { AGENTS } from "@shared/agents";
import {
  Shield,
  Code2,
  Music,
  Eye,
  FlaskConical,
  Zap,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  ChevronRight,
  Radar,
  Plane,
  CloudLightning,
  ShieldAlert,
  Newspaper,
  GitBranch,
  Satellite,
  ArrowRight,
  Star,
  BookOpen,
  Crosshair,
  ExternalLink,
  Github,
} from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useAppLink } from "@/hooks/useAppLink";

const iconMap: Record<string, any> = { Shield, Code2, Music, Eye, FlaskConical };
const colorMap: Record<string, string> = {
  "neon-red": "text-neon-red",
  "neon-green": "text-neon-green",
  "neon-magenta": "text-neon-magenta",
  "neon-amber": "text-neon-amber",
  "neon-blue": "text-neon-blue",
  "neon-cyan": "text-neon-cyan",
};
const glowMap: Record<string, string> = {
  "neon-red": "glow-red",
  "neon-green": "glow-green",
  "neon-magenta": "glow-magenta",
  "neon-amber": "glow-amber",
  "neon-blue": "glow-blue",
  "neon-cyan": "glow-cyan",
};

function SystemClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  return (
    <span className="font-mono text-chrome-dim text-sm tabular-nums tracking-wide">
      {time.toISOString().replace("T", " // ").substring(0, 24)}Z
    </span>
  );
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const agentStats = trpc.agents.stats.useQuery(undefined, { enabled: !!user });
  const recentCommands = trpc.commandLog.recent.useQuery({ limit: 10 }, { enabled: !!user });
  const securityStats = trpc.security.stats.useQuery(undefined, { enabled: !!user });
  const osintData = trpc.osint.dashboard.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 120000,
    staleTime: 60000,
  });

  const { openLink } = useAppLink();
  const agents = useMemo(() => Object.values(AGENTS), []);

  // Bookmarks / Favorites
  const bookmarksQuery = trpc.bookmarks.list.useQuery(undefined, { enabled: !!user });
  const bookmarkItems = bookmarksQuery.data || [];

  const statsMap = useMemo(() => {
    const map: Record<string, { total: number; completed: number; failed: number; pending: number }> = {};
    agentStats.data?.forEach((s: any) => {
      map[s.agentId] = { total: Number(s.total), completed: Number(s.completed), failed: Number(s.failed), pending: Number(s.pending) };
    });
    return map;
  }, [agentStats.data]);

  const totalOps = useMemo(() => {
    return Object.values(statsMap).reduce((acc, s) => acc + s.total, 0);
  }, [statsMap]);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 p-1 md:p-2">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl glass-elevated flex items-center justify-center glow-teal">
              <Zap className="h-5 w-5 text-neon-cyan" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold tracking-wider chrome-text-teal uppercase">
                Command Center
              </h1>
              <p className="text-[10px] font-mono text-muted-foreground tracking-widest mt-0.5">
                SYSTEM_ZERO // GOD MODE // OPERATIONAL STATUS
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <SystemClock />
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-neon-green status-pulse" />
            <span className="text-[10px] font-mono text-neon-green/80 uppercase tracking-wider">
              All Systems Nominal
            </span>
          </div>
        </div>
      </motion.div>

      {/* System Metrics + OSINT Quick Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <MetricCard label="Total Operations" value={totalOps} icon={<Activity className="h-4 w-4" />} color="neon-cyan" delay={0} />
        <MetricCard label="Active Agents" value={agents.length} icon={<Zap className="h-4 w-4" />} color="neon-green" delay={0.05} />
        <MetricCard label="Security Events" value={Number(securityStats.data?.total || 0)} icon={<Shield className="h-4 w-4" />} color="neon-red" delay={0.1} />
        <MetricCard label="Flights Tracked" value={osintData.data?.flights?.length || 0} icon={<Plane className="h-4 w-4" />} color="neon-green" delay={0.15} />
        <MetricCard label="Seismic Events" value={osintData.data?.earthquakes?.length || 0} icon={<Activity className="h-4 w-4" />} color="neon-amber" delay={0.2} />
        <MetricCard label="Cyber Threats" value={osintData.data?.cves?.filter((c: any) => c.severity === "CRITICAL" || c.severity === "HIGH").length || 0} icon={<ShieldAlert className="h-4 w-4" />} color="neon-red" delay={0.25} />
      </motion.div>

      {/* Quick Access: WORLDVIEW + Hierarchy */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.button
          whileHover={{ scale: 1.01, y: -2 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => setLocation("/worldview")}
          className="glass-panel edge-light p-5 text-left glow-amber transition-all duration-500 group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg glass-elevated">
                <Radar className="h-5 w-5 text-neon-amber" />
              </div>
              <div>
                <h3 className="font-heading text-xs font-bold tracking-wider text-neon-amber uppercase">
                  WORLDVIEW
                </h3>
                <p className="text-[10px] font-mono text-muted-foreground">
                  Total Information Awareness // OSINT Fusion Center
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-neon-amber group-hover:translate-x-1 transition-all" />
          </div>
          <div className="flex items-center gap-4 text-[10px] font-mono">
            <span className="flex items-center gap-1.5">
              <Satellite className="h-3 w-3 text-neon-green" />
              <span className="text-muted-foreground">
                {osintData.data?.systemStatus?.feedsOnline || 0}/{osintData.data?.systemStatus?.feedsTotal || 5} FEEDS ONLINE
              </span>
            </span>
            <span className="text-muted-foreground/40">|</span>
            <span className="text-muted-foreground">
              {osintData.data?.systemStatus?.dataPoints || 0} DATA POINTS
            </span>
          </div>
          {/* Mini OSINT ticker */}
          <div className="mt-3 flex flex-wrap gap-2">
            {osintData.data?.earthquakes?.slice(0, 2).map((q: any, i: number) => (
              <span key={i} className="text-[9px] font-mono px-2 py-0.5 rounded glass-panel text-neon-amber/80">
                M{q.magnitude?.toFixed(1)} {q.place?.substring(0, 25)}
              </span>
            ))}
            {osintData.data?.cves?.slice(0, 1).map((c: any, i: number) => (
              <span key={`cve-${i}`} className="text-[9px] font-mono px-2 py-0.5 rounded glass-panel text-neon-red/80">
                {c.id} ({c.severity})
              </span>
            ))}
          </div>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.01, y: -2 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => setLocation("/hierarchy")}
          className="glass-panel edge-light p-5 text-left glow-cyan transition-all duration-500 group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg glass-elevated">
                <GitBranch className="h-5 w-5 text-neon-cyan" />
              </div>
              <div>
                <h3 className="font-heading text-xs font-bold tracking-wider text-neon-cyan uppercase">
                  Chain of Command
                </h3>
                <p className="text-[10px] font-mono text-muted-foreground">
                  Agent Hierarchy // Delegation Protocol // Multi-Agent Ops
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-neon-cyan group-hover:translate-x-1 transition-all" />
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono">
            {agents.slice(0, 4).map((agent) => {
              const Icon = iconMap[agent.icon] || Zap;
              return (
                <span key={agent.id} className="flex items-center gap-1">
                  <Icon className={`h-3 w-3 ${colorMap[agent.color]}`} />
                  <span className="text-muted-foreground">{agent.name.split(" ")[1]}</span>
                </span>
              );
            })}
            <span className="text-muted-foreground/40">+{Math.max(0, agents.length - 4)}</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[9px] font-mono text-muted-foreground/60">
            <span className="h-1.5 w-1.5 rounded-full bg-neon-green status-pulse" />
            All agents online | Delegation protocol active
          </div>
        </motion.button>
      </motion.div>

      {/* Agent Grid */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center gap-2 mb-4">
          <Terminal className="h-4 w-4 text-chrome-dim" />
          <h2 className="font-heading text-sm font-semibold tracking-wider chrome-text uppercase">
            High Command Divisions
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {agents.map((agent, i) => {
            const Icon = iconMap[agent.icon] || Zap;
            const stats = statsMap[agent.id];
            return (
              <motion.button
                key={agent.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.07, duration: 0.5, ease: "easeOut" as const }}
                whileHover={{ scale: 1.015, y: -2 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setLocation(`/agent/${agent.id}`)}
                className={`group relative glass-panel edge-light p-5 text-left ${glowMap[agent.color]} transition-all duration-500`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg glass-elevated">
                      <Icon className={`h-5 w-5 ${colorMap[agent.color]}`} />
                    </div>
                    <div>
                      <h3 className={`font-heading text-xs font-bold tracking-wider uppercase ${colorMap[agent.color]}`}>
                        {agent.name}
                      </h3>
                      <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                        {agent.directive}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground/60 group-hover:translate-x-0.5 transition-all duration-300" />
                </div>

                <div className="flex items-center gap-4 text-[10px] font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-neon-green status-pulse" />
                    <span className="text-muted-foreground">ONLINE</span>
                  </div>
                  <span className="text-muted-foreground/30">|</span>
                  <span className="text-muted-foreground/60">
                    RANK {agent.rank === 1 ? "CMD" : agent.rank === 2 ? "DIV" : "SPC"}
                  </span>
                  {stats && (
                    <>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-neon-green/70" />
                        {stats.completed}
                      </div>
                      {stats.failed > 0 && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <XCircle className="h-3 w-3 text-neon-red/70" />
                          {stats.failed}
                        </div>
                      )}
                      {stats.pending > 0 && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3 text-neon-amber/70" />
                          {stats.pending}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {agent.capabilities.slice(0, 3).map((cap) => (
                    <span
                      key={cap}
                      className="text-[9px] font-mono px-2 py-0.5 rounded-md glass-panel text-muted-foreground/80 border-0"
                      style={{ boxShadow: "none" }}
                    >
                      {cap}
                    </span>
                  ))}
                  {agent.canDelegateTo.length > 0 && (
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-md glass-panel text-neon-cyan/60 border-0" style={{ boxShadow: "none" }}>
                      delegates:{agent.canDelegateTo.length}
                    </span>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Quick Access Favorites */}
      {bookmarkItems.length > 0 && (
        <motion.div variants={fadeUp}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-neon-amber" />
              <h2 className="font-heading text-sm font-semibold tracking-wider chrome-text uppercase">
                Favorites
              </h2>
              <span className="text-[10px] font-mono text-muted-foreground/50">({bookmarkItems.length})</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {bookmarkItems.slice(0, 12).map((bm: any) => {
              const typeConfig: Record<string, { icon: any; color: string; route?: string }> = {
                osint_tool: { icon: Crosshair, color: "text-neon-amber" },
                library_category: { icon: BookOpen, color: "text-neon-green", route: "/survivor-library" },
                world_cam: { icon: Satellite, color: "text-neon-cyan", route: "/worldview" },
                github_repo: { icon: Github, color: "text-neon-magenta", route: "/github" },
                case: { icon: Shield, color: "text-neon-red", route: "/cases" },
                entity: { icon: Eye, color: "text-neon-blue", route: "/entities" },
              };
              const cfg = typeConfig[bm.itemType] || { icon: Star, color: "text-neon-cyan" };
              const Icon = cfg.icon;
              const meta = bm.metadata as any;
              return (
                <motion.button
                  key={bm.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (bm.itemType === "osint_tool" && meta?.url) {
                      openLink(meta.url, bm.label);
                    } else if (cfg.route) {
                      setLocation(cfg.route);
                    }
                  }}
                  className="glass-panel edge-light p-3 text-left flex items-center gap-3 group hover:border-white/15 transition-all"
                >
                  <Icon className={`h-4 w-4 ${cfg.color} shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate group-hover:text-neon-cyan transition-colors">
                      {bm.label}
                    </p>
                    <p className="text-[9px] font-mono text-muted-foreground/50 uppercase">
                      {bm.itemType.replace(/_/g, " ")}
                    </p>
                  </div>
                  {bm.itemType === "osint_tool" && (
                    <ExternalLink className="h-3 w-3 text-muted-foreground/30 group-hover:text-neon-cyan/60 shrink-0" />
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* OSINT Live Ticker */}
      {osintData.data && (
        <motion.div variants={fadeUp}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Radar className="h-4 w-4 text-neon-amber" />
              <h2 className="font-heading text-sm font-semibold tracking-wider chrome-text uppercase">
                Live Intelligence Feed
              </h2>
            </div>
            <button
              onClick={() => setLocation("/worldview")}
              className="text-[10px] font-mono text-neon-amber hover:text-foreground transition-all flex items-center gap-1"
            >
              OPEN WORLDVIEW <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Top News */}
            <div className="glass-panel edge-light p-4">
              <div className="flex items-center gap-2 mb-3">
                <Newspaper className="h-3.5 w-3.5 text-neon-magenta" />
                <span className="text-[10px] font-mono font-bold text-neon-magenta uppercase tracking-wider">News</span>
              </div>
              <div className="space-y-2">
                {osintData.data.news?.slice(0, 3).map((n: any, i: number) => (
                  <button key={i} onClick={() => openLink(n.url, n.title)} className="block text-[11px] text-foreground/80 hover:text-foreground transition-all line-clamp-1 text-left">
                    {n.title}
                  </button>
                ))}
              </div>
            </div>
            {/* Weather Alerts */}
            <div className="glass-panel edge-light p-4">
              <div className="flex items-center gap-2 mb-3">
                <CloudLightning className="h-3.5 w-3.5 text-neon-blue" />
                <span className="text-[10px] font-mono font-bold text-neon-blue uppercase tracking-wider">Weather</span>
              </div>
              <div className="space-y-2">
                {osintData.data.weatherAlerts?.slice(0, 3).map((w: any, i: number) => (
                  <div key={i} className="text-[11px] text-foreground/80 line-clamp-1">
                    <span className={`font-bold mr-1 ${w.severity === "Extreme" ? "text-neon-red" : w.severity === "Severe" ? "text-neon-amber" : "text-neon-blue"}`}>
                      {w.severity?.substring(0, 3)?.toUpperCase()}
                    </span>
                    {w.event}
                  </div>
                ))}
                {(!osintData.data.weatherAlerts || osintData.data.weatherAlerts.length === 0) && (
                  <p className="text-[10px] text-muted-foreground/50 font-mono">No active alerts</p>
                )}
              </div>
            </div>
            {/* Cyber */}
            <div className="glass-panel edge-light p-4">
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert className="h-3.5 w-3.5 text-neon-red" />
                <span className="text-[10px] font-mono font-bold text-neon-red uppercase tracking-wider">Cyber</span>
              </div>
              <div className="space-y-2">
                {osintData.data.cves?.slice(0, 3).map((c: any, i: number) => (
                  <div key={i} className="text-[11px] text-foreground/80 line-clamp-1">
                    <span className={`font-bold mr-1 ${c.severity === "CRITICAL" ? "text-neon-red" : c.severity === "HIGH" ? "text-neon-amber" : "text-muted-foreground"}`}>
                      {c.id}
                    </span>
                    {c.description?.substring(0, 50)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Recent Activity */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center gap-2 mb-4">
          <ScrollIcon className="h-4 w-4 text-chrome-dim" />
          <h2 className="font-heading text-sm font-semibold tracking-wider chrome-text uppercase">
            Recent Operations
          </h2>
        </div>
        <div className="glass-panel edge-light overflow-hidden">
          {recentCommands.data && recentCommands.data.length > 0 ? (
            <div className="divide-y divide-border/20">
              {recentCommands.data.slice(0, 8).map((cmd: any, i: number) => {
                const agent = AGENTS[cmd.agentId];
                return (
                  <motion.div
                    key={cmd.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-teal-glow/5 transition-all duration-300"
                  >
                    <div className={`h-2 w-2 rounded-full ${cmd.status === "completed" ? "bg-neon-green" : cmd.status === "failed" ? "bg-neon-red" : "bg-neon-amber status-pulse"}`} />
                    <span className={`text-[10px] font-mono font-bold uppercase ${colorMap[agent?.color || "neon-cyan"]} w-24 shrink-0`}>
                      {agent?.name?.split(" ")[1] || cmd.agentId}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground truncate flex-1">
                      {cmd.command.substring(0, 80)}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground/40 shrink-0">
                      {new Date(cmd.createdAt).toLocaleTimeString()}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <div className="h-14 w-14 rounded-2xl glass-elevated flex items-center justify-center mb-4">
                <Terminal className="h-6 w-6 opacity-30" />
              </div>
              <p className="text-xs font-mono chrome-text tracking-wider">NO OPERATIONS LOGGED</p>
              <p className="text-[10px] font-mono mt-2 text-muted-foreground/50 tracking-wide">
                Select an agent division to begin
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  color,
  delay = 0,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" as const }}
      whileHover={{ scale: 1.02, y: -1 }}
      className="glass-panel edge-light p-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={`${colorMap[color] || "text-neon-cyan"} opacity-70`}>{icon}</span>
        <span className="text-[10px] font-mono text-muted-foreground/70 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="font-heading text-2xl font-bold chrome-text">{value}</p>
    </motion.div>
  );
}

function ScrollIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4" />
      <path d="M19 17V5a2 2 0 0 0-2-2H4" />
    </svg>
  );
}
