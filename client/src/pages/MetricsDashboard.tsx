import { useState } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Activity, BarChart3, Database, Shield, AlertTriangle, Clock,
  TrendingUp, Zap, Server, Eye, FileText, Copy, RefreshCw,
  CheckCircle, XCircle, Target, Brain, Globe,
} from "lucide-react";

const SEVERITY_COLORS: Record<string, string> = {
  low: "text-blue-400 border-blue-500/30",
  medium: "text-yellow-400 border-yellow-500/30",
  high: "text-orange-400 border-orange-500/30",
  critical: "text-red-400 border-red-500/30",
};

const TYPE_ICONS: Record<string, any> = {
  post: FileText,
  image: Eye,
  video: Activity,
  article: FileText,
  alert: AlertTriangle,
  stream: Globe,
  domain: Server,
  camera: Eye,
};

export default function MetricsDashboard() {
  const metrics = trpc.metrics.dashboard.useQuery(undefined, { refetchInterval: 30000 });

  const copyMetrics = () => {
    if (!metrics.data) return;
    const text = JSON.stringify(metrics.data, null, 2);
    navigator.clipboard.writeText(text);
    toast.success("Metrics copied to clipboard");
  };

  const d = metrics.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-mono">OPERATIONAL METRICS</h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">
            SIGNAL INTELLIGENCE // THROUGHPUT ANALYTICS // AUDIT TRAIL
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="font-mono text-xs" onClick={() => metrics.refetch()}>
            <RefreshCw className="w-3 h-3 mr-1" /> REFRESH
          </Button>
          <Button size="sm" variant="outline" className="font-mono text-xs" onClick={copyMetrics}>
            <Copy className="w-3 h-3 mr-1" /> EXPORT
          </Button>
        </div>
      </div>

      {!d ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="bg-card/40 border-border/30 animate-pulse">
              <CardContent className="p-4 h-24" />
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "TOTAL RECORDS", value: d.totalRecords, icon: Database, color: "text-cyan-400" },
              { label: "ENTITIES", value: d.totalEntities, icon: Brain, color: "text-purple-400" },
              { label: "ACTIVE CASES", value: d.totalCases, icon: Target, color: "text-green-400" },
              { label: "TRIAGE ALERTS", value: d.totalAlerts, icon: AlertTriangle, color: "text-red-400" },
              { label: "LAST 24H", value: d.last24hRecords, icon: Clock, color: "text-yellow-400" },
              { label: "LAST 7D", value: d.lastWeekRecords, icon: TrendingUp, color: "text-blue-400" },
              { label: "AVG TRIAGE", value: d.avgTriageScore, icon: Zap, color: "text-orange-400" },
              { label: "COLLECTORS", value: d.collectors.length, icon: Server, color: "text-emerald-400" },
            ].map((kpi, i) => (
              <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="bg-card/40 border-border/30 backdrop-blur-sm hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono text-muted-foreground">{kpi.label}</span>
                      <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                    </div>
                    <div className={`text-2xl font-bold font-mono ${kpi.color}`}>
                      {typeof kpi.value === "number" ? kpi.value.toLocaleString() : kpi.value}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Severity Distribution */}
            <Card className="bg-card/40 border-border/30 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-mono flex items-center gap-2">
                  <Shield className="w-4 h-4 text-red-400" /> SEVERITY DISTRIBUTION
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(d.severityCounts).map(([sev, count]) => {
                    const total = Object.values(d.severityCounts).reduce((a, b) => a + b, 0);
                    const pct = total > 0 ? (count / total) * 100 : 0;
                    return (
                      <div key={sev} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className={SEVERITY_COLORS[sev]?.split(" ")[0] || "text-muted-foreground"}>
                            {sev.toUpperCase()}
                          </span>
                          <span className="text-muted-foreground">{count} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="h-2 rounded-full bg-background/50 overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${
                              sev === "critical" ? "bg-red-500" :
                              sev === "high" ? "bg-orange-500" :
                              sev === "medium" ? "bg-yellow-500" : "bg-blue-500"
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Record Types */}
            <Card className="bg-card/40 border-border/30 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-mono flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-cyan-400" /> RECORD TYPES
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(d.typeCounts)
                    .sort(([, a], [, b]) => b - a)
                    .map(([type, count]) => {
                      const Icon = TYPE_ICONS[type] || FileText;
                      const total = Object.values(d.typeCounts).reduce((a, b) => a + b, 0);
                      const pct = total > 0 ? (count / total) * 100 : 0;
                      return (
                        <div key={type} className="flex items-center gap-2 text-xs font-mono">
                          <Icon className="w-3 h-3 text-muted-foreground" />
                          <span className="w-16 text-muted-foreground">{type.toUpperCase()}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-background/50 overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-cyan-500/60"
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.8 }}
                            />
                          </div>
                          <span className="w-8 text-right">{count}</span>
                        </div>
                      );
                    })}
                  {Object.keys(d.typeCounts).length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No records yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Alert Status */}
            <Card className="bg-card/40 border-border/30 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-mono flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400" /> ALERT STATUS
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(d.alertStatusCounts).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between p-2 rounded bg-background/50">
                      <div className="flex items-center gap-2">
                        {status === "resolved" ? (
                          <CheckCircle className="w-3 h-3 text-green-400" />
                        ) : status === "dismissed" ? (
                          <XCircle className="w-3 h-3 text-muted-foreground" />
                        ) : (
                          <AlertTriangle className="w-3 h-3 text-yellow-400" />
                        )}
                        <span className="text-xs font-mono">{status.toUpperCase()}</span>
                      </div>
                      <Badge variant="outline" className="text-xs font-mono">{count}</Badge>
                    </div>
                  ))}
                  {Object.keys(d.alertStatusCounts).length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No alerts yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Collector Status */}
          <Card className="bg-card/40 border-border/30 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-mono flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-400" /> COLLECTOR STATUS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {d.collectors.map((c: any) => (
                  <div key={c.id} className="p-3 rounded-lg bg-background/50 border border-border/20 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-mono font-bold truncate">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.type}</div>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono border-green-500/30 text-green-400">ACTIVE</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Records */}
          <Card className="bg-card/40 border-border/30 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-mono flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" /> RECENT INTELLIGENCE RECORDS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-2">
                  {d.recentRecords.length > 0 ? d.recentRecords.map((r: any) => {
                    const Icon = TYPE_ICONS[r.recordType] || FileText;
                    return (
                      <div key={r.id} className="p-3 rounded-lg bg-background/50 border border-border/20 flex items-start gap-3">
                        <Icon className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{r.title || "Untitled"}</span>
                            <Badge variant="outline" className={`text-xs font-mono ${SEVERITY_COLORS[r.severity || "low"]}`}>
                              {(r.severity || "low").toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{r.content || "—"}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground font-mono">
                            <span>{r.collectorId}</span>
                            <span>{new Date(r.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }) : (
                    <p className="text-xs text-muted-foreground text-center py-8 font-mono">
                      No records yet — ingest data via Live Feed or Source Connectors
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
