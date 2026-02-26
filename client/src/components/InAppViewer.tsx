import { useState, useCallback, createContext, useContext, type ReactNode } from "react";
import {
  X, ExternalLink, ArrowLeft, ArrowRight, RefreshCw, Copy, Maximize2,
  Shield, Globe, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// ─── Context for app-wide in-app navigation ─────────────────────────────
interface InAppViewerState {
  isOpen: boolean;
  url: string;
  title: string;
}

interface InAppViewerContextType {
  openInApp: (url: string, title?: string) => void;
  closeViewer: () => void;
  state: InAppViewerState;
}

const InAppViewerContext = createContext<InAppViewerContextType>({
  openInApp: () => {},
  closeViewer: () => {},
  state: { isOpen: false, url: "", title: "" },
});

export function useInAppViewer() {
  return useContext(InAppViewerContext);
}

// ─── Provider ────────────────────────────────────────────────────────────
export function InAppViewerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<InAppViewerState>({
    isOpen: false,
    url: "",
    title: "",
  });
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const openInApp = useCallback((url: string, title?: string) => {
    setState({ isOpen: true, url, title: title || url });
    setHistory(prev => [...prev.slice(0, historyIndex + 1), url]);
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const closeViewer = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const goBack = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setState(prev => ({ ...prev, url: history[newIndex] }));
    }
  }, [history, historyIndex]);

  const goForward = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setState(prev => ({ ...prev, url: history[newIndex] }));
    }
  }, [history, historyIndex]);

  return (
    <InAppViewerContext.Provider value={{ openInApp, closeViewer, state }}>
      {children}
      {state.isOpen && (
        <InAppViewerModal
          url={state.url}
          title={state.title}
          onClose={closeViewer}
          onBack={goBack}
          onForward={goForward}
          canGoBack={historyIndex > 0}
          canGoForward={historyIndex < history.length - 1}
        />
      )}
    </InAppViewerContext.Provider>
  );
}

// ─── Modal Viewer ────────────────────────────────────────────────────────
function InAppViewerModal({
  url,
  title,
  onClose,
  onBack,
  onForward,
  canGoBack,
  canGoForward,
}: {
  url: string;
  title: string;
  onClose: () => void;
  onBack: () => void;
  onForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [iframeKey, setIframeKey] = useState(0);

  const handleRefresh = () => {
    setIsLoading(true);
    setIframeKey(k => k + 1);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(url);
    toast.success("URL copied to clipboard");
  };

  const handleOpenExternal = () => {
    window.open(url, "_blank");
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex flex-col">
      {/* Browser Chrome */}
      <div className="flex items-center gap-2 px-3 py-2 bg-background/95 border-b border-border/50 backdrop-blur">
        {/* Navigation */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={onBack}
            disabled={!canGoBack}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={onForward}
            disabled={!canGoForward}
          >
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleRefresh}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* URL Bar */}
        <div className="flex-1 flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5 border border-border/30">
          <Shield className="w-3.5 h-3.5 text-neon-green/60 shrink-0" />
          <Globe className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
          <span className="text-xs font-mono text-foreground/80 truncate flex-1">{url}</span>
          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 shrink-0" onClick={handleCopyUrl}>
            <Copy className="w-3 h-3" />
          </Button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground"
            onClick={handleOpenExternal}
            title="Open in new tab (escape hatch)"
          >
            <ExternalLink className="w-3.5 h-3.5 mr-1" />
            <span className="hidden sm:inline">External</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Title bar */}
      <div className="flex items-center px-3 py-1 bg-background/80 border-b border-border/30 text-[11px] text-muted-foreground">
        <span className="truncate">{title}</span>
        {isLoading && (
          <Loader2 className="w-3 h-3 ml-2 animate-spin text-neon-green" />
        )}
      </div>

      {/* Iframe Content */}
      <div className="flex-1 relative">
        <iframe
          key={iframeKey}
          src={url}
          className="absolute inset-0 w-full h-full border-0 bg-white"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; camera; microphone"
          onLoad={() => setIsLoading(false)}
          title={title}
        />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-neon-green" />
              <span className="text-sm text-muted-foreground">Loading content...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
