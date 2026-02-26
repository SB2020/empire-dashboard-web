import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useAppLink } from "@/hooks/useAppLink";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search, BookOpen, FileText, ChevronRight, ChevronLeft,
  Library, Archive, Folder, X, AlertTriangle, Hash, Loader2, Download, ExternalLink,
  Clock, CheckSquare, Square, Info, HardDrive, Trash2,
} from "lucide-react";

// ── Download History (localStorage) ─────────────────────────────────
interface DownloadRecord {
  category: string;
  fileCount: number;
  timestamp: number;
  type: "full" | "selective";
}

function getDownloadHistory(): DownloadRecord[] {
  try {
    return JSON.parse(localStorage.getItem("survivor_download_history") || "[]");
  } catch { return []; }
}

function addDownloadRecord(record: DownloadRecord) {
  const history = getDownloadHistory();
  history.unshift(record);
  // Keep last 50 records
  localStorage.setItem("survivor_download_history", JSON.stringify(history.slice(0, 50)));
}

function clearDownloadHistory() {
  localStorage.removeItem("survivor_download_history");
}

// ── Size estimation helper ──────────────────────────────────────────
function parseSizeToMB(sizeStr?: string): number {
  if (!sizeStr) return 5; // default estimate ~5MB per unknown doc
  const lower = sizeStr.toLowerCase().trim();
  const num = parseFloat(lower);
  if (isNaN(num)) return 5;
  if (lower.includes("gb")) return num * 1024;
  if (lower.includes("mb")) return num;
  if (lower.includes("kb")) return num / 1024;
  return num; // assume MB
}

function formatSize(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${(mb * 1024).toFixed(0)} KB`;
}

export default function SurvivorLibrary() {
  const { openLink } = useAppLink();
  const [tab, setTab] = useState("browse");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [catSearch, setCatSearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");
  const [globalQuery, setGlobalQuery] = useState("");
  const [breachSearch, setBreachSearch] = useState("");
  const [page, setPage] = useState(1);

  // Selective download state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  // Download history state
  const [downloadHistory, setDownloadHistory] = useState<DownloadRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    setDownloadHistory(getDownloadHistory());
  }, []);

  // Categories list
  const { data: catData, isLoading: catsLoading } = trpc.survivorLibrary.getCategories.useQuery();
  const categories = catData?.categories || [];
  const totalItems = catData?.totalItems || 0;

  // Filtered categories
  const filteredCats = useMemo(() => {
    if (!catSearch) return categories;
    const q = catSearch.toLowerCase();
    return categories.filter(c => c.name.toLowerCase().includes(q));
  }, [categories, catSearch]);

  // Category items
  const { data: itemData, isLoading: itemsLoading } = trpc.survivorLibrary.getCategoryItems.useQuery(
    { category: selectedCategory!, search: itemSearch || undefined, page, pageSize: 50 },
    { enabled: !!selectedCategory, placeholderData: (prev: any) => prev }
  );

  // Global search
  const { data: searchData, isLoading: searchLoading } = trpc.survivorLibrary.searchAll.useQuery(
    { query: globalQuery },
    { enabled: globalQuery.length > 1 }
  );

  // Individual breaches
  const { data: breachData } = trpc.survivorLibrary.getIndividualBreaches.useQuery(
    { search: breachSearch || undefined }
  );

  // ── Size estimation for current category ──────────────────────────
  const estimatedSize = useMemo(() => {
    if (!itemData?.items) return 0;
    // Use the total count from backend, not just current page
    const totalCount = itemData.total || 0;
    // Estimate from visible items' sizes, extrapolate to total
    const visibleItems = itemData.items;
    if (visibleItems.length === 0) return 0;
    const avgSize = visibleItems.reduce((sum, item) => sum + parseSizeToMB(item.size), 0) / visibleItems.length;
    return avgSize * totalCount;
  }, [itemData]);

  const sizeWarningLevel = useMemo(() => {
    if (estimatedSize > 5000) return "critical"; // > 5GB
    if (estimatedSize > 1000) return "high";     // > 1GB
    if (estimatedSize > 200) return "medium";    // > 200MB
    return "low";
  }, [estimatedSize]);

  // ── Download All state ────────────────────────────────────────────
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0, failed: 0 });
  const [showSizeConfirm, setShowSizeConfirm] = useState(false);

  const executeDownload = useCallback(async (category: string, fileIndices?: number[]) => {
    if (downloadingAll) return;
    setDownloadingAll(true);
    setDownloadProgress({ current: 0, total: 0, failed: 0 });
    setShowSizeConfirm(false);

    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      const res = await fetch(`/api/trpc/survivorLibrary.getCategoryDownloadUrls?input=${encodeURIComponent(JSON.stringify({ category }))}`);
      const json = await res.json();
      let files = json.result?.data?.files || [];

      // If selective mode, filter to only selected indices
      if (fileIndices && fileIndices.length > 0) {
        // Map page-local indices to the full file list
        // Since we paginate, we need to account for the offset
        const offset = ((itemData?.page || 1) - 1) * (itemData?.pageSize || 50);
        files = fileIndices.map(i => files[offset + i]).filter(Boolean);
      }

      if (files.length === 0) {
        setDownloadingAll(false);
        return;
      }

      setDownloadProgress({ current: 0, total: files.length, failed: 0 });

      const BATCH_SIZE = 5;
      let completed = 0;
      let failed = 0;

      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map(async (file: { title: string; url: string; filename: string }) => {
            try {
              const response = await fetch(file.url);
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              const blob = await response.blob();
              zip.file(file.filename, blob);
            } catch {
              zip.file(file.filename + '.url.txt', `Download manually: ${file.url}`);
              throw new Error('fetch failed');
            }
          })
        );

        for (const r of results) {
          completed++;
          if (r.status === 'rejected') failed++;
        }
        setDownloadProgress({ current: completed, total: files.length, failed });
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      const suffix = fileIndices ? '_selected' : '';
      a.download = `${category.replace(/ /g, '_')}${suffix}_library.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Record in download history
      const record: DownloadRecord = {
        category,
        fileCount: files.length,
        timestamp: Date.now(),
        type: fileIndices ? "selective" : "full",
      };
      addDownloadRecord(record);
      setDownloadHistory(getDownloadHistory());
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloadingAll(false);
      setDownloadProgress({ current: 0, total: 0, failed: 0 });
    }
  }, [downloadingAll, itemData]);

  const handleDownloadAll = useCallback((category: string) => {
    if (sizeWarningLevel === "critical" || sizeWarningLevel === "high") {
      setShowSizeConfirm(true);
    } else {
      executeDownload(category);
    }
  }, [sizeWarningLevel, executeDownload]);

  const handleDownloadSelected = useCallback(() => {
    if (!selectedCategory || selectedItems.size === 0) return;
    executeDownload(selectedCategory, Array.from(selectedItems));
  }, [selectedCategory, selectedItems, executeDownload]);

  const toggleItem = useCallback((idx: number) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const toggleAllOnPage = useCallback(() => {
    const items = itemData?.items || [];
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map((_, i) => i)));
    }
  }, [itemData, selectedItems]);

  const handleGlobalSearch = () => {
    if (globalSearch.trim()) setGlobalQuery(globalSearch.trim());
  };

  // Reset selection when changing category or page
  useEffect(() => {
    setSelectedItems(new Set());
    setSelectionMode(false);
    setShowSizeConfirm(false);
  }, [selectedCategory, page]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold tracking-wider chrome-text flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-neon-green" />
            SURVIVOR LIBRARY
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono tracking-wide">
            Knowledge Archive // {totalItems.toLocaleString()} Documents // {categories.length} Categories
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className={`glass-panel border-white/10 font-mono text-xs ${showHistory ? 'border-neon-cyan/40 text-neon-cyan' : 'text-muted-foreground'}`}
          >
            <Clock className="w-3.5 h-3.5 mr-1.5" />
            History ({downloadHistory.length})
          </Button>
          <Badge variant="outline" className="glass-panel border-neon-green/30 text-neon-green px-3 py-1.5 font-mono">
            {totalItems.toLocaleString()} DOCS
          </Badge>
        </div>
      </div>

      {/* Download History Panel */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="glass-panel border-neon-cyan/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-heading tracking-wider text-neon-cyan flex items-center gap-2">
                    <Clock className="w-4 h-4" /> RECENTLY DOWNLOADED
                  </h3>
                  {downloadHistory.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { clearDownloadHistory(); setDownloadHistory([]); }}
                      className="text-xs text-muted-foreground hover:text-neon-red"
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Clear
                    </Button>
                  )}
                </div>
                {downloadHistory.length === 0 ? (
                  <p className="text-xs text-muted-foreground font-mono text-center py-4">No download history yet</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {downloadHistory.map((record, idx) => (
                      <div
                        key={`${record.timestamp}-${idx}`}
                        className="flex items-center justify-between p-2 rounded-md bg-white/[0.02] hover:bg-white/[0.05] transition-colors cursor-pointer"
                        onClick={() => {
                          setTab("browse");
                          setSelectedCategory(record.category);
                          setPage(1);
                          setShowHistory(false);
                        }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Archive className="w-3.5 h-3.5 text-neon-cyan/60 shrink-0" />
                          <span className="text-sm truncate">{record.category}</span>
                          <Badge variant="outline" className="text-[9px] px-1 py-0 border-white/10 font-mono shrink-0">
                            {record.type === "selective" ? `${record.fileCount} selected` : `${record.fileCount} files`}
                          </Badge>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground shrink-0 ml-2">
                          {new Date(record.timestamp).toLocaleDateString()} {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="glass-panel border border-white/10 bg-transparent">
          <TabsTrigger value="browse" className="data-[state=active]:bg-neon-green/15 data-[state=active]:text-neon-green font-mono text-xs">
            <Library className="w-3.5 h-3.5 mr-1.5" /> Browse
          </TabsTrigger>
          <TabsTrigger value="search" className="data-[state=active]:bg-neon-cyan/15 data-[state=active]:text-neon-cyan font-mono text-xs">
            <Search className="w-3.5 h-3.5 mr-1.5" /> Search All
          </TabsTrigger>
          <TabsTrigger value="breaches" className="data-[state=active]:bg-neon-red/15 data-[state=active]:text-neon-red font-mono text-xs">
            <AlertTriangle className="w-3.5 h-3.5 mr-1.5" /> Individual ({breachData?.total || 112})
          </TabsTrigger>
        </TabsList>

        {/* Browse Tab */}
        <TabsContent value="browse" className="mt-4 space-y-4">
          {!selectedCategory ? (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Filter categories..."
                  value={catSearch}
                  onChange={(e) => setCatSearch(e.target.value)}
                  className="pl-10 glass-panel border-white/10 font-mono text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                <AnimatePresence>
                  {(catsLoading ? Array.from({ length: 20 }).map((_, i) => ({ name: "", count: 0, _skel: i })) : filteredCats).map((cat: any, idx) => (
                    cat._skel !== undefined ? (
                      <Card key={cat._skel} className="glass-panel border-white/5 animate-pulse h-20" />
                    ) : (
                      <motion.div
                        key={cat.name}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: idx * 0.01 }}
                      >
                        <Card
                          className="glass-panel border-white/5 hover:border-neon-green/30 transition-all cursor-pointer group"
                          onClick={() => { setSelectedCategory(cat.name); setPage(1); setItemSearch(""); }}
                        >
                          <CardContent className="p-3 flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <Folder className="w-4 h-4 text-neon-green shrink-0" />
                              <span className="text-sm font-medium truncate group-hover:text-neon-green transition-colors">
                                {cat.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-white/5 border-white/10 font-mono">
                                {cat.count}
                              </Badge>
                              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-neon-green transition-colors" />
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  ))}
                </AnimatePresence>
              </div>
              {filteredCats.length === 0 && !catsLoading && (
                <div className="text-center py-12">
                  <Folder className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground font-mono text-sm">No categories match "{catSearch}"</p>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Category detail view */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedCategory(null)}
                    className="glass-panel border-white/10 text-muted-foreground"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <div>
                    <h2 className="font-heading text-lg tracking-wider text-neon-green">{selectedCategory}</h2>
                    <p className="text-xs text-muted-foreground font-mono">{itemData?.total || 0} documents</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Selection mode toggle */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setSelectionMode(!selectionMode); setSelectedItems(new Set()); }}
                    className={`glass-panel font-mono text-xs transition-all ${selectionMode ? 'border-neon-cyan/40 text-neon-cyan' : 'border-white/10 text-muted-foreground'}`}
                  >
                    <CheckSquare className="w-3.5 h-3.5 mr-1.5" />
                    {selectionMode ? 'Cancel Select' : 'Select'}
                  </Button>

                  {/* Download selected */}
                  {selectionMode && selectedItems.size > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={downloadingAll}
                      onClick={handleDownloadSelected}
                      className="glass-panel border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/15 transition-all font-mono text-xs"
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      Download {selectedItems.size} as ZIP
                    </Button>
                  )}

                  {/* Download All */}
                  {!selectionMode && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={downloadingAll}
                      onClick={() => selectedCategory && handleDownloadAll(selectedCategory)}
                      className="glass-panel border-neon-green/30 text-neon-green hover:bg-neon-green/15 transition-all font-mono text-xs"
                    >
                      {downloadingAll ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          {downloadProgress.total > 0
                            ? `${downloadProgress.current}/${downloadProgress.total}${downloadProgress.failed > 0 ? ` (${downloadProgress.failed} failed)` : ''}`
                            : 'Preparing...'}
                        </>
                      ) : (
                        <>
                          <Archive className="w-3.5 h-3.5 mr-1.5" />
                          Download All as ZIP
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {/* Size Warning / Confirmation Dialog */}
              <AnimatePresence>
                {showSizeConfirm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <Card className={`border ${sizeWarningLevel === 'critical' ? 'border-neon-red/40 bg-neon-red/5' : 'border-neon-amber/40 bg-neon-amber/5'}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${sizeWarningLevel === 'critical' ? 'text-neon-red' : 'text-neon-amber'}`} />
                          <div className="flex-1">
                            <h4 className={`text-sm font-heading tracking-wider ${sizeWarningLevel === 'critical' ? 'text-neon-red' : 'text-neon-amber'}`}>
                              LARGE DOWNLOAD WARNING
                            </h4>
                            <p className="text-xs text-muted-foreground font-mono mt-1">
                              This category contains <strong className="text-foreground">{itemData?.total || 0} files</strong> with
                              an estimated total size of <strong className={sizeWarningLevel === 'critical' ? 'text-neon-red' : 'text-neon-amber'}>{formatSize(estimatedSize)}</strong>.
                              {sizeWarningLevel === 'critical' && ' This is an extremely large download that may take a very long time and consume significant bandwidth.'}
                              {sizeWarningLevel === 'high' && ' This is a large download that may take several minutes.'}
                            </p>
                            <p className="text-[10px] text-muted-foreground/70 font-mono mt-1">
                              Tip: Use the "Select" button to pick specific files instead of downloading the entire category.
                            </p>
                            <div className="flex items-center gap-2 mt-3">
                              <Button
                                size="sm"
                                onClick={() => selectedCategory && executeDownload(selectedCategory)}
                                className={`font-mono text-xs ${sizeWarningLevel === 'critical' ? 'bg-neon-red/20 text-neon-red border border-neon-red/30 hover:bg-neon-red/30' : 'bg-neon-amber/20 text-neon-amber border border-neon-amber/30 hover:bg-neon-amber/30'}`}
                              >
                                <Download className="w-3 h-3 mr-1" /> Download Anyway ({formatSize(estimatedSize)})
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowSizeConfirm(false)}
                                className="glass-panel border-white/10 text-muted-foreground font-mono text-xs"
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => { setShowSizeConfirm(false); setSelectionMode(true); }}
                                className="glass-panel border-neon-cyan/30 text-neon-cyan font-mono text-xs"
                              >
                                <CheckSquare className="w-3 h-3 mr-1" /> Select Files Instead
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Estimated size info bar (always visible, non-blocking) */}
              {!showSizeConfirm && !downloadingAll && (
                <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                  <HardDrive className="w-3 h-3" />
                  <span>
                    Est. category size: <span className={
                      sizeWarningLevel === 'critical' ? 'text-neon-red' :
                      sizeWarningLevel === 'high' ? 'text-neon-amber' :
                      sizeWarningLevel === 'medium' ? 'text-neon-cyan' :
                      'text-neon-green'
                    }>{formatSize(estimatedSize)}</span>
                    {' '}({itemData?.total || 0} files)
                  </span>
                  {sizeWarningLevel !== 'low' && (
                    <Badge variant="outline" className={`text-[9px] px-1 py-0 ${
                      sizeWarningLevel === 'critical' ? 'border-neon-red/30 text-neon-red' :
                      sizeWarningLevel === 'high' ? 'border-neon-amber/30 text-neon-amber' :
                      'border-neon-cyan/30 text-neon-cyan'
                    }`}>
                      {sizeWarningLevel === 'critical' ? 'VERY LARGE' : sizeWarningLevel === 'high' ? 'LARGE' : 'MODERATE'}
                    </Badge>
                  )}
                </div>
              )}

              {/* Download progress bar */}
              {downloadingAll && downloadProgress.total > 0 && (
                <div className="glass-panel border border-neon-green/20 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-neon-green">
                      Downloading {downloadProgress.current} of {downloadProgress.total} files...
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {Math.round((downloadProgress.current / downloadProgress.total) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-neon-green/60 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(downloadProgress.current / downloadProgress.total) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  {downloadProgress.failed > 0 && (
                    <p className="text-[10px] font-mono text-neon-amber mt-1.5">
                      {downloadProgress.failed} files could not be fetched directly — URL reference files included instead
                    </p>
                  )}
                </div>
              )}

              {/* Search + Select All controls */}
              <div className="flex items-center gap-2">
                {selectionMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleAllOnPage}
                    className="glass-panel border-white/10 text-muted-foreground font-mono text-xs shrink-0"
                  >
                    {selectedItems.size === (itemData?.items || []).length ? (
                      <><X className="w-3 h-3 mr-1" /> Deselect All</>
                    ) : (
                      <><CheckSquare className="w-3 h-3 mr-1" /> Select All</>
                    )}
                  </Button>
                )}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={`Search within ${selectedCategory}...`}
                    value={itemSearch}
                    onChange={(e) => { setItemSearch(e.target.value); setPage(1); }}
                    className="pl-10 glass-panel border-white/10 font-mono text-sm"
                  />
                </div>
              </div>

              {itemsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Card key={i} className="glass-panel border-white/5 animate-pulse h-12" />
                  ))}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {(itemData?.items || []).map((item, idx) => (
                    <motion.div
                      key={`${item.title}-${idx}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.015 }}
                    >
                      <Card
                        className={`glass-panel border-white/5 hover:border-neon-green/20 transition-all group/item ${selectionMode && selectedItems.has(idx) ? 'border-neon-cyan/40 bg-neon-cyan/5' : ''}`}
                        onClick={selectionMode ? () => toggleItem(idx) : undefined}
                        style={selectionMode ? { cursor: 'pointer' } : undefined}
                      >
                        <CardContent className="p-3 flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            {selectionMode && (
                              <Checkbox
                                checked={selectedItems.has(idx)}
                                onCheckedChange={() => toggleItem(idx)}
                                className="border-white/20 data-[state=checked]:bg-neon-cyan data-[state=checked]:border-neon-cyan"
                              />
                            )}
                            <FileText className="w-4 h-4 text-neon-green/60 shrink-0" />
                            <span className="text-sm truncate">{item.title}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            {item.size && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-white/5 border-white/10 font-mono">
                                {item.size}
                              </Badge>
                            )}
                            {(item as any).downloadUrl && !selectionMode && (
                              <button
                                onClick={(e) => { e.stopPropagation(); openLink((item as any).downloadUrl, "Download PDF"); }}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono bg-neon-green/10 text-neon-green border border-neon-green/20 hover:bg-neon-green/25 transition-all opacity-60 group-hover/item:opacity-100"
                              >
                                <Download className="w-3 h-3" /> PDF
                              </button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                  {(itemData?.items || []).length === 0 && (
                    <div className="text-center py-12">
                      <FileText className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground font-mono text-sm">No documents found</p>
                    </div>
                  )}
                </div>
              )}

              {/* Pagination */}
              {(itemData?.totalPages || 0) > 1 && (
                <div className="flex items-center justify-center gap-3 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                    className="glass-panel border-white/10"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-mono text-muted-foreground">
                    Page {page} of {itemData?.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= (itemData?.totalPages || 1)}
                    onClick={() => setPage(p => p + 1)}
                    className="glass-panel border-white/10"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Search All Tab */}
        <TabsContent value="search" className="mt-4 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search across all 15,000+ documents..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGlobalSearch()}
                className="pl-10 glass-panel border-white/10 font-mono text-sm"
              />
            </div>
            <Button onClick={handleGlobalSearch} className="bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30 hover:bg-neon-cyan/30">
              <Search className="w-4 h-4 mr-1.5" /> Search
            </Button>
          </div>

          {searchLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-neon-cyan" />
              <span className="ml-2 text-muted-foreground font-mono text-sm">Searching...</span>
            </div>
          )}

          {searchData && !searchLoading && (
            <>
              <p className="text-sm text-muted-foreground font-mono">
                {searchData.total} results for "{globalQuery}"
                {searchData.total > 100 && " (showing first 100)"}
              </p>
              <div className="space-y-1.5">
                {searchData.results.map((r, idx) => (
                  <motion.div
                    key={`${r.category}-${r.title}-${idx}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.01 }}
                  >
                    <Card className="glass-panel border-white/5 hover:border-neon-cyan/20 transition-all group/item">
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-neon-cyan/60 shrink-0" />
                          <span className="text-sm truncate">{r.title}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {r.size && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-white/5 border-white/10 font-mono">
                              {r.size}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-neon-green/10 text-neon-green border-neon-green/20 font-mono">
                            {r.category}
                          </Badge>
                          {(r as any).downloadUrl && (
                            <button
                              onClick={(e) => { e.stopPropagation(); openLink((r as any).downloadUrl, "Download PDF"); }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 hover:bg-neon-cyan/25 transition-all opacity-60 group-hover/item:opacity-100"
                            >
                              <Download className="w-3 h-3" /> PDF
                            </button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </>
          )}

          {!globalQuery && !searchLoading && (
            <div className="text-center py-16">
              <Archive className="w-12 h-12 mx-auto text-muted-foreground/20 mb-4" />
              <p className="text-muted-foreground font-mono text-sm">Search across {totalItems.toLocaleString()} documents in {categories.length} categories</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Try: survival, farming, medical, firearms, engineering</p>
            </div>
          )}
        </TabsContent>

        {/* Individual Breaches Tab */}
        <TabsContent value="breaches" className="mt-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search individual breach entries..."
              value={breachSearch}
              onChange={(e) => setBreachSearch(e.target.value)}
              className="pl-10 glass-panel border-white/10 font-mono text-sm"
            />
          </div>

          <div className="space-y-1.5">
            {(breachData?.breaches || []).map((b, idx) => (
              <motion.div
                key={`${b.title}-${idx}`}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.01 }}
              >
                <Card className="glass-panel border-white/5 hover:border-neon-red/20 transition-all group/item">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertTriangle className="w-4 h-4 text-neon-red/60 shrink-0" />
                      <span className="text-sm truncate">{b.title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-white/5 border-white/10 font-mono">
                        {b.link_info}
                      </Badge>
                      <span className="text-[10px] font-mono text-muted-foreground">{b.date}</span>
                      {(b as any).downloadUrl && (
                        <button
                          onClick={(e) => { e.stopPropagation(); openLink((b as any).downloadUrl, "Download PDF"); }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono bg-neon-red/10 text-neon-red border border-neon-red/20 hover:bg-neon-red/25 transition-all opacity-60 group-hover/item:opacity-100"
                        >
                          <Download className="w-3 h-3" /> PDF
                        </button>
                      )}
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
