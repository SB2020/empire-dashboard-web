import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Send,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Scan,
  Lock,
} from "lucide-react";
import { useState } from "react";
import { Streamdown } from "streamdown";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

export default function SecurityPerimeter() {
  const { user } = useAuth();
  const [scanInput, setScanInput] = useState("");
  const [scanResult, setScanResult] = useState<string | null>(null);

  const securityStats = trpc.security.stats.useQuery(undefined, { enabled: !!user });
  const securityLogs = trpc.security.logs.useQuery({ limit: 50 }, { enabled: !!user });

  const scan = trpc.security.scan.useMutation({
    onSuccess: (data) => {
      setScanResult(data.analysis);
      securityLogs.refetch();
      securityStats.refetch();
      setScanInput("");
    },
  });

  const command = trpc.agents.command.useMutation({
    onSuccess: (data) => {
      setScanResult(data.response);
    },
  });

  const severityColor: Record<string, string> = {
    critical: "text-neon-red",
    high: "text-neon-amber",
    medium: "text-neon-cyan",
    low: "text-neon-green",
  };

  const severityDot: Record<string, string> = {
    critical: "bg-neon-red",
    high: "bg-neon-amber",
    medium: "bg-neon-cyan",
    low: "bg-neon-green",
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 p-1 md:p-2">
      {/* Header */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl glass-elevated flex items-center justify-center glow-red">
            <Shield className="h-5 w-5 text-neon-red" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-wider text-neon-red uppercase">
              Security Perimeter
            </h1>
            <p className="text-[10px] font-mono text-muted-foreground tracking-widest mt-0.5">
              SENTINEL PLINY // ADVERSARIAL HARDENING PROTOCOL
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: ShieldCheck, label: "Total Events", value: Number(securityStats.data?.total || 0), color: "neon-green", glow: "glow-green" },
          { icon: ShieldAlert, label: "Critical", value: Number(securityStats.data?.critical || 0), color: "neon-red", glow: "glow-red" },
          { icon: AlertTriangle, label: "High", value: Number(securityStats.data?.high || 0), color: "neon-amber", glow: "glow-amber" },
          { icon: Lock, label: "Unresolved", value: Number(securityStats.data?.unresolved || 0), color: "neon-cyan", glow: "glow-cyan" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            whileHover={{ scale: 1.02, y: -1 }}
            className={`glass-panel edge-light p-4 ${stat.glow}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`h-4 w-4 text-${stat.color} opacity-70`} />
              <span className="text-[10px] font-mono text-muted-foreground/70 uppercase tracking-wider">{stat.label}</span>
            </div>
            <p className="font-heading text-2xl font-bold chrome-text">{stat.value}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Scan Input */}
      <motion.div variants={fadeUp} className="glass-elevated edge-light p-5 glow-red">
        <h3 className="font-heading text-sm font-bold text-neon-red uppercase mb-4 flex items-center gap-2">
          <Scan className="h-4 w-4" />
          Prompt Injection Scanner
        </h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!scanInput.trim() || scan.isPending) return;
            scan.mutate({ text: scanInput.trim() });
          }}
          className="space-y-4"
        >
          <textarea
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            placeholder="Paste text to scan for prompt injection attacks, adversarial patterns, and security threats..."
            rows={4}
            className="w-full glass-panel border-neon-red/10 rounded-xl px-4 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-neon-red/30 resize-none transition-all duration-300"
            style={{ boxShadow: 'none' }}
            disabled={scan.isPending}
          />
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={!scanInput.trim() || scan.isPending}
              className="glass-elevated text-neon-red hover:bg-neon-red/10 font-mono text-xs uppercase tracking-wider rounded-xl transition-all duration-300"
            >
              {scan.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Scan className="h-4 w-4 mr-2" />}
              Scan for Threats
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!scanInput.trim() || command.isPending) return;
                command.mutate({ agentId: "pliny", message: scanInput.trim() });
              }}
              disabled={!scanInput.trim() || command.isPending}
              className="glass-panel text-chrome-dim hover:bg-teal-glow/5 font-mono text-xs uppercase tracking-wider rounded-xl transition-all duration-300"
              style={{ boxShadow: 'none' }}
            >
              {command.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Ask Pliny
            </Button>
          </div>
        </form>
      </motion.div>

      {/* Scan Result */}
      {scanResult && !scan.isPending && !command.isPending && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-elevated edge-light p-5 glow-red"
        >
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-neon-red" />
            <h3 className="font-heading text-sm font-bold text-neon-red uppercase tracking-wider">
              Threat Analysis
            </h3>
          </div>
          <div className="prose prose-invert prose-sm max-w-none text-sm">
            <Streamdown>{scanResult}</Streamdown>
          </div>
        </motion.div>
      )}

      {/* Security Logs */}
      {securityLogs.data && securityLogs.data.length > 0 && (
        <motion.div variants={fadeUp}>
          <h3 className="font-heading text-sm font-bold chrome-text uppercase mb-3 tracking-wider">
            Security Event Log
          </h3>
          <div className="glass-panel edge-light overflow-hidden divide-y divide-border/20">
            {securityLogs.data.map((log: any, i: number) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 px-5 py-3 hover:bg-teal-glow/5 transition-all duration-300"
              >
                <span className={`h-2 w-2 rounded-full ${severityDot[log.severity] || "bg-muted"}`} />
                <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md glass-panel border-0 ${severityColor[log.severity] || ""}`} style={{ boxShadow: 'none' }}>
                  {log.severity}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground/60 uppercase w-28 shrink-0 tracking-wider">
                  {log.eventType.replace(/_/g, " ")}
                </span>
                <span className="text-xs font-mono text-foreground/80 truncate flex-1">
                  {log.description}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground/40 shrink-0">
                  {new Date(log.createdAt).toLocaleTimeString()}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
