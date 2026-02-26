import { motion } from "framer-motion";
import { ShieldCheck, AlertTriangle, Lock, Eye, FileCheck, CheckCircle2, XCircle } from "lucide-react";
import { ArtifactWarning } from "@/components/ArtifactWarning";

const POLICIES = [
  { icon: CheckCircle2, text: "Aggregate public APIs (OpenSky, USGS, NWS, GDELT, NVD, GitHub)", allowed: true },
  { icon: CheckCircle2, text: "Display publicly accessible web cameras", allowed: true },
  { icon: CheckCircle2, text: "Search publicly indexed documents and repositories", allowed: true },
  { icon: XCircle, text: "Access private databases, email accounts, or protected systems", allowed: false },
  { icon: XCircle, text: "Perform credential stuffing, brute-force attacks, or social engineering", allowed: false },
  { icon: XCircle, text: "Intercept communications or perform man-in-the-middle attacks", allowed: false },
  { icon: XCircle, text: "Scrape data behind authentication walls without authorization", allowed: false },
];

const AUTH_LEVELS = [
  { level: "Public", access: "Read-only OSINT data, search, browse", enforcement: "publicProcedure" },
  { level: "Authenticated", access: "Create cases, submit evidence, run playbooks", enforcement: "protectedProcedure (ctx.user)" },
  { level: "Admin", access: "User management, system configuration", enforcement: "adminProcedure (role === 'admin')" },
];

const COMPLIANCE = [
  { framework: "NIST SP 800-53", relevance: "Federal security controls", status: "Aligned" },
  { framework: "FedRAMP", relevance: "Cloud service authorization", status: "Architecture-ready" },
  { framework: "SOC 2 Type II", relevance: "Service organization controls", status: "Audit trail supports" },
  { framework: "GDPR", relevance: "EU data protection", status: "Minimal PII, consent-based" },
  { framework: "EO 14028", relevance: "Improving cybersecurity", status: "Supply chain transparency" },
];

const THREATS = [
  { threat: "Unauthorized access", mitigation: "OAuth + JWT + role-based access" },
  { threat: "Data tampering", mitigation: "Immutable audit log with hash chain" },
  { threat: "API abuse", mitigation: "Rate limiting + server-side proxy" },
  { threat: "XSS/injection", mitigation: "Zod validation + React escaping + CSP" },
  { threat: "Supply chain", mitigation: "Dependency auditing + lockfile integrity" },
  { threat: "Prompt injection", mitigation: "Pliny agent monitors all LLM inputs" },
];

export default function SecurityModelPage() {
  return (
    <div className="space-y-4">
      <ArtifactWarning variant="global" dismissible={false} />

      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-neon-red/10 border border-neon-red/20">
          <ShieldCheck className="w-6 h-6 text-neon-red" />
        </div>
        <div>
          <h1 className="text-xl font-mono font-bold chrome-text">SECURITY & GOVERNANCE MODEL</h1>
          <p className="text-xs text-muted-foreground font-mono">
            Classification: UNCLASSIFIED // PUBLIC DATA ONLY
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded bg-red-500/10 border border-red-500/20">
          <Lock className="w-3 h-3 text-red-400" />
          <span className="text-[10px] font-mono text-red-400 font-bold">TIER-1 DEFENSIVE OSINT</span>
        </div>
      </div>

      {/* Public Data Policy */}
      <div className="glass-panel rounded-lg p-4">
        <h2 className="text-sm font-mono font-bold chrome-text mb-3 flex items-center gap-2">
          <Eye className="w-4 h-4 text-neon-green" />
          PUBLIC-DATA-ONLY POLICY
        </h2>
        <div className="space-y-1.5">
          {POLICIES.map((policy, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`flex items-center gap-2 p-2 rounded text-xs font-mono ${
                policy.allowed
                  ? "bg-green-500/5 border border-green-500/10 text-green-300/80"
                  : "bg-red-500/5 border border-red-500/10 text-red-300/80"
              }`}
            >
              <policy.icon className={`w-3.5 h-3.5 flex-shrink-0 ${policy.allowed ? "text-green-400" : "text-red-400"}`} />
              <span>{policy.allowed ? "DOES" : "DOES NOT"}: {policy.text}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Authorization Levels */}
      <div className="glass-panel rounded-lg p-4">
        <h2 className="text-sm font-mono font-bold chrome-text mb-3 flex items-center gap-2">
          <Lock className="w-4 h-4 text-neon-amber" />
          AUTHORIZATION LEVELS
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-2 text-neon-cyan/60">LEVEL</th>
                <th className="text-left p-2 text-neon-cyan/60">ACCESS</th>
                <th className="text-left p-2 text-neon-cyan/60">ENFORCEMENT</th>
              </tr>
            </thead>
            <tbody>
              {AUTH_LEVELS.map((level) => (
                <tr key={level.level} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="p-2 text-neon-green font-bold">{level.level}</td>
                  <td className="p-2 text-muted-foreground">{level.access}</td>
                  <td className="p-2 text-neon-cyan/70">{level.enforcement}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Threat Model */}
      <div className="glass-panel rounded-lg p-4">
        <h2 className="text-sm font-mono font-bold chrome-text mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-neon-red" />
          THREAT MODEL
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {THREATS.map((t) => (
            <div key={t.threat} className="p-3 rounded border border-white/5 bg-white/[0.02]">
              <div className="text-[10px] font-mono font-bold text-red-400/80 mb-1">⚠ {t.threat.toUpperCase()}</div>
              <div className="text-[11px] text-muted-foreground">→ {t.mitigation}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Compliance Posture */}
      <div className="glass-panel rounded-lg p-4">
        <h2 className="text-sm font-mono font-bold chrome-text mb-3 flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-neon-magenta" />
          COMPLIANCE POSTURE
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-2 text-neon-cyan/60">FRAMEWORK</th>
                <th className="text-left p-2 text-neon-cyan/60">RELEVANCE</th>
                <th className="text-left p-2 text-neon-cyan/60">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {COMPLIANCE.map((c) => (
                <tr key={c.framework} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="p-2 text-neon-amber font-bold">{c.framework}</td>
                  <td className="p-2 text-muted-foreground">{c.relevance}</td>
                  <td className="p-2 text-neon-green/70">{c.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attestation */}
      <div className="glass-panel rounded-lg p-4 border-neon-green/20">
        <h2 className="text-sm font-mono font-bold text-neon-green mb-2">ATTESTATION</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Empire Dashboard: God Mode v3.0 operates exclusively on publicly available data sources,
          implements immutable audit logging with SHA-256 hash chain verification, enforces role-based
          access control, and is designed for legal, defensive OSINT operations only. This platform
          does not provide capabilities for unauthorized access, offensive operations, or handling of
          classified information.
        </p>
      </div>
    </div>
  );
}
