import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useAppLink } from "@/hooks/useAppLink";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Github, Search, Star, GitFork, Eye, ExternalLink, Loader2,
  ChevronRight, ChevronDown, Tag, AlertTriangle, CheckCircle,
  Bookmark, BookmarkCheck, Archive, Trash2, FileText, Activity, TrendingUp,
  Filter, RefreshCw, Box, Layers, Code, Shield, Globe, Brain,
  Crosshair, BarChart3, Cpu, Wrench, Target,
} from "lucide-react";

// ── Constants ──────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  "Reconnaissance": "text-neon-cyan",
  "Network Intelligence": "text-neon-green",
  "Image & Media Analysis": "text-neon-magenta",
  "Geospatial Intelligence": "text-neon-amber",
  "Threat Intelligence": "text-neon-red",
  "Data Analysis & Visualization": "text-neon-blue",
  "Automation & Frameworks": "text-neon-green",
  "AI & Machine Learning": "text-neon-magenta",
};

const CATEGORY_ICONS: Record<string, any> = {
  "Reconnaissance": Crosshair,
  "Network Intelligence": Globe,
  "Image & Media Analysis": Eye,
  "Geospatial Intelligence": Globe,
  "Threat Intelligence": Shield,
  "Data Analysis & Visualization": BarChart3,
  "Automation & Frameworks": Wrench,
  "AI & Machine Learning": Brain,
};

const STATUS_COLORS: Record<string, string> = {
  watching: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  imported: "bg-green-500/20 text-green-400 border-green-500/30",
  archived: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  starred: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

const QUICK_SEARCHES = [
  "OSINT tools", "threat intelligence", "web scraper",
  "vulnerability scanner", "recon framework", "network analysis",
];

const LANG_COLORS: Record<string, string> = {
  Python: "#3572A5", JavaScript: "#f1e05a", TypeScript: "#3178c6",
  Go: "#00ADD8", Rust: "#dea584", Ruby: "#701516", Java: "#b07219",
  "C++": "#f34b7d", C: "#555555", Shell: "#89e051", PHP: "#4F5D95",
  Kotlin: "#A97BFF", Swift: "#F05138", Dart: "#00B4AB",
  Zig: "#ec915c", Cuda: "#3A4E3A", Makefile: "#427819",
};

// ── Helper ──────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// ── Repo Card Component ──────────────────────────────────────────

function RepoCard({ repo, onTrack, onAnalyze, isTracking }: {
  repo: any;
  onTrack?: () => void;
  onAnalyze?: () => void;
  isTracking?: boolean;
}) {
  const { openLink } = useAppLink();
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 hover:bg-white/[0.04] hover:border-neon-cyan/20 transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <GitFork className="w-4 h-4 text-chrome-dim shrink-0" />
            <button
              onClick={() => openLink(repo.html_url, repo.full_name)}
              className="font-mono text-sm text-neon-cyan hover:underline truncate text-left"
            >
              {repo.full_name}
            </button>
            {repo.archived && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/30 text-amber-400">
                ARCHIVED
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {repo.description || "No description available"}
          </p>
          <div className="flex items-center gap-3 text-[11px] text-chrome-dim flex-wrap">
            {repo.language && (
              <span className="flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: LANG_COLORS[repo.language] || "#888" }}
                />
                {repo.language}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3" /> {formatNumber(repo.stargazers_count)}
            </span>
            <span className="flex items-center gap-1">
              <GitFork className="w-3 h-3" /> {formatNumber(repo.forks_count)}
            </span>
            {repo.updated_at && (
              <span>Updated {timeAgo(repo.updated_at)}</span>
            )}
          </div>
          {repo.topics?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {repo.topics.slice(0, 6).map((t: string) => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-chrome-dim border border-white/[0.06]">
                  {t}
                </span>
              ))}
              {repo.topics.length > 6 && (
                <span className="text-[10px] text-chrome-dim">+{repo.topics.length - 6}</span>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          {onTrack && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[10px] px-2 border-white/10 hover:border-neon-cyan/30"
              onClick={onTrack}
              disabled={isTracking}
            >
              {isTracking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bookmark className="w-3 h-3" />}
              <span className="ml-1">Track</span>
            </Button>
          )}
          {onAnalyze && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[10px] px-2 border-white/10 hover:border-neon-magenta/30"
              onClick={onAnalyze}
            >
              <Activity className="w-3 h-3" />
              <span className="ml-1">Analyze</span>
            </Button>
          )}
          <button
            onClick={() => openLink(repo.html_url, repo.full_name)}
            className="inline-flex items-center justify-center h-7 text-[10px] px-2 rounded-md border border-white/10 hover:border-neon-green/30 text-chrome-dim hover:text-neon-green transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            <span className="ml-1">Open</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Component ──────────────────────────────────────────────

export default function GitHubOSINT() {
  const { user } = useAuth();
  const { openLink } = useAppLink();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"stars" | "forks" | "updated" | "best-match">("stars");
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("search");
  const [analyzeTarget, setAnalyzeTarget] = useState<{ owner: string; repo: string } | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["Reconnaissance"]));

  // Stabilize search params
  const searchParams = useMemo(
    () => ({ query: searchQuery, sort: sortBy, page }),
    [searchQuery, sortBy, page]
  );

  const searchResults = trpc.github.search.useQuery(searchParams, {
    enabled: searchQuery.length > 0,
    placeholderData: (prev: any) => prev,
  });

  const trending = trpc.github.trending.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  const curatedTools = trpc.github.curatedTools.useQuery(undefined, {
    staleTime: 10 * 60 * 1000,
  });

  const trackedRepos = trpc.github.tracked.useQuery(undefined, {
    enabled: !!user,
  });

  const analyzeParams = useMemo(
    () => analyzeTarget ? { owner: analyzeTarget.owner, repo: analyzeTarget.repo } : { owner: "", repo: "" },
    [analyzeTarget]
  );

  const analysis = trpc.github.analyze.useQuery(analyzeParams, {
    enabled: !!analyzeTarget,
  });

  const trackMutation = trpc.github.trackRepo.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Repository tracked");
      trackedRepos.refetch();
    },
    onError: () => toast.error("Failed to track repository"),
  });

  const updateTrackedMutation = trpc.github.updateTracked.useMutation({
    onSuccess: () => {
      toast.success("Updated");
      trackedRepos.refetch();
    },
  });

  const removeMutation = trpc.github.removeTracked.useMutation({
    onSuccess: () => {
      toast.success("Removed from tracking");
      trackedRepos.refetch();
    },
  });

  const utils = trpc.useUtils();

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    setPage(1);
  }, []);

  const handleTrack = useCallback((repo: any) => {
    trackMutation.mutate({
      ghId: repo.id,
      fullName: repo.full_name,
      owner: repo.owner?.login || repo.full_name.split("/")[0],
      name: repo.name,
      description: repo.description || null,
      language: repo.language || null,
      stars: repo.stargazers_count || 0,
      forks: repo.forks_count || 0,
      topics: repo.topics ? JSON.stringify(repo.topics) : null,
      htmlUrl: repo.html_url,
    });
  }, [trackMutation]);

  const handleAnalyze = useCallback((fullName: string) => {
    const [owner, repo] = fullName.split("/");
    setAnalyzeTarget({ owner, repo });
    setActiveTab("analyze");
  }, []);

  const toggleCategory = useCallback((cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  const trackedCount = trackedRepos.data?.length || 0;

  return (
    <div className="space-y-5 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl md:text-2xl tracking-wider text-foreground flex items-center gap-3">
            <Github className="w-6 h-6 text-neon-cyan" />
            GITHUB OSINT
          </h1>
          <p className="text-xs text-chrome-dim mt-1 font-mono tracking-wide">
            Open-Source Intelligence // Repository Search & Analysis
          </p>
        </div>
        <Badge variant="outline" className="border-neon-cyan/20 text-neon-cyan text-[10px]">
          <Bookmark className="w-3 h-3 mr-1" />
          {trackedCount} tracked
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-white/[0.03] border border-white/[0.06] h-9">
          <TabsTrigger value="search" className="text-xs gap-1.5 data-[state=active]:bg-neon-cyan/10 data-[state=active]:text-neon-cyan">
            <Search className="w-3.5 h-3.5" /> Search
          </TabsTrigger>
          <TabsTrigger value="curated" className="text-xs gap-1.5 data-[state=active]:bg-neon-green/10 data-[state=active]:text-neon-green">
            <Shield className="w-3.5 h-3.5" /> Arsenal
          </TabsTrigger>
          <TabsTrigger value="trending" className="text-xs gap-1.5 data-[state=active]:bg-neon-amber/10 data-[state=active]:text-neon-amber">
            <TrendingUp className="w-3.5 h-3.5" /> Trending
          </TabsTrigger>
          <TabsTrigger value="tracked" className="text-xs gap-1.5 data-[state=active]:bg-neon-blue/10 data-[state=active]:text-neon-blue">
            <BookmarkCheck className="w-3.5 h-3.5" /> Tracked
          </TabsTrigger>
          <TabsTrigger value="analyze" className="text-xs gap-1.5 data-[state=active]:bg-neon-magenta/10 data-[state=active]:text-neon-magenta">
            <Activity className="w-3.5 h-3.5" /> Analysis
          </TabsTrigger>
        </TabsList>

        {/* ── SEARCH TAB ─────────────────────────────────────── */}
        <TabsContent value="search" className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-chrome-dim" />
              <Input
                placeholder="Search GitHub repositories... (e.g., osint tools, threat intelligence, web scraper)"
                className="pl-9 bg-white/[0.02] border-white/[0.08] text-sm h-10"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                onKeyDown={(e) => e.key === "Enter" && handleSearch(searchQuery)}
              />
            </div>
            <Button
              onClick={() => handleSearch(searchQuery)}
              className="bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/20 h-10"
            >
              <Search className="w-4 h-4 mr-1" /> Search
            </Button>
          </div>

          {/* Sort buttons */}
          <div className="flex items-center gap-2 text-xs text-chrome-dim">
            <span>Sort:</span>
            {(["stars", "forks", "updated", "best-match"] as const).map(s => (
              <Button
                key={s}
                size="sm"
                variant={sortBy === s ? "default" : "ghost"}
                className={`h-6 text-[11px] px-2 ${sortBy === s ? "bg-neon-cyan/10 text-neon-cyan" : "text-chrome-dim hover:text-foreground"}`}
                onClick={() => { setSortBy(s); setPage(1); }}
              >
                {s === "stars" && <Star className="w-3 h-3 mr-1" />}
                {s === "forks" && <GitFork className="w-3 h-3 mr-1" />}
                {s === "updated" && <Activity className="w-3 h-3 mr-1" />}
                {s === "best-match" && <Search className="w-3 h-3 mr-1" />}
                {s.charAt(0).toUpperCase() + s.slice(1).replace("-", " ")}
              </Button>
            ))}
            {searchResults.data && searchQuery && (
              <span className="ml-auto text-[11px] text-chrome-dim">
                {formatNumber(searchResults.data.total_count)} results
              </span>
            )}
          </div>

          {/* Results */}
          {searchResults.isLoading && (
            <div className="flex items-center justify-center py-12 text-chrome-dim">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Searching GitHub...
            </div>
          )}

          {!searchQuery && (
            <div className="text-center py-16 space-y-4">
              <Github className="w-12 h-12 text-chrome-dim mx-auto opacity-30" />
              <p className="text-sm text-chrome-dim">
                Search GitHub for OSINT tools, security frameworks, and intelligence resources
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {QUICK_SEARCHES.map(q => (
                  <Button
                    key={q}
                    variant="outline"
                    size="sm"
                    className="text-[11px] border-white/10 hover:border-neon-cyan/30 hover:text-neon-cyan"
                    onClick={() => handleSearch(q)}
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {searchResults.data && searchQuery && (
            <ScrollArea className="h-[calc(100vh-340px)]">
              <div className="space-y-2 pr-2">
                {searchResults.data.items.map((repo: any) => (
                  <RepoCard
                    key={repo.id}
                    repo={repo}
                    onTrack={user ? () => handleTrack(repo) : undefined}
                    onAnalyze={() => handleAnalyze(repo.full_name)}
                    isTracking={trackMutation.isPending}
                  />
                ))}
              </div>
              {/* Pagination */}
              {searchResults.data.total_count > 20 && (
                <div className="flex justify-center gap-2 mt-4 pb-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs border-white/10"
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-chrome-dim self-center">
                    Page {page} of {Math.ceil(searchResults.data.total_count / 20)}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs border-white/10"
                    disabled={page * 20 >= searchResults.data.total_count}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </ScrollArea>
          )}
        </TabsContent>

        {/* ── CURATED ARSENAL TAB ─────────────────────────────── */}
        <TabsContent value="curated" className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-chrome-dim">
            <Shield className="w-4 h-4 text-neon-green" />
            <span className="font-heading tracking-wider text-foreground">OSINT & SECURITY ARSENAL</span>
            <span className="text-[11px]">{curatedTools.data?.tools.length || 0} curated tools</span>
          </div>

          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-2 pr-2">
              {curatedTools.data && Object.entries(curatedTools.data.collections).map(([category, tools]) => {
                const isExpanded = expandedCategories.has(category);
                const CatIcon = CATEGORY_ICONS[category] || Box;
                const color = CATEGORY_COLORS[category] || "text-chrome-dim";
                return (
                  <div key={category} className="rounded-lg border border-white/[0.06] overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between p-3 hover:bg-white/[0.02] transition-colors"
                      onClick={() => toggleCategory(category)}
                    >
                      <div className="flex items-center gap-2">
                        <CatIcon className={`w-4 h-4 ${color}`} />
                        <span className="font-heading text-sm tracking-wider text-foreground">{category}</span>
                        <span className="text-[10px] text-chrome-dim">{(tools as any[]).length}</span>
                      </div>
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-chrome-dim" /> : <ChevronRight className="w-4 h-4 text-chrome-dim" />}
                    </button>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3 pb-3 space-y-2">
                            {(tools as any[]).map((tool: any) => (
                              <div
                                key={tool.fullName}
                                className="flex items-center justify-between p-2.5 rounded border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] transition-colors"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <GitFork className="w-3.5 h-3.5 text-chrome-dim shrink-0" />
                                    <span className="font-mono text-xs text-neon-cyan">{tool.fullName}</span>
                                    <Badge variant="outline" className="text-[9px] px-1 py-0 border-neon-green/30 text-neon-green">
                                      OSINT Tool
                                    </Badge>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground mt-0.5 ml-5.5">{tool.description}</p>
                                  <div className="flex gap-1 mt-1 ml-5.5">
                                    {tool.tags.map((t: string) => (
                                      <span key={t} className="text-[9px] px-1 py-0 rounded bg-white/[0.03] text-chrome-dim">{t}</span>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex gap-1 shrink-0 ml-2">
                                  {user && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0 text-chrome-dim hover:text-neon-cyan"
                                      onClick={() => {
                                        const [owner, name] = tool.fullName.split("/");
                                        trackMutation.mutate({
                                          ghId: 0,
                                          fullName: tool.fullName,
                                          owner,
                                          name,
                                          description: tool.description,
                                          language: null,
                                          stars: 0,
                                          forks: 0,
                                          topics: JSON.stringify(tool.tags),
                                          htmlUrl: `https://github.com/${tool.fullName}`,
                                          category: tool.category as any,
                                        });
                                      }}
                                    >
                                      <Bookmark className="w-3.5 h-3.5" />
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-chrome-dim hover:text-neon-magenta"
                                    onClick={() => handleAnalyze(tool.fullName)}
                                  >
                                    <Activity className="w-3.5 h-3.5" />
                                  </Button>
                                  <button
                                    onClick={() => openLink(`https://github.com/${tool.fullName}`, tool.fullName)}
                                    className="inline-flex items-center justify-center h-6 w-6 rounded text-chrome-dim hover:text-neon-green transition-colors"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ── TRENDING TAB ──────────────────────────────────── */}
        <TabsContent value="trending" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-neon-amber" />
              <span className="font-heading tracking-wider text-foreground">TRENDING REPOSITORIES</span>
              <span className="text-[11px] text-chrome-dim">Last 7 days</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-xs border-white/10 hover:border-neon-amber/30"
              onClick={() => { utils.github.trending.invalidate(); }}
            >
              <RefreshCw className="w-3 h-3 mr-1" /> Refresh
            </Button>
          </div>

          {trending.isLoading && (
            <div className="flex items-center justify-center py-12 text-chrome-dim">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading trending repos...
            </div>
          )}

          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-2 pr-2">
              {trending.data?.map((repo: any) => (
                <RepoCard
                  key={repo.id}
                  repo={repo}
                  onTrack={user ? () => handleTrack(repo) : undefined}
                  onAnalyze={() => handleAnalyze(repo.full_name)}
                  isTracking={trackMutation.isPending}
                />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ── TRACKED TAB ──────────────────────────────────── */}
        <TabsContent value="tracked" className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <BookmarkCheck className="w-4 h-4 text-neon-blue" />
            <span className="font-heading tracking-wider text-foreground">TRACKED REPOSITORIES</span>
            <span className="text-[11px] text-chrome-dim">{trackedCount} repos</span>
          </div>

          {!user && (
            <div className="text-center py-16 text-chrome-dim text-sm">
              <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
              Sign in to track and manage repositories
            </div>
          )}

          {user && trackedCount === 0 && (
            <div className="text-center py-16 text-chrome-dim text-sm">
              <Bookmark className="w-10 h-10 mx-auto mb-3 opacity-30" />
              No tracked repositories yet. Search or browse the Arsenal to start tracking.
            </div>
          )}

          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-2 pr-2">
              {trackedRepos.data?.map((repo: any) => (
                <motion.div
                  key={repo.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <GitFork className="w-4 h-4 text-chrome-dim shrink-0" />
                        <button
                          onClick={() => openLink(repo.htmlUrl, repo.fullName)}
                          className="font-mono text-sm text-neon-cyan hover:underline truncate text-left"
                        >
                          {repo.fullName}
                        </button>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[repo.status]}`}>
                          {repo.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                        {repo.description || "No description"}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-chrome-dim">
                        {repo.language && <span>{repo.language}</span>}
                        <span className="flex items-center gap-1"><Star className="w-3 h-3" /> {formatNumber(repo.stars)}</span>
                        <span className="flex items-center gap-1"><GitFork className="w-3 h-3" /> {formatNumber(repo.forks)}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {(["watching", "imported", "starred", "archived"] as const).map(s => (
                        <Button
                          key={s}
                          size="sm"
                          variant={repo.status === s ? "default" : "ghost"}
                          className={`h-6 text-[10px] px-1.5 ${repo.status === s ? "bg-white/10" : "text-chrome-dim"}`}
                          onClick={() => updateTrackedMutation.mutate({ id: repo.id, status: s })}
                        >
                          {s === "watching" && <Eye className="w-3 h-3" />}
                          {s === "imported" && <CheckCircle className="w-3 h-3" />}
                          {s === "starred" && <Star className="w-3 h-3" />}
                          {s === "archived" && <Archive className="w-3 h-3" />}
                        </Button>
                      ))}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-chrome-dim hover:text-neon-red"
                        onClick={() => removeMutation.mutate({ id: repo.id })}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ── ANALYSIS TAB ──────────────────────────────────── */}
        <TabsContent value="analyze" className="space-y-4">
          {!analyzeTarget && (
            <div className="text-center py-16 text-chrome-dim text-sm">
              <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
              Select a repository to analyze from Search, Arsenal, or Trending tabs
            </div>
          )}

          {analyzeTarget && analysis.isLoading && (
            <div className="flex items-center justify-center py-12 text-chrome-dim">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Analyzing {analyzeTarget.owner}/{analyzeTarget.repo}...
            </div>
          )}

          {analyzeTarget && analysis.data && (
            <ScrollArea className="h-[calc(100vh-240px)]">
              <div className="space-y-4 pr-2">
                {/* Repo Header */}
                <Card className="bg-white/[0.02] border-white/[0.06]">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <GitFork className="w-5 h-5 text-neon-cyan" />
                          <h2 className="font-heading text-lg text-neon-cyan tracking-wider">
                            {analysis.data.repo.full_name}
                          </h2>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {analysis.data.repo.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-chrome-dim">
                          <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5" /> {formatNumber(analysis.data.repo.stargazers_count)}</span>
                          <span className="flex items-center gap-1"><GitFork className="w-3.5 h-3.5" /> {formatNumber(analysis.data.repo.forks_count)}</span>
                          <span className="flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> {analysis.data.repo.open_issues_count} issues</span>
                          {analysis.data.repo.language && <span>● {analysis.data.repo.language}</span>}
                        </div>
                      </div>
                      {/* OSINT Score */}
                      <div className="text-center">
                        <div
                          className={`w-14 h-14 rounded-full border-2 flex items-center justify-center text-lg font-bold ${
                            analysis.data.osintRelevance.score >= 70
                              ? "border-neon-green text-neon-green"
                              : analysis.data.osintRelevance.score >= 40
                              ? "border-neon-amber text-neon-amber"
                              : "border-chrome-dim text-chrome-dim"
                          }`}
                        >
                          {analysis.data.osintRelevance.score}
                        </div>
                        <span className="text-[10px] text-chrome-dim mt-1 block">OSINT Score</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Grid: Relevance + Health */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-white/[0.02] border-white/[0.06]">
                    <CardHeader className="pb-2 pt-3 px-4">
                      <CardTitle className="text-xs font-heading tracking-wider text-neon-cyan flex items-center gap-2">
                        <Target className="w-3.5 h-3.5" /> OSINT RELEVANCE
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                      {analysis.data.osintRelevance.categories.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {analysis.data.osintRelevance.categories.map((c: string) => (
                            <Badge key={c} variant="outline" className="text-[10px] border-neon-cyan/30 text-neon-cyan">{c}</Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-chrome-dim mb-2">No specific OSINT categories detected</p>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {analysis.data.osintRelevance.keywords.map((kw: string) => (
                          <span key={kw} className="text-[10px] px-1.5 py-0.5 rounded bg-neon-cyan/5 text-neon-cyan border border-neon-cyan/10">{kw}</span>
                        ))}
                        {analysis.data.osintRelevance.keywords.length === 0 && (
                          <span className="text-[10px] text-chrome-dim">analysis</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/[0.02] border-white/[0.06]">
                    <CardHeader className="pb-2 pt-3 px-4">
                      <CardTitle className="text-xs font-heading tracking-wider text-neon-amber flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5" /> HEALTH INDICATORS
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-3 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-chrome-dim">Last Push</span>
                        <span className={analysis.data.securityIndicators.daysSinceLastPush < 30 ? "text-neon-green" : "text-neon-amber"}>
                          {analysis.data.securityIndicators.daysSinceLastPush}d ago
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-chrome-dim">License</span>
                        <span className="text-foreground">{analysis.data.securityIndicators.licenseName || "None"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-chrome-dim">Archived</span>
                        <span className={analysis.data.securityIndicators.isArchived ? "text-neon-red" : "text-neon-green"}>
                          {analysis.data.securityIndicators.isArchived ? "Yes" : "No"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-chrome-dim">Issue Ratio</span>
                        <span className="text-foreground">{analysis.data.securityIndicators.openIssueRatio.toFixed(3)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Grid: Languages + Commits */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-white/[0.02] border-white/[0.06]">
                    <CardHeader className="pb-2 pt-3 px-4">
                      <CardTitle className="text-xs font-heading tracking-wider text-neon-green flex items-center gap-2">
                        <Code className="w-3.5 h-3.5" /> LANGUAGES
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-3 space-y-2">
                      {Object.entries(analysis.data.languages).length > 0 ? (
                        Object.entries(analysis.data.languages)
                          .sort(([, a], [, b]) => (b as number) - (a as number))
                          .slice(0, 6)
                          .map(([lang, bytes]) => {
                            const total = Object.values(analysis.data!.languages).reduce((a, b) => a + b, 0);
                            const pct = ((bytes as number) / total * 100).toFixed(1);
                            return (
                              <div key={lang} className="flex items-center gap-2 text-xs">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: LANG_COLORS[lang] || "#888" }} />
                                <span className="text-foreground w-20">{lang}</span>
                                <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: LANG_COLORS[lang] || "#888" }} />
                                </div>
                                <span className="text-chrome-dim w-10 text-right">{pct}%</span>
                              </div>
                            );
                          })
                      ) : (
                        <p className="text-xs text-chrome-dim">No language data available</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-white/[0.02] border-white/[0.06]">
                    <CardHeader className="pb-2 pt-3 px-4">
                      <CardTitle className="text-xs font-heading tracking-wider text-neon-magenta flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" /> RECENT COMMITS
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-3 space-y-2">
                      {analysis.data.recentCommits.length > 0 ? (
                        analysis.data.recentCommits.map((c: any) => (
                          <div key={c.sha} className="text-xs">
                            <div className="flex items-center gap-2">
                              <code className="text-neon-magenta text-[10px]">{c.sha}</code>
                              <span className="text-foreground truncate flex-1">{c.message}</span>
                            </div>
                            <div className="text-[10px] text-chrome-dim ml-14">
                              {c.author} · {timeAgo(c.date)}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-chrome-dim">No commit data available</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* README Preview */}
                {analysis.data.readme && (
                  <Card className="bg-white/[0.02] border-white/[0.06]">
                    <CardHeader className="pb-2 pt-3 px-4">
                      <CardTitle className="text-xs font-heading tracking-wider text-foreground flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" /> README PREVIEW
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                      <pre className="text-[11px] text-chrome-dim whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
                        {analysis.data.readme.slice(0, 3000)}
                      </pre>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          )}

          {analyzeTarget && analysis.isError && (
            <div className="text-center py-12 text-neon-red text-sm">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
              Failed to analyze repository. It may be private or rate-limited.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
