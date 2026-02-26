import { useState } from "react";
import { motion } from "framer-motion";
import { BookMarked, Search, ChevronRight, ExternalLink, Shield } from "lucide-react";
import { ArtifactWarning } from "@/components/ArtifactWarning";

const MANUAL_SECTIONS = [
  {
    id: "overview",
    title: "What Is Empire Dashboard?",
    content: `Empire Dashboard is a **legal, defensive open-source intelligence (OSINT) orchestration platform** that aggregates publicly available data into a single command center. It is designed for analysts, researchers, journalists, and security professionals who need to monitor, investigate, and report on open-source information — without ever crossing into unauthorized access or offensive operations.

**Public Data Only.** Every data source used by this platform is publicly accessible. No credentials are stolen, no systems are penetrated, no private data is scraped without authorization. This is a hard boundary enforced by design.`,
  },
  {
    id: "getting-started",
    title: "Getting Started",
    content: `**Logging In:** Click the login button on the landing page and authenticate via Manus OAuth.

**Navigation:** The sidebar organizes the platform into sections: CORE, INTELLIGENCE, OSINT, CONTENT & TOOLS, and GOVERNANCE. Each section contains related pages for specific workflows.`,
  },
  {
    id: "core-pages",
    title: "Core Pages",
    content: `**Command Center** — Your operational dashboard with real-time stats, quick-access cards, and bookmarked favorites.

**WORLDVIEW** — Google Maps geospatial intelligence with live flights (OpenSky), earthquakes (USGS), weather (NWS), 78 world cams, Street View, traffic cameras, and CRT/FLIR visual modes.

**Chain of Command** — Agent hierarchy visualization. The President delegates to General Sun Tzu, who coordinates 5 specialized AI agents.

**Security Perimeter** — Threat monitoring powered by the Pliny agent. Monitors prompt injection attempts and input sanitization.

**Vibe Coder** — AI-powered code generation using the Karpathy agent.

**Media Command** — Audio and visual content generation through the Virgil agent.`,
  },
  {
    id: "osint-pages",
    title: "OSINT Pages",
    content: `**Live Feed** — Real-time intelligence feed with infinite scroll. Filter by type, source, confidence.

**One-Search** — Unified cross-domain search across posts, images, videos, domains, and records.

**Timeline** — Temporal event visualization. See stories unfold over time.

**NL Query** — Natural language queries. Ask questions in plain English.

**Entity Graph** — Relationship mapping between people, organizations, locations, events.

**Case Workspace** — Investigation management with evidence, annotations, and audit trails.

**Evidence Feed** — Rich media evidence cards with confidence ribbons and provenance chains.

**Playbook Runner** — 6 composable workflows: Image Verify, Target Sweep, Rapid Report, and more.

**Agent Chat** — Direct conversation with 5 AI agents.

**GitHub OSINT** — Search and analyze GitHub repos. 34+ curated security tools.

**OSINT Tools** — 53 tools across 20 categories with health status badges.

**Survivor Library** — 15,102 documents across 166 categories with download links.

**Connector Status** — Monitor 12 OAuth/API connector health statuses.`,
  },
  {
    id: "themes",
    title: "Themes",
    content: `The platform ships with 10 themes: Oxford Dark, Monokai, Solarized Dark, Matrix, Dracula, Nord, One Dark, Cyberpunk, Solarized Light, and Arctic White. Access them from the sidebar footer.`,
  },
  {
    id: "data-sources",
    title: "Data Sources",
    content: `All data sources are publicly accessible APIs:

• **OpenSky Network** — Flight positions (60s polling)
• **USGS GeoJSON** — Earthquakes (60s polling)
• **National Weather Service** — Weather alerts (60s polling)
• **GDELT** — Global news events (60s polling)
• **NVD (NIST)** — CVE vulnerabilities (60s polling)
• **GitHub API** — Repository data (on-demand)
• **survivorlibrary.com** — Document archive (static)`,
  },
  {
    id: "faq",
    title: "FAQ",
    content: `**Q: Does this platform access private data?**
A: No. Every data source is publicly accessible.

**Q: Can I use this for offensive operations?**
A: No. This is a defensive OSINT platform for monitoring, analysis, and reporting.

**Q: How do I export findings?**
A: Use Generate Report on WORLDVIEW, or export from Case Workspace with full provenance chains.

**Q: Is the audit log tamper-proof?**
A: The audit log uses blockchain-lite SHA-256 hash chaining. Each entry includes a hash of the previous entry, making tampering detectable.`,
  },
];

export default function ManualPage() {
  const [activeSection, setActiveSection] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSections = searchQuery
    ? MANUAL_SECTIONS.filter(
        (s) =>
          s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : MANUAL_SECTIONS;

  const currentSection = MANUAL_SECTIONS.find((s) => s.id === activeSection);

  return (
    <div className="space-y-4">
      <ArtifactWarning variant="global" />

      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-neon-green/10 border border-neon-green/20">
          <BookMarked className="w-6 h-6 text-neon-green" />
        </div>
        <div>
          <h1 className="text-xl font-mono font-bold chrome-text">USER MANUAL</h1>
          <p className="text-xs text-muted-foreground font-mono">
            Empire Dashboard: God Mode v3.0
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2 px-2 py-1 rounded bg-green-500/10 border border-green-500/20">
          <Shield className="w-3 h-3 text-green-400" />
          <span className="text-[10px] font-mono text-green-400">PUBLIC DATA ONLY</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Table of Contents */}
        <div className="lg:col-span-1">
          <div className="glass-panel rounded-lg p-4 sticky top-20">
            <div className="relative mb-3">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search manual..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs font-mono bg-black/20 border border-white/10 rounded focus:border-neon-green/50 focus:outline-none"
              />
            </div>
            <nav className="space-y-0.5">
              {filteredSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => {
                    setActiveSection(section.id);
                    setSearchQuery("");
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded text-xs font-mono flex items-center gap-2 transition-all ${
                    activeSection === section.id
                      ? "bg-neon-green/10 text-neon-green border border-neon-green/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  <ChevronRight
                    className={`w-3 h-3 transition-transform ${
                      activeSection === section.id ? "rotate-90" : ""
                    }`}
                  />
                  {section.title}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel rounded-lg p-6"
          >
            <h2 className="text-lg font-mono font-bold chrome-text mb-4">
              {currentSection?.title}
            </h2>
            <div className="prose prose-invert prose-sm max-w-none">
              {currentSection?.content.split("\n\n").map((paragraph, i) => (
                <p
                  key={i}
                  className="text-sm text-muted-foreground leading-relaxed mb-3 whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: paragraph
                      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>')
                      .replace(/• /g, '<span class="text-neon-cyan mr-1">▸</span> '),
                  }}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
