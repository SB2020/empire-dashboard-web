import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAppLink } from "@/hooks/useAppLink";
import { AGENTS } from "../../../shared/agents";
import { motion, AnimatePresence } from "framer-motion";
import {
  Boxes, Zap, CheckCircle2, Clock, Lock, ExternalLink, Search,
  Music, Image, Code2, Shield, Brain, Globe, Video, MessageSquare,
  Cpu, Database, Eye, Radio, Sparkles, Filter,
} from "lucide-react";

const stagger = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

const categoryIcons: Record<string, typeof Zap> = {
  "AI Generation": Sparkles,
  "Social Media": Globe,
  "Intelligence": Eye,
  "Development": Code2,
  "Media": Video,
  "Communication": MessageSquare,
  "Security": Shield,
  "Data": Database,
};

const statusConfig: Record<string, { color: string; label: string; icon: typeof CheckCircle2 }> = {
  connected: { color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30", label: "CONNECTED", icon: CheckCircle2 },
  available: { color: "text-blue-400 bg-blue-500/10 border-blue-500/30", label: "AVAILABLE", icon: Zap },
  coming_soon: { color: "text-muted-foreground bg-white/5 border-white/10", label: "COMING SOON", icon: Clock },
  premium: { color: "text-amber-400 bg-amber-500/10 border-amber-500/30", label: "PREMIUM", icon: Lock },
};

export default function AppEcosystem() {
  const { openLink } = useAppLink();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const appsQuery = trpc.ecosystem.apps.useQuery({});
  const skillsQuery = trpc.ecosystem.skills.useQuery({});
  const countQuery = trpc.ecosystem.appCount.useQuery();

  const apps = appsQuery.data || [];
  const skills = skillsQuery.data || [];
  const counts = countQuery.data || { total: 0, connected: 0, available: 0, comingSoon: 0 };

  const categories = useMemo(() => {
    const cats = new Set(apps.map((a: any) => a.category));
    return Array.from(cats);
  }, [apps]);

  const filteredApps = useMemo(() => {
    return apps.filter((app: any) => {
      if (searchQuery && !app.name.toLowerCase().includes(searchQuery.toLowerCase()) && !app.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (selectedCategory && app.category !== selectedCategory) return false;
      if (selectedStatus && app.status !== selectedStatus) return false;
      return true;
    });
  }, [apps, searchQuery, selectedCategory, selectedStatus]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div {...stagger} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl glass-elevated flex items-center justify-center glow-teal">
            <Boxes className="h-6 w-6 text-neon-cyan" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold tracking-wider chrome-text-teal uppercase">
              App Ecosystem
            </h1>
            <p className="text-xs font-mono text-muted-foreground tracking-wider">
              INTEGRATED TOOLS // SKILLS // CAPABILITIES
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div {...stagger} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Apps", value: counts.total, color: "text-neon-cyan" },
          { label: "Connected", value: counts.connected, color: "text-emerald-400" },
          { label: "Available", value: counts.available, color: "text-blue-400" },
          { label: "Coming Soon", value: counts.comingSoon, color: "text-muted-foreground" },
        ].map((s, i) => (
          <div key={i} className="glass-elevated edge-light p-4 text-center">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{s.label}</p>
            <p className={`text-2xl font-heading font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </motion.div>

      {/* Search + Filters */}
      <motion.div {...stagger} transition={{ delay: 0.15 }} className="glass-elevated edge-light p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search apps and integrations..."
              className="w-full h-10 pl-10 pr-4 rounded-lg glass-panel border-border/30 bg-transparent text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-teal-glow/50"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1.5 rounded text-[10px] font-mono uppercase border transition-all ${!selectedCategory ? "text-neon-cyan border-teal-glow/30 glass-panel" : "text-muted-foreground border-transparent hover:border-white/10"}`}
            >
              All
            </button>
            {categories.map((cat) => {
              const CatIcon = categoryIcons[cat as string] || Cpu;
              return (
                <button
                  key={cat as string}
                  onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat as string)}
                  className={`px-3 py-1.5 rounded text-[10px] font-mono uppercase border transition-all flex items-center gap-1 ${selectedCategory === cat ? "text-neon-cyan border-teal-glow/30 glass-panel" : "text-muted-foreground border-transparent hover:border-white/10"}`}
                >
                  <CatIcon className="h-3 w-3" />
                  {cat as string}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <Filter className="h-3 w-3 text-muted-foreground mt-1" />
          {Object.entries(statusConfig).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setSelectedStatus(selectedStatus === key ? null : key)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase border transition-all ${selectedStatus === key ? cfg.color : "text-muted-foreground/50 border-transparent hover:border-white/10"}`}
            >
              {cfg.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* App Grid */}
      <motion.div {...stagger} transition={{ delay: 0.2 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredApps.map((app: any, i: number) => {
            const status = statusConfig[app.status] || statusConfig.available;
            const StatusIcon = status.icon;
            return (
              <motion.div
                key={app.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.03, duration: 0.3 }}
                className="glass-elevated edge-light p-5 space-y-3 group hover:scale-[1.01] transition-transform duration-300"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg glass-panel flex items-center justify-center text-lg">
                      {app.icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-heading font-bold text-foreground uppercase tracking-wider">{app.name}</h3>
                      <p className="text-[10px] font-mono text-muted-foreground">{app.category}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono uppercase border ${status.color}`}>
                    <StatusIcon className="h-2.5 w-2.5" />
                    {status.label}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">{app.description}</p>

                <div className="flex flex-wrap gap-1">
                  {app.capabilities.slice(0, 4).map((cap: string, j: number) => (
                    <span key={j} className="px-2 py-0.5 rounded text-[9px] font-mono text-muted-foreground/70 bg-white/5">
                      {cap}
                    </span>
                  ))}
                </div>

                {app.apiType && (
                  <div className="flex items-center gap-1 pt-1 border-t border-border/10">
                    <span className="text-[9px] font-mono text-muted-foreground/50">Type:</span>
                    <span className="text-[9px] font-mono text-teal-glow">{app.apiType.replace('_', ' ')}</span>
                  </div>
                )}

                {app.url && (
                  <button onClick={() => openLink(app.url, app.name)}
                    className="flex items-center gap-1 text-[10px] font-mono text-teal-glow hover:underline opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="h-3 w-3" /> Open
                  </button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {filteredApps.length === 0 && (
        <div className="glass-panel p-8 text-center">
          <Boxes className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm font-mono text-muted-foreground">No apps match your search criteria.</p>
        </div>
      )}

      {/* Agent Skills */}
      <motion.div {...stagger} transition={{ delay: 0.3 }} className="glass-elevated edge-light p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-neon-magenta" />
          <span className="text-sm font-heading font-bold text-neon-magenta uppercase tracking-wider">Agent Skills Registry</span>
          <span className="text-[10px] font-mono text-muted-foreground ml-2">{skills.length} skills acquired</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {skills.map((skill: any, i: number) => (
            <div key={i} className="glass-panel p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-foreground">{skill.name}</span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${skill.category === "security" ? "text-red-400 bg-red-500/10" : skill.category === "code" ? "text-emerald-400 bg-emerald-500/10" : skill.category === "osint" ? "text-amber-400 bg-amber-500/10" : "text-blue-400 bg-blue-500/10"}`}>
                  {skill.category}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">{skill.description}</p>
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-mono text-muted-foreground/50">Agent:</span>
                <span className="text-[9px] font-mono text-teal-glow">{AGENTS[skill.agentId]?.name.split(" ").pop() || skill.agentId}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
