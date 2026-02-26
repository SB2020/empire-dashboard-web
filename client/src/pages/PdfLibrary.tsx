import { useState, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  FileText, Upload, Search, FolderPlus, BookOpen, Clock,
  MessageSquare, Trash2, Star, Eye, ChevronRight, Loader2,
  X, Send, Bot, User, Filter, Grid, List, Plus, Download,
  Sparkles, ArrowLeft, MoreHorizontal, Tag, Globe, Lock,
} from "lucide-react";
import { useAppLink } from "@/hooks/useAppLink";

type ViewMode = "library" | "reader";
type LayoutMode = "grid" | "list";

const CATEGORIES = [
  { value: "all", label: "All", color: "text-foreground" },
  { value: "intelligence", label: "Intelligence", color: "text-neon-red" },
  { value: "research", label: "Research", color: "text-neon-blue" },
  { value: "policy", label: "Policy", color: "text-neon-amber" },
  { value: "technical", label: "Technical", color: "text-neon-green" },
  { value: "legal", label: "Legal", color: "text-neon-magenta" },
  { value: "training", label: "Training", color: "text-neon-cyan" },
  { value: "reference", label: "Reference", color: "text-chrome" },
  { value: "report", label: "Report", color: "text-neon-amber" },
  { value: "manual", label: "Manual", color: "text-neon-green" },
  { value: "other", label: "Other", color: "text-muted-foreground" },
];

function formatFileSize(bytes: number): string {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

function timeAgo(date: string | Date): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export default function PdfLibrary() {
  const [view, setView] = useState<ViewMode>("library");
  const [layout, setLayout] = useState<LayoutMode>("grid");
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [category, setCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [showCollections, setShowCollections] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const queryInput = useMemo(() => ({
    category: category !== "all" ? category : undefined,
    search: searchQuery || undefined,
    limit: 50,
    offset: 0,
  }), [category, searchQuery]);

  const { data: library, isLoading, refetch } = trpc.pdfLibrary.list.useQuery(queryInput);
  const { data: recentlyRead } = trpc.pdfLibrary.recentlyRead.useQuery({ limit: 8 });
  const { data: collections, refetch: refetchCollections } = trpc.pdfLibrary.collections.useQuery();

  const uploadMutation = trpc.pdfLibrary.upload.useMutation({
    onSuccess: () => { toast.success("PDF uploaded successfully"); setShowUpload(false); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.pdfLibrary.delete.useMutation({
    onSuccess: () => { toast.success("Document deleted"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const createCollectionMutation = trpc.pdfLibrary.createCollection.useMutation({
    onSuccess: () => { toast.success("Collection created"); refetchCollections(); },
    onError: (err) => toast.error(err.message),
  });

  // Upload handler
  const [uploadForm, setUploadForm] = useState({
    title: "", author: "", description: "", category: "other" as const,
    tags: "", isPublic: false,
  });

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) { toast.error("File too large (max 16MB)"); return; }
    if (file.type !== "application/pdf") { toast.error("Only PDF files are supported"); return; }

    setUploadForm((f) => ({ ...f, title: f.title || file.name.replace(/\.pdf$/i, "") }));

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadMutation.mutate({
        title: uploadForm.title || file.name.replace(/\.pdf$/i, ""),
        author: uploadForm.author || undefined,
        description: uploadForm.description || undefined,
        category: uploadForm.category,
        tags: uploadForm.tags ? uploadForm.tags.split(",").map((t) => t.trim()) : undefined,
        isPublic: uploadForm.isPublic,
        fileBase64: base64,
        fileName: file.name,
        fileSize: file.size,
      });
    };
    reader.readAsDataURL(file);
  }, [uploadForm, uploadMutation]);

  const openReader = useCallback((docId: number) => {
    setSelectedDocId(docId);
    setView("reader");
  }, []);

  if (view === "reader" && selectedDocId) {
    return <PdfReader documentId={selectedDocId} onBack={() => { setView("library"); setSelectedDocId(null); }} />;
  }

  const allDocs = library?.documents ?? [];
  const publicDocs = library?.publicDocuments ?? [];

  return (
    <div className="h-full flex flex-col gap-4 p-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg glass-panel flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-neon-blue" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-wide">PDF LIBRARY</h1>
            <p className="text-xs text-muted-foreground font-mono">
              {library?.total || 0} DOCUMENTS | AGENT-READABLE | READER3-INSPIRED
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setLayout(layout === "grid" ? "list" : "grid")} className="text-xs gap-1">
            {layout === "grid" ? <List className="w-3 h-3" /> : <Grid className="w-3 h-3" />}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowCollections(!showCollections)} className="text-xs gap-1">
            <FolderPlus className="w-3 h-3" /> COLLECTIONS
          </Button>
          <Button size="sm" onClick={() => setShowUpload(!showUpload)} className="text-xs gap-1 bg-neon-blue/20 text-neon-blue hover:bg-neon-blue/30 border border-neon-blue/30">
            <Upload className="w-3 h-3" /> UPLOAD
          </Button>
        </div>
      </div>

      {/* Upload Panel */}
      <AnimatePresence>
        {showUpload && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="glass-panel rounded-lg p-4 space-y-3 border border-neon-blue/20">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">UPLOAD PDF</h3>
                <button onClick={() => setShowUpload(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Document title" value={uploadForm.title} onChange={(e) => setUploadForm((f) => ({ ...f, title: e.target.value }))} className="bg-background/50" />
                <Input placeholder="Author" value={uploadForm.author} onChange={(e) => setUploadForm((f) => ({ ...f, author: e.target.value }))} className="bg-background/50" />
              </div>
              <Input placeholder="Description" value={uploadForm.description} onChange={(e) => setUploadForm((f) => ({ ...f, description: e.target.value }))} className="bg-background/50" />
              <div className="flex items-center gap-3">
                <select
                  className="bg-background/50 border border-border rounded px-3 py-2 text-sm text-foreground flex-1"
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm((f) => ({ ...f, category: e.target.value as any }))}
                >
                  {CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <Input placeholder="Tags (comma-separated)" value={uploadForm.tags} onChange={(e) => setUploadForm((f) => ({ ...f, tags: e.target.value }))} className="bg-background/50 flex-1" />
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={uploadForm.isPublic} onChange={(e) => setUploadForm((f) => ({ ...f, isPublic: e.target.checked }))} />
                  <Globe className="w-3 h-3" /> Public
                </label>
              </div>
              <div
                className="border-2 border-dashed border-neon-blue/30 rounded-lg p-8 text-center cursor-pointer hover:border-neon-blue/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-8 h-8 text-neon-blue/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Click or drag PDF here (max 16MB)</p>
                <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />
              </div>
              {uploadMutation.isPending && (
                <div className="flex items-center gap-2 text-xs text-neon-blue">
                  <Loader2 className="w-3 h-3 animate-spin" /> Uploading to S3 and indexing...
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collections Panel */}
      <AnimatePresence>
        {showCollections && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="glass-panel rounded-lg p-4 space-y-3 border border-border/30">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">COLLECTIONS</h3>
                <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => {
                  const name = prompt("Collection name:");
                  if (name) createCollectionMutation.mutate({ name });
                }}>
                  <Plus className="w-3 h-3" /> NEW
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(collections ?? []).map((col) => (
                  <div key={col.id} className="glass-panel rounded-lg p-3 border border-border/30 hover:border-primary/30 cursor-pointer transition-colors">
                    <div className="text-sm font-semibold text-foreground">{col.name}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">{col.documentCount} docs</div>
                  </div>
                ))}
                {(collections ?? []).length === 0 && (
                  <div className="col-span-3 text-center py-4 text-xs text-muted-foreground">No collections yet. Create one to organize your documents.</div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            className="w-full bg-background/50 border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {CATEGORIES.map((c) => (
            <Button
              key={c.value}
              variant={category === c.value ? "default" : "outline"}
              size="sm"
              onClick={() => setCategory(c.value)}
              className="text-xs px-2 py-1 h-7"
            >
              {c.label.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-6 pr-2">
          {/* Recently Read Section */}
          {category === "all" && !searchQuery && (recentlyRead ?? []).length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-muted-foreground mb-3 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> RECENTLY READ
              </h2>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {(recentlyRead ?? []).map((item: any) => (
                  <div
                    key={item.id}
                    className="glass-panel rounded-lg p-3 border border-border/30 hover:border-neon-blue/30 cursor-pointer transition-colors min-w-[180px] max-w-[200px] shrink-0"
                    onClick={() => item.document && openReader(item.document.id)}
                  >
                    <div className="w-full h-24 rounded bg-gradient-to-br from-neon-blue/10 to-neon-cyan/5 flex items-center justify-center mb-2">
                      <FileText className="w-8 h-8 text-neon-blue/40" />
                    </div>
                    <div className="text-xs font-semibold text-foreground truncate">{item.document?.title || "Unknown"}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1 rounded-full bg-background/50">
                        <div className="h-full rounded-full bg-neon-blue/60" style={{ width: `${item.progressPercent}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{item.progressPercent}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* My Documents */}
          <div>
            <h2 className="text-xs font-bold text-muted-foreground mb-3 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" /> MY DOCUMENTS ({allDocs.length})
            </h2>
            {isLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-8 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading library...
              </div>
            ) : allDocs.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No documents yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Upload a PDF to get started</p>
              </div>
            ) : layout === "grid" ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {allDocs.map((doc: any) => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-panel rounded-lg border border-border/30 hover:border-neon-blue/30 cursor-pointer transition-all group overflow-hidden"
                    onClick={() => openReader(doc.id)}
                  >
                    <div className="w-full h-32 bg-gradient-to-br from-neon-blue/10 to-neon-cyan/5 flex items-center justify-center relative">
                      <FileText className="w-10 h-10 text-neon-blue/30" />
                      <div className="absolute top-2 right-2 flex gap-1">
                        {doc.isPublic && <Globe className="w-3 h-3 text-neon-green" />}
                        {doc.summary && <Sparkles className="w-3 h-3 text-neon-amber" />}
                      </div>
                      <Badge variant="outline" className="absolute bottom-2 left-2 text-[9px]">{doc.category?.toUpperCase()}</Badge>
                    </div>
                    <div className="p-3">
                      <div className="text-xs font-semibold text-foreground truncate">{doc.title}</div>
                      {doc.author && <div className="text-[10px] text-muted-foreground truncate mt-0.5">{doc.author}</div>}
                      <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
                        <span>{formatFileSize(doc.fileSize)}</span>
                        <span>{doc.pageCount ? `${doc.pageCount} pg` : ""}</span>
                      </div>
                    </div>
                    <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteMutation.mutate({ id: doc.id }); }}
                        className="p-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {allDocs.map((doc: any) => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass-panel rounded-lg p-3 border border-border/30 hover:border-neon-blue/30 cursor-pointer transition-colors flex items-center gap-3"
                    onClick={() => openReader(doc.id)}
                  >
                    <div className="w-10 h-10 rounded bg-neon-blue/10 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-neon-blue/50" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">{doc.title}</div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-3">
                        {doc.author && <span>{doc.author}</span>}
                        <span>{formatFileSize(doc.fileSize)}</span>
                        <Badge variant="outline" className="text-[9px]">{doc.category?.toUpperCase()}</Badge>
                        {doc.isPublic && <Globe className="w-3 h-3 text-neon-green" />}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-muted-foreground">{timeAgo(doc.createdAt)}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Public Documents */}
          {publicDocs.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-muted-foreground mb-3 flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" /> PUBLIC LIBRARY ({publicDocs.length})
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {publicDocs.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="glass-panel rounded-lg p-3 border border-border/30 hover:border-neon-green/30 cursor-pointer transition-colors"
                    onClick={() => openReader(doc.id)}
                  >
                    <div className="w-full h-20 rounded bg-gradient-to-br from-neon-green/10 to-neon-cyan/5 flex items-center justify-center mb-2">
                      <Globe className="w-6 h-6 text-neon-green/30" />
                    </div>
                    <div className="text-xs font-semibold text-foreground truncate">{doc.title}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">{formatFileSize(doc.fileSize)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── PDF Reader with LLM Companion (reader3-inspired) ────────────────
function PdfReader({ documentId, onBack }: { documentId: number; onBack: () => void }) {
  const { openLink } = useAppLink();
  const { data: doc, isLoading } = trpc.pdfLibrary.get.useQuery({ id: documentId });
  const { data: chatHistory, refetch: refetchChat } = trpc.pdfLibrary.chatHistory.useQuery({ documentId });
  const { data: progress } = trpc.pdfLibrary.getProgress.useQuery({ documentId });

  const [chatOpen, setChatOpen] = useState(true);
  const [question, setQuestion] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const askMutation = trpc.pdfLibrary.askAgent.useMutation({
    onSuccess: () => { refetchChat(); setQuestion(""); },
    onError: (err) => toast.error(err.message),
  });

  const summarizeMutation = trpc.pdfLibrary.summarize.useMutation({
    onSuccess: (data) => { toast.success("Summary generated"); },
    onError: (err) => toast.error(err.message),
  });

  const handleAsk = useCallback(() => {
    if (!question.trim()) return;
    askMutation.mutate({ documentId, question: question.trim() });
  }, [question, documentId, askMutation]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-neon-blue" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <FileText className="w-12 h-12 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Document not found</p>
        <Button variant="outline" size="sm" onClick={onBack}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Reader Header */}
      <div className="flex items-center gap-3 p-3 border-b border-border/30">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 text-xs">
          <ArrowLeft className="w-3.5 h-3.5" /> BACK
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-foreground truncate">{doc.title}</h2>
          <div className="text-[10px] text-muted-foreground flex items-center gap-3">
            {doc.author && <span>{doc.author}</span>}
            <Badge variant="outline" className="text-[9px]">{doc.category?.toUpperCase()}</Badge>
            <span>{formatFileSize(doc.fileSize)}</span>
            {doc.pageCount ? <span>{doc.pageCount} pages</span> : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => setChatOpen(!chatOpen)}>
            <MessageSquare className="w-3 h-3" /> {chatOpen ? "HIDE" : "SHOW"} AGENT
          </Button>
          <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => openLink(doc.fileUrl, doc.title)}>
              <Download className="w-3 h-3" /> DOWNLOAD
            </Button>
        </div>
      </div>

      {/* Reader Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* PDF Embed */}
        <div className="flex-1 bg-background/30">
          <iframe
            src={doc.fileUrl}
            className="w-full h-full border-0"
            title={doc.title}
          />
        </div>

        {/* Agent Chat Panel (reader3-inspired) */}
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 380, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-border/30 flex flex-col overflow-hidden"
            >
              <div className="p-3 border-b border-border/30 flex items-center gap-2">
                <Bot className="w-4 h-4 text-neon-cyan" />
                <span className="text-xs font-bold text-foreground">OPPENHEIMER — DOCUMENT COMPANION</span>
              </div>

              {/* Summary Section */}
              {doc.summary ? (
                <div className="p-3 border-b border-border/30 max-h-40 overflow-y-auto">
                  <h4 className="text-[10px] font-bold text-neon-amber mb-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> AI SUMMARY
                  </h4>
                  <p className="text-xs text-foreground/80 whitespace-pre-wrap">{doc.summary}</p>
                </div>
              ) : (
                <div className="p-3 border-b border-border/30">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs gap-1 w-full"
                    onClick={() => summarizeMutation.mutate({ documentId, text: doc.extractedText || "Please extract and summarize this document." })}
                    disabled={summarizeMutation.isPending}
                  >
                    {summarizeMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    GENERATE AI SUMMARY
                  </Button>
                </div>
              )}

              {/* Chat Messages */}
              <ScrollArea className="flex-1 p-3">
                <div className="space-y-3">
                  {(chatHistory ?? []).length === 0 && (
                    <div className="text-center py-8">
                      <MessageSquare className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">Ask Oppenheimer about this document</p>
                      <div className="mt-3 space-y-1">
                        {["What are the key findings?", "Summarize the methodology", "What are the implications?"].map((q) => (
                          <button
                            key={q}
                            className="block w-full text-left text-[10px] text-neon-cyan/70 hover:text-neon-cyan px-2 py-1 rounded hover:bg-neon-cyan/5 transition-colors"
                            onClick={() => { setQuestion(q); }}
                          >
                            → {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {(chatHistory ?? []).map((msg: any) => (
                    <div key={msg.id} className={`flex gap-2 ${msg.role === "agent" ? "" : "flex-row-reverse"}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${msg.role === "agent" ? "bg-neon-cyan/20" : "bg-neon-blue/20"}`}>
                        {msg.role === "agent" ? <Bot className="w-3 h-3 text-neon-cyan" /> : <User className="w-3 h-3 text-neon-blue" />}
                      </div>
                      <div className={`max-w-[85%] rounded-lg p-2.5 text-xs ${msg.role === "agent" ? "bg-background/50 text-foreground/90" : "bg-neon-blue/10 text-foreground"}`}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <span className="text-[9px] text-muted-foreground/50 mt-1 block">{timeAgo(msg.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                  {askMutation.isPending && (
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-neon-cyan/20 flex items-center justify-center shrink-0">
                        <Bot className="w-3 h-3 text-neon-cyan animate-pulse" />
                      </div>
                      <div className="bg-background/50 rounded-lg p-2.5 text-xs text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> Analyzing document...
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>

              {/* Chat Input */}
              <div className="p-3 border-t border-border/30">
                <div className="flex gap-2">
                  <Input
                    placeholder="Ask about this document..."
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAsk()}
                    className="bg-background/50 text-xs"
                    disabled={askMutation.isPending}
                  />
                  <Button size="sm" onClick={handleAsk} disabled={askMutation.isPending || !question.trim()} className="shrink-0">
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
