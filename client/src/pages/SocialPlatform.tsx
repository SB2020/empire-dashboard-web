import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Shield, Users, MessageSquare, ThumbsUp, ThumbsDown, Flag, Copy, Send,
  Lock, Eye, Globe, AlertTriangle, Star, Zap, Crown, UserPlus, Hash,
  Image, Link2, Brain, BarChart3, ChevronDown, ChevronUp, Clock,
} from "lucide-react";

const TRUST_LEVELS = {
  unverified: { color: "text-red-400", bg: "bg-red-500/10", icon: AlertTriangle, label: "Unverified" },
  newcomer: { color: "text-yellow-400", bg: "bg-yellow-500/10", icon: Star, label: "Newcomer" },
  member: { color: "text-blue-400", bg: "bg-blue-500/10", icon: Users, label: "Member" },
  trusted: { color: "text-green-400", bg: "bg-green-500/10", icon: Shield, label: "Trusted" },
  elder: { color: "text-purple-400", bg: "bg-purple-500/10", icon: Crown, label: "Elder" },
} as const;

const POST_TYPES = [
  { value: "text" as const, label: "Text", icon: MessageSquare },
  { value: "image" as const, label: "Image", icon: Image },
  { value: "link" as const, label: "Link", icon: Link2 },
  { value: "intel" as const, label: "Intel", icon: Brain },
  { value: "analysis" as const, label: "Analysis", icon: BarChart3 },
];

const VISIBILITY_OPTIONS = [
  { value: "public" as const, label: "Public", icon: Globe },
  { value: "trusted" as const, label: "Trusted Only", icon: Shield },
  { value: "private" as const, label: "Private", icon: Lock },
];

export default function SocialPlatform() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"feed" | "compose" | "invites" | "trust">("feed");
  const [filterType, setFilterType] = useState<string | undefined>();
  const [redeemCode, setRedeemCode] = useState("");

  // Compose state
  const [postType, setPostType] = useState<"text" | "image" | "link" | "intel" | "analysis">("text");
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postVisibility, setPostVisibility] = useState<"public" | "trusted" | "private">("public");
  const [postTags, setPostTags] = useState("");

  // Queries
  const trust = trpc.social.myTrust.useQuery(undefined, { enabled: !!user });
  const invites = trpc.social.myInvites.useQuery(undefined, { enabled: !!user && activeTab === "invites" });
  const posts = trpc.social.listPosts.useQuery(
    { type: filterType as any, limit: 20, offset: 0 },
    { enabled: !!user }
  );

  // Mutations
  const createInvite = trpc.social.createInvite.useMutation({
    onSuccess: (data) => { toast.success(`Invite code: ${data.code}`); invites.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const redeemInvite = trpc.social.redeemInvite.useMutation({
    onSuccess: () => { toast.success("Invite redeemed!"); trust.refetch(); setRedeemCode(""); },
    onError: (e) => toast.error(e.message),
  });
  const createPost = trpc.social.createPost.useMutation({
    onSuccess: () => {
      toast.success("Post published!");
      posts.refetch();
      setPostTitle(""); setPostContent(""); setPostTags("");
      setActiveTab("feed");
    },
    onError: (e) => toast.error(e.message),
  });
  const vote = trpc.social.vote.useMutation({
    onSuccess: () => posts.refetch(),
    onError: (e) => toast.error(e.message),
  });
  const flagPost = trpc.social.flagPost.useMutation({
    onSuccess: () => toast.success("Post flagged for review"),
    onError: (e) => toast.error(e.message),
  });

  const trustLevel = trust.data?.level as keyof typeof TRUST_LEVELS || "unverified";
  const trustInfo = TRUST_LEVELS[trustLevel];
  const TrustIcon = trustInfo.icon;

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-neon-cyan" />
            NEXUS — Secure Intelligence Community
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Invite-only · P2P trust · Anti-bot verified · Self-hosted content
          </p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${trustInfo.bg}`}>
          <TrustIcon className={`w-4 h-4 ${trustInfo.color}`} />
          <span className={`text-sm font-medium ${trustInfo.color}`}>
            {trustInfo.label} — Score: {trust.data?.score ?? 50}
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 rounded-lg bg-card/50 border border-border/30 w-fit">
        {[
          { id: "feed" as const, label: "Feed", icon: MessageSquare },
          { id: "compose" as const, label: "Compose", icon: Send },
          { id: "invites" as const, label: "Invites", icon: UserPlus },
          { id: "trust" as const, label: "Trust", icon: Shield },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-neon-cyan/20 text-neon-cyan"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Feed Tab */}
      {activeTab === "feed" && (
        <div className="space-y-4">
          {/* Type Filters */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterType(undefined)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                !filterType ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30" : "bg-card/50 text-muted-foreground border border-border/30 hover:text-foreground"
              }`}
            >
              All
            </button>
            {POST_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setFilterType(t.value)}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  filterType === t.value ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30" : "bg-card/50 text-muted-foreground border border-border/30 hover:text-foreground"
                }`}
              >
                <t.icon className="w-3 h-3" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Posts */}
          {posts.isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 rounded-lg bg-card/30 animate-pulse" />
              ))}
            </div>
          ) : !posts.data?.length ? (
            <Card className="glass-panel border-border/30">
              <CardContent className="py-12 text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">No posts yet. Be the first to share intelligence.</p>
                <Button variant="outline" className="mt-4" onClick={() => setActiveTab("compose")}>
                  <Send className="w-4 h-4 mr-2" />
                  Create Post
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {posts.data.map((post) => {
                const typeInfo = POST_TYPES.find((t) => t.value === post.type) || POST_TYPES[0];
                const TypeIcon = typeInfo.icon;
                return (
                  <Card key={post.id} className="glass-panel border-border/30 hover:border-neon-cyan/20 transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-neon-cyan/10 flex items-center justify-center">
                            <span className="text-xs font-bold text-neon-cyan">
                              {(post.authorName || "?")[0]?.toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-foreground">{post.authorName || "Anonymous"}</span>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {new Date(post.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <TypeIcon className="w-3 h-3" />
                            {typeInfo.label}
                          </Badge>
                          {post.visibility === "trusted" && (
                            <Badge variant="outline" className="text-xs text-green-400 border-green-400/30">
                              <Shield className="w-3 h-3 mr-1" />
                              Trusted
                            </Badge>
                          )}
                          {post.visibility === "private" && (
                            <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-400/30">
                              <Lock className="w-3 h-3 mr-1" />
                              Private
                            </Badge>
                          )}
                        </div>
                      </div>

                      {post.title && (
                        <h3 className="text-base font-semibold text-foreground mb-1">{post.title}</h3>
                      )}
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {post.content}
                      </p>

                      {(() => {
                        const tags = post.tags as string[] | null;
                        if (!tags || !Array.isArray(tags) || tags.length === 0) return null;
                        return (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {tags.map((tag: string, i: number) => (
                              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-neon-cyan/10 text-neon-cyan">
                                #{String(tag)}
                              </span>
                            ))}
                          </div>
                        );
                      })()}

                      {/* Actions */}
                      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/20">
                        <button
                          onClick={() => vote.mutate({ postId: post.id, vote: "up" })}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-green-400 transition-colors"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          {post.upvotes}
                        </button>
                        <button
                          onClick={() => vote.mutate({ postId: post.id, vote: "down" })}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-400 transition-colors"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                          {post.downvotes}
                        </button>
                        <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-neon-cyan transition-colors">
                          <MessageSquare className="w-3.5 h-3.5" />
                          {post.replyCount}
                        </button>
                        <div className="flex-1" />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(post.content);
                            toast.success("Copied to clipboard");
                          }}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => flagPost.mutate({ postId: post.id, reason: "spam" })}
                          className="text-xs text-muted-foreground hover:text-red-400 transition-colors"
                        >
                          <Flag className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Compose Tab */}
      {activeTab === "compose" && (
        <Card className="glass-panel border-border/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Send className="w-5 h-5 text-neon-cyan" />
              Compose Post
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Post Type */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Type</label>
              <div className="flex gap-2">
                {POST_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setPostType(t.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all ${
                      postType === t.value
                        ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30"
                        : "bg-card/50 text-muted-foreground border border-border/30 hover:text-foreground"
                    }`}
                  >
                    <t.icon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Visibility */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Visibility</label>
              <div className="flex gap-2">
                {VISIBILITY_OPTIONS.map((v) => (
                  <button
                    key={v.value}
                    onClick={() => setPostVisibility(v.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all ${
                      postVisibility === v.value
                        ? "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30"
                        : "bg-card/50 text-muted-foreground border border-border/30 hover:text-foreground"
                    }`}
                  >
                    <v.icon className="w-3.5 h-3.5" />
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            <Input
              placeholder="Title (optional)"
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
              className="bg-background/50 border-border/30"
            />

            <Textarea
              placeholder="Share intelligence, analysis, or insights..."
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              rows={6}
              className="bg-background/50 border-border/30 resize-none"
            />

            <Input
              placeholder="Tags (comma separated)"
              value={postTags}
              onChange={(e) => setPostTags(e.target.value)}
              className="bg-background/50 border-border/30"
            />

            <Button
              onClick={() => createPost.mutate({
                type: postType,
                title: postTitle || undefined,
                content: postContent,
                visibility: postVisibility,
                tags: postTags ? postTags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
              })}
              disabled={!postContent.trim() || createPost.isPending}
              className="w-full bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30 hover:bg-neon-cyan/30"
            >
              <Send className="w-4 h-4 mr-2" />
              {createPost.isPending ? "Publishing..." : "Publish Post"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Invites Tab */}
      {activeTab === "invites" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="glass-panel border-border/30">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-neon-cyan" />
                Generate Invite
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Growth is invite-only. Generate codes to bring trusted members into the network.
              </p>
              <Button
                onClick={() => createInvite.mutate({ maxUses: 1 })}
                disabled={createInvite.isPending}
                className="w-full bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30 hover:bg-neon-cyan/30"
              >
                <Zap className="w-4 h-4 mr-2" />
                {createInvite.isPending ? "Generating..." : "Generate Invite Code"}
              </Button>

              {invites.data && invites.data.length > 0 && (
                <div className="space-y-2 mt-4">
                  <h4 className="text-xs font-medium text-muted-foreground">Your Invites</h4>
                  {invites.data.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between p-2 rounded-lg bg-background/30 border border-border/20">
                      <div>
                        <code className="text-sm font-mono text-neon-cyan">{inv.code}</code>
                        <span className="text-xs text-muted-foreground ml-2">
                          {String(inv.usedCount)}/{String(inv.maxUses)} used
                        </span>
                      </div>
                      <button
                        onClick={() => { navigator.clipboard.writeText(inv.code); toast.success("Code copied!"); }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-panel border-border/30">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lock className="w-5 h-5 text-neon-amber" />
                Redeem Invite
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Enter an invite code to join the network and establish your trust chain.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter invite code..."
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                  className="bg-background/50 border-border/30 font-mono"
                />
                <Button
                  onClick={() => redeemInvite.mutate({ code: redeemCode })}
                  disabled={!redeemCode.trim() || redeemInvite.isPending}
                  variant="outline"
                >
                  Redeem
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trust Tab */}
      {activeTab === "trust" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="glass-panel border-border/30 md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5 text-neon-cyan" />
                Trust Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-xl ${trustInfo.bg} flex items-center justify-center`}>
                  <TrustIcon className={`w-8 h-8 ${trustInfo.color}`} />
                </div>
                <div>
                  <div className={`text-xl font-bold ${trustInfo.color}`}>{trustInfo.label}</div>
                  <div className="text-sm text-muted-foreground">Trust Score: {trust.data?.score ?? 50}/100</div>
                </div>
              </div>

              {/* Trust Score Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Trust Progress</span>
                  <span>{trust.data?.score ?? 50}%</span>
                </div>
                <div className="h-2 rounded-full bg-background/50 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-red-500 via-yellow-500 via-blue-500 to-green-500 transition-all duration-500"
                    style={{ width: `${trust.data?.score ?? 50}%` }}
                  />
                </div>
              </div>

              {/* Trust Factors */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-background/30 border border-border/20">
                  <div className="text-xs text-muted-foreground">Posts</div>
                  <div className="text-lg font-bold text-foreground">{trust.data?.postsCount ?? 0}</div>
                </div>
                <div className="p-3 rounded-lg bg-background/30 border border-border/20">
                  <div className="text-xs text-muted-foreground">Flags Received</div>
                  <div className="text-lg font-bold text-foreground">{trust.data?.flagsReceived ?? 0}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel border-border/30">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="w-4 h-4 text-neon-amber" />
                Trust Levels
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(TRUST_LEVELS).map(([key, info]) => {
                const Icon = info.icon;
                return (
                  <div
                    key={key}
                    className={`flex items-center gap-2 p-2 rounded-lg ${
                      key === trustLevel ? `${info.bg} border border-current/20` : "opacity-50"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${info.color}`} />
                    <span className={`text-sm ${info.color}`}>{info.label}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* P2P Architecture Info */}
      <Card className="glass-panel border-border/30">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-neon-cyan/10 flex items-center justify-center flex-shrink-0">
              <Lock className="w-5 h-5 text-neon-cyan" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-foreground">P2P-Like Architecture</h4>
              <p className="text-xs text-muted-foreground">
                Content is self-hosted and visible to the community upon user initialization. Invite-only growth with trust-based access control.
                Anti-bot verification through invite chains and behavioral scoring. No external bots can infiltrate the network.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
