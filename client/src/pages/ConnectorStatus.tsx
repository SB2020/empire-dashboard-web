import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  Plug, CheckCircle2, XCircle, AlertTriangle, Clock, RefreshCw,
  Plus, Trash2, Settings, Shield, Loader2, ExternalLink, Wifi, WifiOff
} from "lucide-react";

const STATUS_COLORS: Record<string, { text: string; bg: string; icon: any }> = {
  active: { text: "text-green-400", bg: "bg-green-500/10 border-green-500/30", icon: CheckCircle2 },
  error: { text: "text-red-400", bg: "bg-red-500/10 border-red-500/30", icon: XCircle },
  expired: { text: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30", icon: AlertTriangle },
  pending: { text: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30", icon: Clock },
  revoked: { text: "text-zinc-400", bg: "bg-zinc-500/10 border-zinc-500/30", icon: WifiOff },
};

const PLATFORM_PRESETS = [
  { name: "Twitter/X", type: "oauth", icon: "🐦" },
  { name: "Facebook", type: "oauth", icon: "📘" },
  { name: "Instagram", type: "oauth", icon: "📷" },
  { name: "LinkedIn", type: "oauth", icon: "💼" },
  { name: "Telegram", type: "api_key", icon: "✈️" },
  { name: "Discord", type: "oauth", icon: "🎮" },
  { name: "Reddit", type: "oauth", icon: "🔴" },
  { name: "Shodan", type: "api_key", icon: "🔍" },
  { name: "VirusTotal", type: "api_key", icon: "🛡️" },
  { name: "Have I Been Pwned", type: "api_key", icon: "🔓" },
  { name: "Censys", type: "api_key", icon: "🌐" },
  { name: "Custom API", type: "api_key", icon: "⚙️" },
];

export default function ConnectorStatus() {
  const { user } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  const { data: connectors, isLoading, refetch } = trpc.connector.list.useQuery();
  const connectPlatform = trpc.connector.connect.useMutation({
    onSuccess: (result) => {
      toast.success(`${result.platform}: Connected`);
      refetch();
    },
  });
  const disconnectPlatform = trpc.connector.disconnect.useMutation({
    onSuccess: () => { toast.success("Connector disconnected"); refetch(); },
  });

  const activeCount = connectors?.filter((c: any) => c.status === "active").length || 0;
  const errorCount = connectors?.filter((c: any) => c.status === "error" || c.status === "expired").length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight neon-text-cyan">CONNECTOR STATUS</h1>
          <p className="text-sm opacity-60 mt-1">OAuth and API integrations health monitoring</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-600/30 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Connector
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-panel rounded-lg p-4 text-center">
          <div className="text-2xl font-bold neon-text-cyan">{connectors?.length || 0}</div>
          <div className="text-xs opacity-50">TOTAL</div>
        </div>
        <div className="glass-panel rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{activeCount}</div>
          <div className="text-xs opacity-50">ACTIVE</div>
        </div>
        <div className="glass-panel rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-400">{errorCount}</div>
          <div className="text-xs opacity-50">ISSUES</div>
        </div>
        <div className="glass-panel rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">{PLATFORM_PRESETS.length}</div>
          <div className="text-xs opacity-50">AVAILABLE</div>
        </div>
      </div>

      {/* Connector Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin opacity-50" />
        </div>
      ) : !connectors?.length ? (
        <div className="glass-panel rounded-xl p-12 text-center">
          <Plug className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-semibold mb-2">No Connectors Configured</h3>
          <p className="text-sm opacity-50 mb-4">Add OAuth or API integrations to connect with external platforms and data sources.</p>
          <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-lg bg-cyan-600/20 border border-cyan-500/30 text-cyan-400 text-sm">
            <Plus className="w-4 h-4 inline mr-1" /> Add First Connector
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {connectors.map((conn: any) => {
            const statusCfg = STATUS_COLORS[conn.status] || STATUS_COLORS.pending;
            const StatusIcon = statusCfg.icon;
            const preset = PLATFORM_PRESETS.find(p => p.name === conn.platform);
            return (
              <motion.div key={conn.platform || conn.id || conn.displayName} layout className="glass-panel rounded-xl p-4 hover:border-white/20 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{preset?.icon || "🔌"}</div>
                    <div>
                      <h3 className="font-semibold text-sm">{conn.platform}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10">{conn.connectorType}</span>
                    </div>
                  </div>
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.bg} ${statusCfg.text}`}>
                    <StatusIcon className="w-3 h-3" /> {conn.status.toUpperCase()}
                  </span>
                </div>

                {conn.lastCheckedAt && (
                  <div className="text-[10px] opacity-40 flex items-center gap-1 mb-3">
                    <Clock className="w-3 h-3" /> Last checked: {new Date(conn.lastCheckedAt).toLocaleString()}
                  </div>
                )}

                {conn.errorMessage && (
                  <div className="text-xs text-red-400/80 bg-red-500/5 rounded p-2 mb-3 border border-red-500/10">
                    {conn.errorMessage}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {conn.status === "disconnected" ? (
                    <button
                      onClick={() => connectPlatform.mutate({ platform: conn.platform })}
                      disabled={connectPlatform.isPending}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs hover:bg-green-500/20 transition-colors"
                    >
                      <Wifi className="w-3 h-3" /> Connect
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => connectPlatform.mutate({ platform: conn.platform })}
                        disabled={connectPlatform.isPending}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs hover:bg-white/10 transition-colors"
                      >
                        <RefreshCw className={`w-3 h-3 ${connectPlatform.isPending ? "animate-spin" : ""}`} /> Refresh
                      </button>
                      <button
                        onClick={() => { if (confirm("Disconnect this connector?")) disconnectPlatform.mutate({ platform: conn.platform }); }}
                        className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs hover:bg-red-500/20 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Available Platforms (always visible) */}
      <div className="glass-panel rounded-xl p-4">
        <h3 className="text-sm font-bold mb-3 opacity-70">AVAILABLE PLATFORMS</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2">
          {PLATFORM_PRESETS.map(preset => {
            const isConnected = connectors?.some((c: any) => c.platform === preset.name);
            return (
              <div
                key={preset.name}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${isConnected ? "bg-green-500/5 border-green-500/20" : "bg-white/5 border-white/10 hover:border-white/20 cursor-pointer"}`}
                onClick={() => !isConnected && toast.info(`To connect ${preset.name}, configure your API credentials in the platform settings.`)}
              >
                <span className="text-lg">{preset.icon}</span>
                <div>
                  <div className="text-xs font-medium">{preset.name}</div>
                  <div className="text-[10px] opacity-40">{isConnected ? "Connected" : preset.type}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
