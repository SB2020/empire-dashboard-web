import { useState } from "react";
import { useAppLink } from "@/hooks/useAppLink";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Database, Globe, Rss, Radio, FileText, Server, Play, Loader2,
  CheckCircle, XCircle, Clock, Copy, ExternalLink, Search, Shield,
  Wifi, AlertTriangle, ChevronRight, RefreshCw, Zap,
} from "lucide-react";

const COLLECTOR_ICONS: Record<string, any> = {
  shodan: Server,
  whois: Globe,
  rss: Rss,
  streams: Radio,
  datasets: FileText,
};

const COLLECTOR_COLORS: Record<string, string> = {
  shodan: "text-red-400",
  whois: "text-blue-400",
  rss: "text-orange-400",
  streams: "text-green-400",
  datasets: "text-purple-400",
};

export default function SourceConnectors() {
  const { openLink } = useAppLink();

  const [activeTab, setActiveTab] = useState("collectors");
  const [shodanQuery, setShodanQuery] = useState("");
  const [whoisDomain, setWhoisDomain] = useState("");
  const [runningCollector, setRunningCollector] = useState<string | null>(null);
  const [collectorResults, setCollectorResults] = useState<Record<string, any>>({});

  const collectors = trpc.collectors.list.useQuery();
  const streams = trpc.collectors.streams.useQuery();
  const datasets = trpc.collectors.datasets.useQuery();
  const runCollector = trpc.collectors.run.useMutation();
  const shodanSearch = trpc.collectors.shodan.useQuery(
    { query: shodanQuery },
    { enabled: shodanQuery.length > 2 }
  );
  const whoisSearch = trpc.collectors.whois.useQuery(
    { domain: whoisDomain },
    { enabled: whoisDomain.length > 3 && whoisDomain.includes(".") }
  );

  const handleRunCollector = async (collectorId: string) => {
    setRunningCollector(collectorId);
    try {
      const params: Record<string, any> = {};
      if (collectorId === "shodan") params.query = shodanQuery || "port:443";
      if (collectorId === "whois") params.domain = whoisDomain || "example.com";

      const result = await runCollector.mutateAsync({ collectorId, params });
      setCollectorResults(prev => ({ ...prev, [collectorId]: result }));
      toast.success(`${collectorId.toUpperCase()}: ${result.status} — ${result.itemsCollected} items in ${result.durationMs}ms`);
    } catch (e: any) {
      toast.error(`Collector Error: ${e.message}`);
    } finally {
      setRunningCollector(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-mono">SOURCE CONNECTORS</h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">
            COLLECTOR MANAGEMENT // DATA INGESTION PIPELINE // {collectors.data?.length || 0} SOURCES CONFIGURED
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-green-500/30 text-green-400 font-mono text-xs">
            <Wifi className="w-3 h-3 mr-1" /> {collectors.data?.length || 0} SOURCES
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card/50 border border-border/30">
          <TabsTrigger value="collectors" className="font-mono text-xs">COLLECTORS</TabsTrigger>
          <TabsTrigger value="shodan" className="font-mono text-xs">SHODAN/INFRA</TabsTrigger>
          <TabsTrigger value="whois" className="font-mono text-xs">WHOIS/DNS/CT</TabsTrigger>
          <TabsTrigger value="rss" className="font-mono text-xs">RSS FEEDS</TabsTrigger>
          <TabsTrigger value="streams" className="font-mono text-xs">LIVE STREAMS</TabsTrigger>
          <TabsTrigger value="datasets" className="font-mono text-xs">DATASETS</TabsTrigger>
        </TabsList>

        {/* ─── Collectors Overview ─────────────────────────────────────── */}
        <TabsContent value="collectors" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {collectors.data?.map((c) => {
              const Icon = COLLECTOR_ICONS[c.id] || Database;
              const color = COLLECTOR_COLORS[c.id] || "text-muted-foreground";
              const result = collectorResults[c.id];
              return (
                <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="bg-card/40 border-border/30 backdrop-blur-sm hover:border-primary/30 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-background/50 ${color}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-mono">{c.name}</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">{c.type}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs font-mono border-green-500/30 text-green-400">
                          ACTIVE
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-xs text-muted-foreground">{c.description}</p>
                      {c.requiresKey && (
                        <div className="flex items-center gap-1 text-xs text-yellow-400">
                          <Shield className="w-3 h-3" /> API Key Required
                        </div>
                      )}
                      {c.params.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {c.params.map((p: string) => (
                            <Badge key={p} variant="secondary" className="text-xs font-mono">{p}</Badge>
                          ))}
                        </div>
                      )}
                      {result && (
                        <div className="p-2 rounded bg-background/50 text-xs font-mono">
                          <div className="flex items-center gap-2">
                            {result.status === "success" ? (
                              <CheckCircle className="w-3 h-3 text-green-400" />
                            ) : (
                              <AlertTriangle className="w-3 h-3 text-yellow-400" />
                            )}
                            <span>{result.itemsCollected} items</span>
                            <span className="text-muted-foreground">({result.durationMs}ms)</span>
                          </div>
                        </div>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full font-mono text-xs"
                        onClick={() => handleRunCollector(c.id)}
                        disabled={runningCollector === c.id}
                      >
                        {runningCollector === c.id ? (
                          <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> RUNNING...</>
                        ) : (
                          <><Play className="w-3 h-3 mr-1" /> RUN COLLECTOR</>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        {/* ─── Shodan / Infrastructure ─────────────────────────────────── */}
        <TabsContent value="shodan" className="space-y-4">
          <Card className="bg-card/40 border-border/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-sm font-mono flex items-center gap-2">
                <Server className="w-4 h-4 text-red-400" /> SHODAN / INTERNETDB SEARCH
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search query (e.g., port:443, apache, 192.168.1.1)"
                  value={shodanQuery}
                  onChange={(e) => setShodanQuery(e.target.value)}
                  className="font-mono text-sm bg-background/50"
                />
                <Button
                  variant="outline"
                  className="font-mono text-xs"
                  onClick={() => handleRunCollector("shodan")}
                  disabled={runningCollector === "shodan"}
                >
                  {runningCollector === "shodan" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>

              {shodanSearch.data && shodanSearch.data.length > 0 && (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {shodanSearch.data.map((r, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="p-3 rounded-lg bg-background/50 border border-border/20 hover:border-red-500/30 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-red-400 font-bold">{r.ip}</span>
                            <Badge variant="outline" className="text-xs font-mono">:{r.port}</Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            {r.vulns.length > 0 && (
                              <Badge variant="destructive" className="text-xs font-mono">
                                {r.vulns.length} CVE{r.vulns.length > 1 ? "s" : ""}
                              </Badge>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => copyToClipboard(JSON.stringify(r, null, 2))}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-xs font-mono text-muted-foreground">
                          <span>ORG: {r.org || "—"}</span>
                          <span>OS: {r.os || "—"}</span>
                          <span>PRODUCT: {r.product} {r.version}</span>
                          <span>LOC: {r.city}, {r.country}</span>
                        </div>
                        {r.vulns.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {r.vulns.map((v: string) => (
                              <Badge key={v} variant="destructive" className="text-xs font-mono">{v}</Badge>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── WHOIS / DNS / CT ────────────────────────────────────────── */}
        <TabsContent value="whois" className="space-y-4">
          <Card className="bg-card/40 border-border/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-sm font-mono flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-400" /> WHOIS / DNS / CERTIFICATE TRANSPARENCY
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter domain (e.g., example.com)"
                  value={whoisDomain}
                  onChange={(e) => setWhoisDomain(e.target.value)}
                  className="font-mono text-sm bg-background/50"
                />
                <Button variant="outline" className="font-mono text-xs" disabled={!whoisDomain.includes(".")}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>

              {whoisSearch.data && (
                <div className="space-y-4">
                  {/* WHOIS */}
                  <div className="p-4 rounded-lg bg-background/50 border border-border/20">
                    <h3 className="font-mono text-xs text-blue-400 mb-3 flex items-center gap-2">
                      <Globe className="w-3 h-3" /> WHOIS RECORD
                      <Button size="sm" variant="ghost" className="h-5 ml-auto" onClick={() => copyToClipboard(JSON.stringify(whoisSearch.data.whois, null, 2))}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div><span className="text-muted-foreground">REGISTRAR:</span> {whoisSearch.data.whois.registrar}</div>
                      <div><span className="text-muted-foreground">ORG:</span> {whoisSearch.data.whois.registrantOrg}</div>
                      <div><span className="text-muted-foreground">CREATED:</span> {whoisSearch.data.whois.createdDate || "—"}</div>
                      <div><span className="text-muted-foreground">EXPIRES:</span> {whoisSearch.data.whois.expiresDate || "—"}</div>
                      <div><span className="text-muted-foreground">DNSSEC:</span> {whoisSearch.data.whois.dnssec ? "YES" : "NO"}</div>
                      <div><span className="text-muted-foreground">NS:</span> {whoisSearch.data.whois.nameServers.join(", ") || "—"}</div>
                    </div>
                    {whoisSearch.data.whois.status.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {whoisSearch.data.whois.status.map((s: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs font-mono">{s}</Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* CT Certs */}
                  <div className="p-4 rounded-lg bg-background/50 border border-border/20">
                    <h3 className="font-mono text-xs text-green-400 mb-3 flex items-center gap-2">
                      <Shield className="w-3 h-3" /> CT LOG CERTIFICATES ({whoisSearch.data.ctCerts.length})
                    </h3>
                    <ScrollArea className="max-h-[300px]">
                      <div className="space-y-2">
                        {whoisSearch.data.ctCerts.slice(0, 20).map((cert: any, i: number) => (
                          <div key={i} className="p-2 rounded bg-background/30 text-xs font-mono">
                            <div className="flex items-center justify-between">
                              <span className="text-green-400">{cert.commonName}</span>
                              <span className="text-muted-foreground">{cert.notBefore?.split("T")[0]}</span>
                            </div>
                            <div className="text-muted-foreground mt-1">Issuer: {cert.issuer?.substring(0, 60)}</div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* DNS Records */}
                  <div className="p-4 rounded-lg bg-background/50 border border-border/20">
                    <h3 className="font-mono text-xs text-orange-400 mb-3 flex items-center gap-2">
                      <Database className="w-3 h-3" /> DNS RECORDS ({whoisSearch.data.dnsRecords.length})
                    </h3>
                    <div className="space-y-1">
                      {whoisSearch.data.dnsRecords.map((dns: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 text-xs font-mono p-1.5 rounded bg-background/30">
                          <Badge variant="outline" className="text-xs w-10 justify-center">{dns.type}</Badge>
                          <span className="text-muted-foreground">{dns.name}</span>
                          <ChevronRight className="w-3 h-3 text-muted-foreground" />
                          <span className="text-orange-400">{dns.value}</span>
                          <span className="text-muted-foreground ml-auto">TTL: {dns.ttl}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── RSS Feeds ───────────────────────────────────────────────── */}
        <TabsContent value="rss" className="space-y-4">
          <Card className="bg-card/40 border-border/30 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-mono flex items-center gap-2">
                <Rss className="w-4 h-4 text-orange-400" /> RSS/NEWS AGGREGATOR
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                className="font-mono text-xs"
                onClick={() => handleRunCollector("rss")}
                disabled={runningCollector === "rss"}
              >
                {runningCollector === "rss" ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                FETCH ALL
              </Button>
            </CardHeader>
            <CardContent>
              {collectorResults.rss?.items ? (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {collectorResults.rss.items.map((item: any, i: number) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="p-3 rounded-lg bg-background/50 border border-border/20 hover:border-orange-500/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium truncate">{item.title}</h4>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.content}</p>
                            <div className="flex items-center gap-2 mt-2">
                              {item.tags?.map((t: string, j: number) => (
                                <Badge key={j} variant="secondary" className="text-xs font-mono">{t}</Badge>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => copyToClipboard(JSON.stringify(item, null, 2))}>
                              <Copy className="w-3 h-3" />
                            </Button>
                            {item.sourceUrl && (
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => openLink(item.sourceUrl, item.title)}>
                                  <ExternalLink className="w-3 h-3" />
                                </Button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-12 text-muted-foreground font-mono text-sm">
                  <Rss className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  Click FETCH ALL to pull from 14 global news sources
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Live Streams ────────────────────────────────────────────── */}
        <TabsContent value="streams" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {streams.data?.map((s, i) => (
              <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="bg-card/40 border-border/30 backdrop-blur-sm hover:border-green-500/30 transition-colors">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Radio className="w-4 h-4 text-green-400" />
                        <span className="font-mono text-sm font-bold">{s.name}</span>
                      </div>
                      <Badge variant="outline" className={`text-xs font-mono ${s.status === "live" ? "border-green-500/30 text-green-400" : "border-yellow-500/30 text-yellow-400"}`}>
                        {s.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs font-mono text-muted-foreground">
                      <span>{s.city}, {s.country}</span>
                      <span>{s.protocol.toUpperCase()} {s.resolution || ""}</span>
                      <span>CAT: {s.category}</span>
                      <span>LAT: {s.latitude.toFixed(2)}, LON: {s.longitude.toFixed(2)}</span>
                    </div>
                    <Button size="sm" variant="outline" className="w-full font-mono text-xs" onClick={() => openLink(s.url, s.name)}>
                        <ExternalLink className="w-3 h-3 mr-1" /> OPEN STREAM
                      </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* ─── Datasets ────────────────────────────────────────────────── */}
        <TabsContent value="datasets" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {datasets.data?.map((d, i) => (
              <motion.div key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="bg-card/40 border-border/30 backdrop-blur-sm hover:border-purple-500/30 transition-colors">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-mono text-sm font-bold">{d.name}</h3>
                      <Badge variant="outline" className="text-xs font-mono">{d.format}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{d.description}</p>
                    <div className="grid grid-cols-2 gap-1 text-xs font-mono text-muted-foreground">
                      <span>SOURCE: {d.source}</span>
                      <span>REGION: {d.region}</span>
                      <span>CATEGORY: {d.category}</span>
                      <span>UPDATED: {d.lastUpdated}</span>
                      {d.recordCount && <span>RECORDS: {d.recordCount.toLocaleString()}</span>}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="w-full font-mono text-xs" onClick={() => openLink(d.url, d.name)}>
                        <ExternalLink className="w-3 h-3 mr-1" /> VIEW DATASET
                      </Button>
                      <Button size="sm" variant="ghost" className="font-mono text-xs" onClick={() => copyToClipboard(JSON.stringify(d, null, 2))}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
