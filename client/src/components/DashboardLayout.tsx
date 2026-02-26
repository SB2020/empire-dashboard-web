import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Shield,
  Code2,
  Music,
  Eye,
  FlaskConical,
  Network,
  ScrollText,
  Zap,
  Lock,
  Radar,
  GitBranch,
  Target,
  Radio,
  Boxes,
  Share2,
  Search,
  Briefcase,
  Activity,
  Database,
  BarChart3,
  Clock,
  Brain,
  Sparkles,
  Gamepad2,
  Users,
  Github,
  BookOpen,
  Crosshair,
  FileText,
  ListChecks,
  MessageSquare,
  Plug,
  BookMarked,
  Map,
  ShieldCheck,
  Terminal,
  ClipboardCheck,
  Camera,
  ScanLine,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { Palette, Check, ChevronDown } from "lucide-react";

type MenuItem = { icon: typeof LayoutDashboard; label: string; path: string; color: string };
type MenuSection = { id: string; title: string; color: string; items: MenuItem[] };

const menuSections: MenuSection[] = [
  {
    id: "core",
    title: "CORE",
    color: "text-neon-cyan",
    items: [
      { icon: LayoutDashboard, label: "Command Center", path: "/", color: "text-neon-cyan" },
      { icon: Radar, label: "WORLDVIEW", path: "/worldview", color: "text-neon-amber" },
      { icon: GitBranch, label: "Chain of Command", path: "/hierarchy", color: "text-neon-cyan" },
      { icon: Shield, label: "Security Perimeter", path: "/security", color: "text-neon-red" },
      { icon: Code2, label: "Vibe Coder", path: "/vibe-coder", color: "text-neon-green" },
      { icon: Music, label: "Media Command", path: "/media", color: "text-neon-magenta" },
    ],
  },
  {
    id: "intelligence",
    title: "INTELLIGENCE",
    color: "text-neon-amber",
    items: [
      { icon: Eye, label: "Intelligence Hub", path: "/intelligence", color: "text-neon-amber" },
      { icon: FlaskConical, label: "Research Lab", path: "/research", color: "text-neon-blue" },
      { icon: Network, label: "Knowledge Graph", path: "/knowledge", color: "text-neon-cyan" },
      { icon: Target, label: "HUMINT Profiler", path: "/humint", color: "text-neon-amber" },
      { icon: Radio, label: "Agent Comms", path: "/comms", color: "text-neon-green" },
      { icon: Share2, label: "SIGINT Network", path: "/sigint", color: "text-neon-red" },
    ],
  },
  {
    id: "osint",
    title: "OSINT",
    color: "text-neon-red",
    items: [
      { icon: Radio, label: "Live Feed", path: "/feed", color: "text-neon-red" },
      { icon: Search, label: "One-Search", path: "/search", color: "text-neon-cyan" },
      { icon: Clock, label: "Timeline", path: "/timeline", color: "text-neon-cyan" },
      { icon: Brain, label: "NL Query", path: "/nlquery", color: "text-neon-magenta" },
      { icon: Activity, label: "Entity Graph", path: "/entities", color: "text-neon-magenta" },
      { icon: Briefcase, label: "Case Workspace", path: "/cases", color: "text-neon-amber" },
      { icon: Database, label: "Source Connectors", path: "/connectors", color: "text-neon-green" },
      { icon: Github, label: "GitHub OSINT", path: "/github", color: "text-neon-cyan" },
      { icon: Crosshair, label: "OSINT Tools", path: "/osint-tools", color: "text-neon-amber" },
      { icon: BookOpen, label: "Survivor Library", path: "/survivor-library", color: "text-neon-green" },
      { icon: BarChart3, label: "Op Metrics", path: "/metrics", color: "text-neon-blue" },
      { icon: FileText, label: "Evidence Feed", path: "/evidence", color: "text-neon-red" },
      { icon: ListChecks, label: "Playbook Runner", path: "/playbooks", color: "text-neon-green" },
      { icon: MessageSquare, label: "Agent Chat", path: "/agent-chat", color: "text-neon-magenta" },
      { icon: Plug, label: "Connector Status", path: "/connector-status", color: "text-neon-amber" },
    ],
  },
  {
    id: "content",
    title: "CONTENT & TOOLS",
    color: "text-neon-magenta",
    items: [
      { icon: Sparkles, label: "AI Stories", path: "/stories", color: "text-neon-amber" },
      { icon: Gamepad2, label: "Games Arcade", path: "/games", color: "text-neon-green" },
      { icon: Users, label: "NEXUS Social", path: "/social", color: "text-neon-cyan" },
      { icon: Boxes, label: "App Ecosystem", path: "/ecosystem", color: "text-neon-magenta" },
      { icon: FileText, label: "PDF Library", path: "/pdf-library", color: "text-neon-blue" },
      { icon: Camera, label: "YOLO Surveillance", path: "/yolo-camera", color: "text-neon-red" },
      { icon: Brain, label: "System Prompts", path: "/system-prompts", color: "text-neon-magenta" },
      { icon: ScrollText, label: "Command Log", path: "/command-log", color: "text-chrome-dim" },
    ],
  },
  {
    id: "governance",
    title: "GOVERNANCE",
    color: "text-neon-green",
    items: [
      { icon: BookMarked, label: "User Manual", path: "/manual", color: "text-neon-green" },
      { icon: Map, label: "App Map", path: "/app-map", color: "text-neon-cyan" },
      { icon: ShieldCheck, label: "Security Model", path: "/security-model", color: "text-neon-red" },
      { icon: Terminal, label: "Macros & Playbooks", path: "/macros", color: "text-neon-amber" },
      { icon: ClipboardCheck, label: "Audit Chain", path: "/audit-chain", color: "text-neon-magenta" },
    ],
  },
];

const allMenuItems = menuSections.flatMap(s => s.items);

function SidebarNavSection({ section, location, setLocation, isCollapsed, defaultOpen }: {
  section: MenuSection;
  location: string;
  setLocation: (path: string) => void;
  isCollapsed: boolean;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-1">
      {!isCollapsed && (
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-3 py-1.5 group"
        >
          <span className={`text-[9px] font-mono uppercase tracking-[0.25em] ${section.color} opacity-60 group-hover:opacity-100 transition-opacity`}>
            {section.title}
          </span>
          <ChevronDown className={`w-3 h-3 text-muted-foreground/40 transition-transform duration-200 ${open ? '' : '-rotate-90'}`} />
        </button>
      )}
      {(open || isCollapsed) && section.items.map((item) => {
        const isActive = location === item.path;
        return (
          <SidebarMenuItem key={item.path}>
            <SidebarMenuButton
              isActive={isActive}
              onClick={() => setLocation(item.path)}
              tooltip={item.label}
              className={`h-8 transition-all duration-300 font-mono text-[11px] relative ${
                isActive
                  ? "glass-panel border-teal-glow/20"
                  : "hover:bg-teal-glow/5 border border-transparent"
              }`}
            >
              <item.icon
                className={`h-3.5 w-3.5 transition-all duration-300 ${
                  isActive ? item.color : "text-muted-foreground"
                }`}
              />
              <span
                className={`transition-all duration-300 ${
                  isActive ? item.color : "text-muted-foreground"
                }`}
              >
                {item.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-teal-glow"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </div>
  );
}

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

const pageTransition = {
  initial: { opacity: 0, y: 8, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -8, filter: "blur(4px)" },
  transition: { duration: 0.35, ease: "easeOut" as const },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen glass-bg relative overflow-hidden">
        {/* Ambient orbs */}
        <div className="ambient-orb ambient-orb-1" />
        <div className="ambient-orb ambient-orb-2" />
        <div className="ambient-orb ambient-orb-3" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-8 p-8 max-w-md w-full relative z-10"
        >
          <div className="flex flex-col items-center gap-5">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="h-16 w-16 rounded-2xl glass-elevated flex items-center justify-center glow-teal"
            >
              <Zap className="h-8 w-8 text-neon-cyan" />
            </motion.div>
            <h1 className="text-3xl font-heading font-bold tracking-wider chrome-text-teal uppercase">
              System Zero
            </h1>
            <p className="text-sm text-muted-foreground text-center font-mono tracking-wide">
              AUTHORIZATION REQUIRED // PRESIDENTIAL ACCESS ONLY
            </p>
          </div>
          <div className="w-full glass-elevated edge-light p-8">
            <div className="flex items-center gap-3 mb-6 justify-center">
              <Lock className="h-4 w-4 text-teal-glow" />
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                Secure Authentication
              </span>
            </div>
            <Button
              onClick={() => {
                window.location.href = getLoginUrl();
              }}
              size="lg"
              className="w-full glass-panel border-teal-glow/30 text-neon-cyan hover:text-foreground font-mono tracking-wider uppercase h-12 text-sm transition-all duration-500 hover:glow-teal-strong"
            >
              <Shield className="mr-2 h-4 w-4" />
              Authenticate
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

/** VSCode-style theme picker for the sidebar */
function ThemePicker({ isCollapsed }: { isCollapsed: boolean }) {
  const { themeId, allThemes, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  if (isCollapsed) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-accent/50 transition-all mx-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title="Change theme"
          >
            <Palette className="h-4 w-4 text-primary" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="right"
          align="end"
          className="w-56 glass-elevated border-border/30 p-1"
        >
          <div className="px-2 py-1.5 mb-1">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em]">Color Theme</p>
          </div>
          {allThemes.map((t) => (
            <DropdownMenuItem
              key={t.id}
              onClick={() => setTheme(t.id)}
              className="cursor-pointer font-mono text-xs gap-2 focus:bg-accent/50"
            >
              <div className="flex items-center gap-1.5 shrink-0">
                {t.swatches.map((s, i) => (
                  <div
                    key={i}
                    className="h-3 w-3 rounded-sm border border-border/30"
                    style={{ background: s }}
                  />
                ))}
              </div>
              <span className="flex-1 truncate">{t.label}</span>
              {themeId === t.id && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full rounded-lg px-2 py-1.5 hover:bg-accent/50 transition-all text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Palette className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider flex-1">
          Theme
        </span>
        <div className="flex items-center gap-0.5">
          {allThemes.find((t) => t.id === themeId)?.swatches.slice(0, 3).map((s, i) => (
            <div
              key={i}
              className="h-2.5 w-2.5 rounded-sm border border-border/30"
              style={{ background: s }}
            />
          ))}
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-1 space-y-0.5">
              {allThemes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    setOpen(false);
                  }}
                  className={`flex items-center gap-2 w-full rounded-md px-2 py-1.5 transition-all text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    themeId === t.id
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-accent/50 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-1 shrink-0">
                    {t.swatches.map((s, i) => (
                      <div
                        key={i}
                        className="h-3 w-3 rounded-sm border border-border/30"
                        style={{ background: s }}
                      />
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-mono text-foreground truncate">{t.label}</p>
                    <p className="text-[8px] font-mono text-muted-foreground truncate">{t.description}</p>
                  </div>
                  {themeId === t.id && <Check className="h-3 w-3 text-primary shrink-0" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = allMenuItems.find((item: MenuItem) => item.path === location);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft =
        sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="glass-deep border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center border-b border-border/30">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-teal-glow/10 rounded-lg transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-glow shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-teal-glow" />
              </button>
              {!isCollapsed ? (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 min-w-0"
                >
                  <Zap className="h-4 w-4 text-neon-cyan shrink-0" />
                  <span className="font-heading font-bold tracking-wider chrome-text-teal text-sm uppercase truncate">
                    System Zero
                  </span>
                </motion.div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 overflow-y-auto">
            <SidebarMenu className="px-2 py-1 gap-0">
              {menuSections.map((section) => {
                const sectionHasActive = section.items.some(i => i.path === location);
                return (
                  <SidebarNavSection
                    key={section.id}
                    section={section}
                    location={location}
                    setLocation={setLocation}
                    isCollapsed={isCollapsed}
                    defaultOpen={section.id === "core" || sectionHasActive}
                  />
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3 border-t border-border/30 space-y-2">
            {/* Theme Picker */}
            <ThemePicker isCollapsed={isCollapsed} />

            {/* User Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1.5 hover:bg-teal-glow/5 transition-all duration-300 w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-glow">
                  <Avatar className="h-8 w-8 border border-teal-glow/20 shrink-0">
                    <AvatarFallback className="text-xs font-mono font-medium bg-teal-glow/10 text-neon-cyan">
                      {user?.name?.charAt(0).toUpperCase() || "P"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-xs font-mono font-medium truncate leading-none chrome-text">
                      {user?.name || "THE PRESIDENT"}
                    </p>
                    <p className="text-[10px] font-mono text-teal-glow/60 truncate mt-1 tracking-wider">
                      GOD MODE ACTIVE
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 glass-elevated border-border/30"
              >
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-neon-red focus:text-neon-red font-mono text-xs"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Disconnect</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-teal-glow/30 transition-colors ${
            isCollapsed ? "hidden" : ""
          }`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset className="glass-bg relative overflow-hidden">
        {/* Ambient background orbs */}
        <div className="ambient-orb ambient-orb-1" />
        <div className="ambient-orb ambient-orb-2" />
        <div className="ambient-orb ambient-orb-3" />

        {isMobile && (
          <div className="flex border-b border-border/20 h-14 items-center justify-between glass-panel rounded-none px-2 sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-transparent" />
              <div className="flex items-center gap-3">
                <span className="tracking-wider chrome-text font-mono text-sm uppercase">
                  {activeMenuItem?.label ?? "System Zero"}
                </span>
              </div>
            </div>
          </div>
        )}
        <AnimatePresence mode="wait">
          <motion.main
            key={location}
            {...pageTransition}
            className="flex-1 p-4 md:p-6 relative z-10" style={{marginTop: '46px'}}
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </SidebarInset>
    </>
  );
}
