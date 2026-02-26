import { useState } from "react";
import { motion } from "framer-motion";
import { ClipboardCheck, Shield, CheckCircle2, XCircle, Download, RefreshCw, Hash, Clock, User, Activity } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ArtifactWarning, AttestationFooter } from "@/components/ArtifactWarning";
import { Button } from "@/components/ui/button";

export default function AuditChainPage() {
  const [verifying, setVerifying] = useState(false);

  const auditLog = trpc.caseEnhanced.getAuditLog.useQuery({});
  const chainVerify = trpc.auditChain.verify.useQuery(undefined, { enabled: false });
  const auditExport = trpc.auditChain.export.useQuery({ format: "json" }, { enabled: false });

  const handleVerify = async () => {
    setVerifying(true);
    await chainVerify.refetch();
    setVerifying(false);
  };

  const handleExportJSON = async () => {
    const result = await auditExport.refetch();
    if (result.data && "entries" in result.data) {
      const blob = new Blob([JSON.stringify(result.data.entries, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-4">
      <ArtifactWarning variant="global" dismissible={false} />

      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-neon-magenta/10 border border-neon-magenta/20">
          <ClipboardCheck className="w-6 h-6 text-neon-magenta" />
        </div>
        <div>
          <h1 className="text-xl font-mono font-bold chrome-text">AUDIT CHAIN</h1>
          <p className="text-xs text-muted-foreground font-mono">
            Immutable blockchain-lite SHA-256 hash chain verification
          </p>
        </div>
      </div>

      {/* Chain Verification */}
      <div className="glass-panel rounded-lg p-4">
        <h2 className="text-sm font-mono font-bold chrome-text mb-3 flex items-center gap-2">
          <Hash className="w-4 h-4 text-neon-cyan" />
          CHAIN INTEGRITY VERIFICATION
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Each audit log entry contains a SHA-256 hash of the previous entry, forming a tamper-evident chain.
          Verify the entire chain to detect any unauthorized modifications.
        </p>
        <div className="flex items-center gap-3 mb-4">
          <Button
            onClick={handleVerify}
            disabled={verifying}
            className="bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/20 text-xs font-mono"
          >
            {verifying ? (
              <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
            ) : (
              <Shield className="w-3.5 h-3.5 mr-2" />
            )}
            {verifying ? "VERIFYING..." : "VERIFY CHAIN"}
          </Button>
          <Button
            onClick={handleExportJSON}
            variant="outline"
            className="text-xs font-mono border-white/10"
          >
            <Download className="w-3.5 h-3.5 mr-2" />
            EXPORT JSON
          </Button>
        </div>

        {chainVerify.data && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded border ${
              chainVerify.data.valid
                ? "bg-green-500/10 border-green-500/20"
                : "bg-red-500/10 border-red-500/20"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {chainVerify.data.valid ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <span className="text-sm font-mono font-bold text-green-400">CHAIN VALID</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-400" />
                  <span className="text-sm font-mono font-bold text-red-400">CHAIN BROKEN</span>
                </>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <div className="text-[10px] font-mono text-muted-foreground">TOTAL ENTRIES</div>
                <div className="text-lg font-mono font-bold text-foreground">{chainVerify.data.totalEntries}</div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-muted-foreground">VERIFIED</div>
                <div className="text-lg font-mono font-bold text-neon-green">{chainVerify.data.verifiedEntries}</div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-muted-foreground">STATUS</div>
                <div className={`text-lg font-mono font-bold ${chainVerify.data.valid ? "text-green-400" : "text-red-400"}`}>
                  {chainVerify.data.valid ? "INTACT" : "TAMPERED"}
                </div>
              </div>
              {chainVerify.data.brokenAt && (
                <div>
                  <div className="text-[10px] font-mono text-muted-foreground">BROKEN AT</div>
                  <div className="text-lg font-mono font-bold text-red-400">#{chainVerify.data.brokenAt}</div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Recent Audit Entries */}
      <div className="glass-panel rounded-lg p-4">
        <h2 className="text-sm font-mono font-bold chrome-text mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-neon-amber" />
          RECENT AUDIT ENTRIES
        </h2>
        {auditLog.isLoading ? (
          <div className="text-xs text-muted-foreground font-mono animate-pulse">Loading audit log...</div>
        ) : auditLog.data && auditLog.data.length > 0 ? (
          <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
            {auditLog.data.map((entry: any) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-start gap-3 p-2.5 rounded border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <div className={`w-2 h-2 rounded-full ${
                    entry.action.includes("create") ? "bg-green-400" :
                    entry.action.includes("delete") ? "bg-red-400" :
                    entry.action.includes("update") ? "bg-amber-400" :
                    "bg-cyan-400"
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-mono font-bold text-foreground">{entry.action}</span>
                    <span className="text-[10px] font-mono text-neon-cyan/50">{entry.resourceType}:{entry.resourceId || "-"}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <User className="w-2.5 h-2.5" />
                      {entry.actorName}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                    {entry.hash && (
                      <span className="text-[9px] font-mono text-neon-magenta/40" title={entry.hash}>
                        #{entry.hash.slice(0, 8)}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <ClipboardCheck className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground font-mono">No audit entries yet</p>
            <p className="text-[10px] text-muted-foreground/60 font-mono mt-1">
              Actions like creating evidence, running playbooks, and connecting platforms are automatically logged
            </p>
          </div>
        )}
      </div>

      {/* Hash Chain Explanation */}
      <div className="glass-panel rounded-lg p-4">
        <h2 className="text-sm font-mono font-bold chrome-text mb-3">HOW THE HASH CHAIN WORKS</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center text-[10px] font-mono text-neon-cyan flex-shrink-0">1</div>
            <div>
              <div className="text-xs font-mono font-bold text-foreground">Entry Created</div>
              <div className="text-[11px] text-muted-foreground">Every action (create, update, delete, export) generates an audit entry with actor, action, resource, and timestamp.</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-neon-green/10 border border-neon-green/20 flex items-center justify-center text-[10px] font-mono text-neon-green flex-shrink-0">2</div>
            <div>
              <div className="text-xs font-mono font-bold text-foreground">Previous Hash Retrieved</div>
              <div className="text-[11px] text-muted-foreground">The SHA-256 hash of the previous entry is fetched and stored as <code className="text-neon-cyan">prevHash</code>.</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-neon-amber/10 border border-neon-amber/20 flex items-center justify-center text-[10px] font-mono text-neon-amber flex-shrink-0">3</div>
            <div>
              <div className="text-xs font-mono font-bold text-foreground">Hash Computed</div>
              <div className="text-[11px] text-muted-foreground">SHA-256 is computed over: <code className="text-neon-cyan">id | action | actorId | actorType | resourceType | resourceId | details | timestamp | prevHash</code></div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-neon-magenta/10 border border-neon-magenta/20 flex items-center justify-center text-[10px] font-mono text-neon-magenta flex-shrink-0">4</div>
            <div>
              <div className="text-xs font-mono font-bold text-foreground">Tamper Detection</div>
              <div className="text-[11px] text-muted-foreground">Any modification to a historical entry breaks the chain. Verification recomputes all hashes from genesis and compares.</div>
            </div>
          </div>
        </div>
      </div>

      <AttestationFooter />
    </div>
  );
}
