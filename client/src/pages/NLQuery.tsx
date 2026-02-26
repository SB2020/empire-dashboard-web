/**
 * NATURAL LANGUAGE INTELLIGENCE QUERY
 * Ask questions in plain English and get structured intelligence answers.
 * "Show me all entities linked to domain X near location Y in the last 48h"
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Send, Loader2, Copy, ExternalLink, Sparkles,
  Globe, Shield, AlertTriangle, Clock, Search, Trash2,
  ChevronDown, Database, Zap, Target, Activity,
} from "lucide-react";
import { toast } from "sonner";
import { useAppLink } from "@/hooks/useAppLink";

// ─── Types ──────────────────────────────────────────────────────────────────
interface QueryResult {
  id: string;
  query: string;
  answer: string;
  sources: { type: string; title: string; url?: string; confidence: number }[];
  entities: string[];
  timestamp: number;
  processingTime: number;
}

// ─── Suggested Queries ──────────────────────────────────────────────────────
const SUGGESTED_QUERIES = [
  { icon: Globe, text: "What are the most critical events in the last 24 hours?", category: "overview" },
  { icon: Target, text: "Show me all high-severity records with geolocation data", category: "filter" },
  { icon: Shield, text: "Which entities appear most frequently across recent intelligence?", category: "entity" },
  { icon: AlertTriangle, text: "List all triage alerts that haven't been reviewed yet", category: "triage" },
  { icon: Activity, text: "What patterns emerge from the last week of OSINT data?", category: "analysis" },
  { icon: Database, text: "Summarize the current state of all active investigation cases", category: "cases" },
  { icon: Search, text: "Find all records mentioning infrastructure or CVE vulnerabilities", category: "search" },
  { icon: Zap, text: "What are the top threat indicators from recent collector runs?", category: "threat" },
];

export default function NLQuery() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<QueryResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const resultsEndRef = useRef<HTMLDivElement>(null);
  const { openLink } = useAppLink();

  // Fetch context data for the LLM
  const { data: recordsRaw } = trpc.records.list.useQuery({ limit: 50, offset: 0 });
  const { data: alertsData } = trpc.triage.alerts.useQuery({ limit: 30 });
  const { data: entitiesData } = trpc.entities.list.useQuery({ limit: 50 });
  const { data: casesData } = trpc.cases.list.useQuery(undefined);

  // NL Query mutation via the LLM
  const nlQueryMutation = trpc.osint.analyze.useMutation();

  const scrollToBottom = useCallback(() => {
    resultsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [results, scrollToBottom]);

  const executeQuery = useCallback(async (queryText: string) => {
    if (!queryText.trim() || isProcessing) return;

    setIsProcessing(true);
    setShowSuggestions(false);
    const startTime = Date.now();

    // Build context from available data
    const contextParts: string[] = [];

    if (recordsRaw?.records?.length) {
      contextParts.push(`OSINT RECORDS (${recordsRaw.total} total, showing ${recordsRaw.records.length}):\n${
        recordsRaw.records.slice(0, 20).map(r =>
          `- [${r.severity}] ${r.title || "Untitled"} (${r.recordType}) — ${r.content?.slice(0, 150) || "No content"}${r.latitude ? ` @ ${r.latitude},${r.longitude}` : ""}`
        ).join("\n")
      }`);
    }

    if (alertsData?.length) {
      contextParts.push(`TRIAGE ALERTS (${alertsData.length}):\n${
        alertsData.slice(0, 15).map(a =>
          `- Score ${a.score} [${a.status}]: ${a.explanation || "No explanation"}`
        ).join("\n")
      }`);
    }

    if (entitiesData?.length) {
      contextParts.push(`ENTITIES (${entitiesData.length}):\n${
        entitiesData.slice(0, 20).map(e =>
          `- ${e.name} (${e.entityType}) — confidence: ${e.confidence}%, sources: ${e.sourceCount}`
        ).join("\n")
      }`);
    }

    if (casesData?.length) {
      contextParts.push(`INVESTIGATION CASES (${casesData.length}):\n${
        casesData.slice(0, 10).map(c =>
          `- [${c.status}/${c.priority}] ${c.title}: ${c.description?.slice(0, 100) || "No description"}`
        ).join("\n")
      }`);
    }

    try {
      const response = await nlQueryMutation.mutateAsync({
        focus: `${queryText}\n\nADDITIONAL CONTEXT FROM LOCAL DATA:\n${contextParts.join("\n\n")}`,
      });

      const answer = (response as any)?.analysis || typeof response === "string" ? String(response) : JSON.stringify(response);

      // Extract mentioned entities from the answer
      const mentionedEntities: string[] = [];
      if (entitiesData) {
        for (const e of entitiesData) {
          if (answer.toLowerCase().includes(e.name.toLowerCase())) {
            mentionedEntities.push(e.name);
          }
        }
      }

      const result: QueryResult = {
        id: `q-${Date.now()}`,
        query: queryText,
        answer,
        sources: [
          ...(recordsRaw?.records?.slice(0, 3).map(r => ({
            type: "record", title: r.title || "OSINT Record", url: r.sourceUrl || undefined, confidence: r.confidence || 50,
          })) || []),
          ...(alertsData?.slice(0, 2).map(a => ({
            type: "alert", title: `Triage Alert (Score ${a.score})`, confidence: a.score,
          })) || []),
        ],
        entities: mentionedEntities,
        timestamp: Date.now(),
        processingTime: Date.now() - startTime,
      };

      setResults(prev => [...prev, result]);
    } catch (err) {
      const result: QueryResult = {
        id: `q-${Date.now()}`,
        query: queryText,
        answer: `Error processing query: ${err instanceof Error ? err.message : "Unknown error"}. The intelligence system may need more data ingested to answer this question.`,
        sources: [],
        entities: [],
        timestamp: Date.now(),
        processingTime: Date.now() - startTime,
      };
      setResults(prev => [...prev, result]);
    } finally {
      setIsProcessing(false);
      setQuery("");
    }
  }, [isProcessing, recordsRaw, alertsData, entitiesData, casesData, nlQueryMutation]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      executeQuery(query);
    }
  }, [query, executeQuery]);

  const copyResult = useCallback((result: QueryResult) => {
    navigator.clipboard.writeText(`Q: ${result.query}\n\nA: ${result.answer}`);
    toast.success("Copied to clipboard");
  }, []);

  const clearHistory = useCallback(() => {
    setResults([]);
    setShowSuggestions(true);
  }, []);

  return (
    <div className="h-full flex flex-col gap-3 p-1">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-neon-magenta/10 border border-neon-magenta/20 flex items-center justify-center">
            <Brain className="w-5 h-5 text-neon-magenta" />
          </div>
          <div>
            <h1 className="text-lg font-heading font-bold text-foreground tracking-wide">NL QUERY</h1>
            <p className="text-xs text-muted-foreground font-mono">NATURAL LANGUAGE INTELLIGENCE</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[9px] font-mono border-neon-magenta/20 text-neon-magenta">
            {results.length} queries
          </Badge>
          {results.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearHistory}>
              <Trash2 className="w-3 h-3 mr-1" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* ─── Results Area ────────────────────────────────────────────────── */}
      <ScrollArea className="flex-1 overflow-hidden">
        <div className="space-y-4 pb-4">
          {/* Suggestions */}
          {showSuggestions && results.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="text-center py-8">
                <Brain className="w-16 h-16 mx-auto mb-4 text-neon-magenta/30" />
                <h2 className="text-lg font-heading text-foreground mb-2">Ask Anything About Your Intelligence</h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Query your OSINT records, entities, triage alerts, and cases using natural language.
                  The AI will analyze available data and provide structured intelligence answers.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-3xl mx-auto">
                {SUGGESTED_QUERIES.map((sq, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => {
                      setQuery(sq.text);
                      executeQuery(sq.text);
                    }}
                    className="glass-panel rounded-lg p-3 text-left hover:bg-accent/5 transition-all group"
                  >
                    <div className="flex items-start gap-2">
                      <sq.icon className="w-4 h-4 text-neon-magenta/60 mt-0.5 shrink-0" />
                      <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                        {sq.text}
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Query Results */}
          <AnimatePresence mode="popLayout">
            {results.map((result, idx) => (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-2"
              >
                {/* User Query */}
                <div className="flex justify-end">
                  <div className="glass-panel rounded-lg rounded-br-sm p-3 max-w-[80%] bg-neon-magenta/5 border-neon-magenta/20">
                    <p className="text-sm text-foreground">{result.query}</p>
                    <p className="text-[9px] font-mono text-muted-foreground mt-1 text-right">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                {/* AI Response */}
                <div className="flex justify-start">
                  <div className="glass-panel rounded-lg rounded-bl-sm p-4 max-w-[90%]">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-neon-magenta" />
                      <span className="text-[10px] font-heading text-neon-magenta tracking-wider">INTELLIGENCE ANALYSIS</span>
                      <span className="text-[9px] font-mono text-muted-foreground ml-auto">
                        {result.processingTime}ms
                      </span>
                    </div>

                    <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {result.answer}
                    </div>

                    {/* Entities */}
                    {result.entities.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-border/10">
                        <p className="text-[9px] font-mono text-muted-foreground mb-1">REFERENCED ENTITIES</p>
                        <div className="flex flex-wrap gap-1">
                          {result.entities.map((ent, i) => (
                            <Badge key={i} variant="outline" className="text-[9px] font-mono border-neon-cyan/20 text-neon-cyan">
                              {ent}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sources */}
                    {result.sources.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/10">
                        <p className="text-[9px] font-mono text-muted-foreground mb-1">DATA SOURCES</p>
                        <div className="space-y-1">
                          {result.sources.map((src, i) => (
                            <div key={i} className="flex items-center gap-2 text-[10px]">
                              <span className="text-muted-foreground">[{src.type}]</span>
                              <span className="text-foreground truncate">{src.title}</span>
                              <span className="text-muted-foreground/60">{src.confidence}%</span>
                              {src.url && (
                                <button onClick={() => openLink(src.url!, src.title)} className="text-neon-cyan hover:underline">
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/10">
                      <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => copyResult(result)}>
                        <Copy className="w-3 h-3 mr-1" /> Copy
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Processing indicator */}
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="glass-panel rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-neon-magenta animate-spin" />
                  <span className="text-xs text-muted-foreground">Analyzing intelligence data...</span>
                </div>
                <div className="flex gap-1 mt-2">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-neon-magenta/40"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          <div ref={resultsEndRef} />
        </div>
      </ScrollArea>

      {/* ─── Input Bar ───────────────────────────────────────────────────── */}
      <div className="glass-panel rounded-lg p-2">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your intelligence data..."
              rows={1}
              className="w-full resize-none bg-background/50 border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-neon-magenta/30 min-h-[40px] max-h-[120px]"
              style={{ height: "40px" }}
              onInput={e => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "40px";
                target.style.height = Math.min(target.scrollHeight, 120) + "px";
              }}
            />
          </div>
          <Button
            onClick={() => executeQuery(query)}
            disabled={!query.trim() || isProcessing}
            className="h-10 px-4 bg-neon-magenta/20 hover:bg-neon-magenta/30 text-neon-magenta border border-neon-magenta/30"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-1.5 px-1">
          <span className="text-[9px] font-mono text-muted-foreground/50">
            Press Enter to send • Shift+Enter for new line
          </span>
          <span className="text-[9px] font-mono text-muted-foreground/50 ml-auto">
            {recordsRaw?.total || 0} records • {entitiesData?.length || 0} entities • {alertsData?.length || 0} alerts indexed
          </span>
        </div>
      </div>
    </div>
  );
}
