import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { Streamdown } from "streamdown";
import {
  User, Search, MapPin, Briefcase, AtSign, Globe, Shield, Clock,
  ExternalLink, Loader2, AlertTriangle, CheckCircle2, ChevronDown,
  ChevronUp, Twitter, Linkedin, Eye, Target, FileText, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAppLink } from "@/hooks/useAppLink";

const stagger = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

function ConfidenceMeter({ value }: { value: number }) {
  const color = value >= 70 ? "bg-emerald-500" : value >= 40 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <span className="font-mono text-xs text-muted-foreground w-10 text-right">{value}%</span>
    </div>
  );
}

function SignificanceBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    critical: "bg-red-500/20 text-red-400 border-red-500/30",
    high: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    medium: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    low: "bg-white/10 text-muted-foreground border-white/10",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase border ${colors[level] || colors.low}`}>
      {level}
    </span>
  );
}

export default function HumintProfiler() {
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [company, setCompany] = useState("");
  const [context, setContext] = useState("");
  const [showRawIntel, setShowRawIntel] = useState(false);
  const { openLink } = useAppLink();

  const profileMutation = trpc.humint.profile.useMutation({
    onError: (err) => toast.error(`HUMINT Error: ${err.message}`),
  });

  const quickMutation = trpc.humint.quickLookup.useMutation();

  const handleProfile = () => {
    if (!name && !handle) {
      toast.error("Provide at least a name or social handle");
      return;
    }
    profileMutation.mutate({
      name: name || undefined,
      handle: handle || undefined,
      company: company || undefined,
      additionalContext: context || undefined,
    });
  };

  const handleQuickLookup = () => {
    if (!handle) {
      toast.error("Enter a social handle for quick lookup");
      return;
    }
    quickMutation.mutate({ query: handle });
  };

  const profile = profileMutation.data;
  const quickData = quickMutation.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div {...stagger} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl glass-elevated flex items-center justify-center glow-teal">
            <Target className="h-6 w-6 text-neon-cyan" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold tracking-wider chrome-text-teal uppercase">
              HUMINT Profiler
            </h1>
            <p className="text-xs font-mono text-muted-foreground tracking-wider">
              PERSON INTELLIGENCE // CROSS-REFERENCE DOSSIER BUILDER
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-mono text-emerald-400 tracking-wider">LINKEDIN + TWITTER ACTIVE</span>
        </div>
      </motion.div>

      {/* Search Panel */}
      <motion.div {...stagger} transition={{ delay: 0.1 }} className="glass-elevated edge-light p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Search className="h-4 w-4 text-teal-glow" />
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Target Acquisition</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1 block">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={name} onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full h-10 pl-10 pr-4 rounded-lg glass-panel border-border/30 bg-transparent text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-teal-glow/50 transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1 block">Social Handle</label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={handle} onChange={(e) => setHandle(e.target.value)}
                placeholder="@username or Twitter/LinkedIn URL"
                className="w-full h-10 pl-10 pr-4 rounded-lg glass-panel border-border/30 bg-transparent text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-teal-glow/50 transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1 block">Company / Organization</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={company} onChange={(e) => setCompany(e.target.value)}
                placeholder="Acme Corp"
                className="w-full h-10 pl-10 pr-4 rounded-lg glass-panel border-border/30 bg-transparent text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-teal-glow/50 transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1 block">Additional Context</label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={context} onChange={(e) => setContext(e.target.value)}
                placeholder="Any additional info..."
                className="w-full h-10 pl-10 pr-4 rounded-lg glass-panel border-border/30 bg-transparent text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-teal-glow/50 transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            onClick={handleProfile}
            disabled={profileMutation.isPending}
            className="glass-panel border-teal-glow/30 text-neon-cyan hover:text-foreground font-mono text-xs uppercase tracking-wider transition-all duration-500 hover:glow-teal-strong"
          >
            {profileMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Target className="h-4 w-4 mr-2" />}
            Build Full Dossier
          </Button>
          <Button
            onClick={handleQuickLookup}
            disabled={quickMutation.isPending}
            variant="outline"
            className="glass-panel border-border/30 text-muted-foreground hover:text-foreground font-mono text-xs uppercase tracking-wider"
          >
            {quickMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
            Quick Lookup
          </Button>
        </div>
      </motion.div>

      {/* Quick Lookup Results */}
      <AnimatePresence>
        {quickData && (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            className="glass-elevated edge-light p-6 space-y-4"
          >
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-neon-amber" />
              <span className="text-xs font-mono text-neon-amber uppercase tracking-widest">Quick Lookup Results</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quickData.twitter && (
                <div className="glass-panel p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Twitter className="h-4 w-4 text-blue-400" />
                    <span className="font-mono text-sm text-blue-400">@{quickData.twitter.username}</span>
                    {quickData.twitter.blueVerified && <CheckCircle2 className="h-3 w-3 text-blue-400" />}
                  </div>
                  <p className="text-sm text-foreground">{quickData.twitter.displayName}</p>
                  <p className="text-xs text-muted-foreground">{quickData.twitter.bio}</p>
                  <div className="flex gap-4 text-[10px] font-mono text-muted-foreground">
                    <span>{quickData.twitter.followers.toLocaleString()} followers</span>
                    <span>{quickData.twitter.following.toLocaleString()} following</span>
                  </div>
                </div>
              )}
              {quickData.linkedin.length > 0 && (
                <div className="glass-panel p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Linkedin className="h-4 w-4 text-blue-500" />
                    <span className="font-mono text-sm text-blue-500">LinkedIn</span>
                  </div>
                  {quickData.linkedin.slice(0, 3).map((p, i) => (
                    <div key={i} className="border-t border-border/20 pt-2">
                      <p className="text-sm text-foreground">{p.fullName}</p>
                      <p className="text-xs text-muted-foreground">{p.headline}</p>
                      <p className="text-[10px] text-muted-foreground/60">{p.location}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      <AnimatePresence>
        {profileMutation.isPending && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="glass-elevated edge-light p-8 flex flex-col items-center gap-4"
          >
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-2 border-teal-glow/30 animate-spin" style={{ borderTopColor: "oklch(0.75 0.15 195)" }} />
              <Eye className="absolute inset-0 m-auto h-6 w-6 text-teal-glow" />
            </div>
            <div className="text-center">
              <p className="font-mono text-sm text-neon-cyan tracking-wider">BUILDING DOSSIER...</p>
              <p className="text-xs text-muted-foreground mt-1">Cross-referencing LinkedIn, Twitter/X, and LLM synthesis</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Dossier */}
      <AnimatePresence>
        {profile && !profileMutation.isPending && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Dossier Header */}
            <div className="glass-elevated edge-light p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-xl glass-panel flex items-center justify-center border border-teal-glow/20">
                    <User className="h-7 w-7 text-neon-cyan" />
                  </div>
                  <div>
                    <h2 className="text-xl font-heading font-bold chrome-text-teal uppercase tracking-wider">
                      {profile.name}
                    </h2>
                    <p className="text-sm text-muted-foreground font-mono">{profile.occupation}</p>
                    {profile.aliases.length > 0 && (
                      <p className="text-[10px] font-mono text-muted-foreground/60 mt-1">
                        AKA: {profile.aliases.join(", ")}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Confidence</p>
                  <div className="w-32">
                    <ConfidenceMeter value={profile.confidence} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="glass-panel p-3">
                  <MapPin className="h-3 w-3 text-muted-foreground mb-1" />
                  <p className="text-[10px] font-mono text-muted-foreground uppercase">Location</p>
                  <p className="text-sm font-mono text-foreground">{profile.location || "Unknown"}</p>
                </div>
                <div className="glass-panel p-3">
                  <Briefcase className="h-3 w-3 text-muted-foreground mb-1" />
                  <p className="text-[10px] font-mono text-muted-foreground uppercase">Company</p>
                  <p className="text-sm font-mono text-foreground">{profile.company || "Unknown"}</p>
                </div>
                <div className="glass-panel p-3">
                  <Globe className="h-3 w-3 text-muted-foreground mb-1" />
                  <p className="text-[10px] font-mono text-muted-foreground uppercase">Sources</p>
                  <p className="text-sm font-mono text-foreground">{profile.sources.join(", ") || "LLM"}</p>
                </div>
                <div className="glass-panel p-3">
                  <Shield className="h-3 w-3 text-muted-foreground mb-1" />
                  <p className="text-[10px] font-mono text-muted-foreground uppercase">Risk Level</p>
                  <p className="text-sm font-mono text-foreground">{profile.riskAssessment.substring(0, 30)}</p>
                </div>
              </div>

              <div className="glass-panel p-4">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">Bio Summary</p>
                <p className="text-sm text-foreground leading-relaxed">{profile.bio}</p>
              </div>
            </div>

            {/* Social Profiles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.twitter && (
                <div className="glass-elevated edge-light p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Twitter className="h-4 w-4 text-blue-400" />
                    <span className="font-mono text-sm text-blue-400 font-bold">Twitter/X Intelligence</span>
                    {profile.twitter.blueVerified && <CheckCircle2 className="h-3 w-3 text-blue-400" />}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-muted-foreground">Handle</span>
                      <span className="text-foreground">@{profile.twitter.username}</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-muted-foreground">Followers</span>
                      <span className="text-foreground">{profile.twitter.followers.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-muted-foreground">Following</span>
                      <span className="text-foreground">{profile.twitter.following.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-muted-foreground">Total Tweets</span>
                      <span className="text-foreground">{profile.twitter.tweets.toLocaleString()}</span>
                    </div>
                    {profile.twitter.location && (
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-muted-foreground">Location</span>
                        <span className="text-foreground">{profile.twitter.location}</span>
                      </div>
                    )}
                  </div>
                  {profile.twitter.bio && (
                    <div className="glass-panel p-3 mt-2">
                      <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">Bio</p>
                      <p className="text-xs text-foreground">{profile.twitter.bio}</p>
                    </div>
                  )}
                  {profile.twitter.recentTweets.length > 0 && (
                    <div className="space-y-2 mt-2">
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Recent Activity</p>
                      {profile.twitter.recentTweets.slice(0, 3).map((t, i) => (
                        <div key={i} className="glass-panel p-3">
                          <p className="text-xs text-foreground">{t.text.substring(0, 200)}</p>
                          <div className="flex gap-3 mt-1 text-[10px] font-mono text-muted-foreground">
                            <span>❤ {t.likes}</span>
                            <span>🔁 {t.retweets}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {profile.linkedin && (
                <div className="glass-elevated edge-light p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Linkedin className="h-4 w-4 text-blue-500" />
                    <span className="font-mono text-sm text-blue-500 font-bold">LinkedIn Intelligence</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-muted-foreground">Full Name</span>
                      <span className="text-foreground">{profile.linkedin.fullName}</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-muted-foreground">Headline</span>
                      <span className="text-foreground truncate ml-4">{profile.linkedin.headline}</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-muted-foreground">Location</span>
                      <span className="text-foreground">{profile.linkedin.location}</span>
                    </div>
                    {profile.linkedin.profileUrl && (
                      <button onClick={() => openLink(profile.linkedin!.profileUrl, "LinkedIn Profile")}
                        className="flex items-center gap-1 text-xs font-mono text-teal-glow hover:underline mt-2">
                        <ExternalLink className="h-3 w-3" /> View Profile
                      </button>
                    )}
                  </div>
                  {profile.linkedin.summary && (
                    <div className="glass-panel p-3 mt-2">
                      <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">Summary</p>
                      <p className="text-xs text-foreground">{profile.linkedin.summary.substring(0, 300)}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Risk Assessment */}
            <div className="glass-elevated edge-light p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-neon-amber" />
                <span className="font-mono text-sm text-neon-amber font-bold uppercase tracking-wider">Risk Assessment</span>
              </div>
              <div className="glass-panel p-4">
                <Streamdown>{profile.riskAssessment}</Streamdown>
              </div>
            </div>

            {/* Connections */}
            {profile.connections.length > 0 && (
              <div className="glass-elevated edge-light p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="h-4 w-4 text-neon-cyan" />
                  <span className="font-mono text-sm text-neon-cyan font-bold uppercase tracking-wider">Known Connections</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.connections.map((c, i) => (
                    <span key={i} className="glass-panel px-3 py-1.5 text-xs font-mono text-foreground">{c}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline */}
            {profile.timeline.length > 0 && (
              <div className="glass-elevated edge-light p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-neon-magenta" />
                  <span className="font-mono text-sm text-neon-magenta font-bold uppercase tracking-wider">Intelligence Timeline</span>
                </div>
                <div className="space-y-2">
                  {profile.timeline.map((t, i) => (
                    <div key={i} className="flex items-start gap-3 glass-panel p-3">
                      <div className="flex flex-col items-center">
                        <div className="h-2 w-2 rounded-full bg-teal-glow mt-1" />
                        {i < profile.timeline.length - 1 && <div className="w-px h-full bg-border/30 mt-1" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-mono text-muted-foreground">{t.date}</span>
                          <SignificanceBadge level={t.significance} />
                          <span className="text-[10px] font-mono text-muted-foreground/50">via {t.source}</span>
                        </div>
                        <p className="text-xs text-foreground">{t.event}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw Intel Toggle */}
            <div className="glass-elevated edge-light p-4">
              <button
                onClick={() => setShowRawIntel(!showRawIntel)}
                className="flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors w-full"
              >
                {showRawIntel ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                <span className="uppercase tracking-widest">Raw Intelligence Data</span>
              </button>
              <AnimatePresence>
                {showRawIntel && (
                  <motion.pre
                    initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="mt-3 text-[11px] font-mono text-muted-foreground whitespace-pre-wrap overflow-auto max-h-96 glass-panel p-4"
                  >
                    {profile.rawIntel}
                  </motion.pre>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
