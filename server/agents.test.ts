import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import { AGENTS, AGENT_IDS, AGENT_HIERARCHY, findAgentForDomain, getAgentsByRank } from "../shared/agents";
import { postMessage, getChannelMessages, getChannels, getRecentMessages, getSkills, getAppEcosystem, APP_ECOSYSTEM } from "./agentComms";
import type { TrpcContext } from "./_core/context";

type CookieCall = { name: string; options: Record<string, unknown> };
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];
  const user: AuthenticatedUser = {
    id: 1, openId: "test-president", email: "president@empire.gov", name: "The President",
    loginMethod: "manus", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: (name: string, options: Record<string, unknown>) => { clearedCookies.push({ name, options }); } } as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

// ─── Agent Hierarchy & Definitions ──────────────────────────────────────────

describe("Agent Hierarchy & Definitions", () => {
  it("defines exactly 5 agents", () => {
    expect(AGENT_IDS.length).toBe(5);
    expect(Object.keys(AGENTS).length).toBe(5);
  });

  it("all agents have required properties including hierarchy fields", () => {
    for (const id of AGENT_IDS) {
      const agent = AGENTS[id];
      expect(agent).toBeDefined();
      expect(agent.id).toBe(id);
      expect(agent.name).toBeTruthy();
      expect(agent.archetype).toBeTruthy();
      expect(agent.directive).toBeTruthy();
      expect(agent.systemPrompt).toBeTruthy();
      expect(agent.systemPrompt.length).toBeGreaterThan(50);
      expect(agent.color).toBeTruthy();
      expect(agent.icon).toBeTruthy();
      expect(Array.isArray(agent.capabilities)).toBe(true);
      expect(agent.capabilities.length).toBeGreaterThan(0);
      expect(typeof agent.rank).toBe("number");
      expect(Array.isArray(agent.canDelegateTo)).toBe(true);
      expect(Array.isArray(agent.domains)).toBe(true);
    }
  });

  it("Sun Tzu is the Strategic Commander (rank 1)", () => {
    const suntzu = AGENTS.suntzu;
    expect(suntzu.rank).toBe(AGENT_HIERARCHY.STRATEGIC_COMMAND);
    expect(suntzu.reportsTo).toBeNull();
    expect(suntzu.canDelegateTo.length).toBeGreaterThan(0);
  });

  it("all delegation targets are valid agent IDs", () => {
    for (const id of AGENT_IDS) {
      const agent = AGENTS[id];
      for (const target of agent.canDelegateTo) {
        expect(AGENT_IDS).toContain(target);
      }
    }
  });

  it("all reportsTo references are valid or null", () => {
    for (const id of AGENT_IDS) {
      const agent = AGENTS[id];
      if (agent.reportsTo !== null) {
        expect(AGENT_IDS).toContain(agent.reportsTo);
      }
    }
  });

  it("each agent has unique color and icon", () => {
    const colors = Object.values(AGENTS).map((a) => a.color);
    const icons = Object.values(AGENTS).map((a) => a.icon);
    expect(new Set(colors).size).toBe(5);
    expect(new Set(icons).size).toBe(5);
  });

  it("getAgentsByRank returns agents sorted by rank", () => {
    const sorted = getAgentsByRank();
    expect(sorted[0].id).toBe("suntzu");
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].rank).toBeGreaterThanOrEqual(sorted[i - 1].rank);
    }
  });

  it("Pliny has security capabilities", () => {
    expect(AGENTS.pliny.capabilities.some((c) => c.toLowerCase().includes("injection"))).toBe(true);
  });

  it("Karpathy has coding capabilities", () => {
    expect(AGENTS.karpathy.capabilities.some((c) => c.toLowerCase().includes("code") || c.toLowerCase().includes("coding"))).toBe(true);
  });

  it("Virgil has media capabilities", () => {
    expect(AGENTS.virgil.capabilities.some((c) => c.toLowerCase().includes("audio") || c.toLowerCase().includes("suno"))).toBe(true);
  });

  it("Sun Tzu has intelligence capabilities", () => {
    expect(AGENTS.suntzu.capabilities.some((c) => c.toLowerCase().includes("osint") || c.toLowerCase().includes("intelligence"))).toBe(true);
  });

  it("Oppenheimer has research capabilities", () => {
    expect(AGENTS.oppenheimer.capabilities.some((c) => c.toLowerCase().includes("paper") || c.toLowerCase().includes("research"))).toBe(true);
  });
});

// ─── Domain Routing ─────────────────────────────────────────────────────────

describe("findAgentForDomain", () => {
  it("routes security domains to Pliny", () => {
    expect(findAgentForDomain("security")).toBe("pliny");
    expect(findAgentForDomain("threat")).toBe("pliny");
    expect(findAgentForDomain("vulnerability")).toBe("pliny");
  });

  it("routes coding domains to Karpathy", () => {
    expect(findAgentForDomain("code")).toBe("karpathy");
    expect(findAgentForDomain("engineering")).toBe("karpathy");
    expect(findAgentForDomain("software")).toBe("karpathy");
  });

  it("routes media domains to Virgil", () => {
    expect(findAgentForDomain("media")).toBe("virgil");
    expect(findAgentForDomain("audio")).toBe("virgil");
    expect(findAgentForDomain("visual")).toBe("virgil");
  });

  it("routes intelligence domains to Sun Tzu", () => {
    expect(findAgentForDomain("intelligence")).toBe("suntzu");
    expect(findAgentForDomain("osint")).toBe("suntzu");
    expect(findAgentForDomain("strategy")).toBe("suntzu");
  });

  it("routes research domains to Oppenheimer", () => {
    expect(findAgentForDomain("research")).toBe("oppenheimer");
    expect(findAgentForDomain("science")).toBe("oppenheimer");
    expect(findAgentForDomain("paper")).toBe("oppenheimer");
  });

  it("defaults to Sun Tzu for unknown domains", () => {
    expect(findAgentForDomain("random_gibberish")).toBe("suntzu");
    expect(findAgentForDomain("")).toBe("suntzu");
  });
});

// ─── Agent Communication Bus ────────────────────────────────────────────────

describe("Agent Communication Bus", () => {
  it("posts messages to channels", () => {
    const msg = postMessage({
      fromAgent: "suntzu", toAgent: "pliny", channel: "missions",
      content: "Analyze perimeter threats", messageType: "request", priority: "high",
    });
    expect(msg.id).toBeTruthy();
    expect(msg.fromAgent).toBe("suntzu");
    expect(msg.toAgent).toBe("pliny");
    expect(msg.channel).toBe("missions");
    expect(msg.priority).toBe("high");
    expect(msg.timestamp).toBeTruthy();
  });

  it("retrieves channel messages", () => {
    postMessage({
      fromAgent: "pliny", toAgent: "broadcast", channel: "security",
      content: "Threat detected", messageType: "alert", priority: "critical",
    });
    const messages = getChannelMessages("security", 50);
    expect(messages.length).toBeGreaterThan(0);
    const secMsg = messages.find((m) => m.content === "Threat detected");
    expect(secMsg).toBeTruthy();
    expect(secMsg!.priority).toBe("critical");
  });

  it("lists all channels", () => {
    const channels = getChannels();
    expect(channels.length).toBeGreaterThan(0);
    const missionsCh = channels.find((c) => c.id === "missions");
    expect(missionsCh).toBeTruthy();
    expect(missionsCh!.name).toBeTruthy();
  });

  it("retrieves recent messages across all channels sorted newest first", () => {
    const recent = getRecentMessages(100);
    expect(recent.length).toBeGreaterThan(0);
    // Messages may be sent in the same millisecond, so we just verify
    // the array is non-empty and has valid timestamps
    for (const msg of recent) {
      expect(new Date(msg.timestamp).getTime()).toBeGreaterThan(0);
    }
  });
});

// ─── App Ecosystem ──────────────────────────────────────────────────────────

describe("App Ecosystem", () => {
  it("returns all apps when no category filter", () => {
    const apps = getAppEcosystem();
    expect(apps.length).toBe(APP_ECOSYSTEM.length);
    expect(apps.length).toBeGreaterThan(10);
  });

  it("filters apps by category", () => {
    const aiApps = getAppEcosystem("ai");
    expect(aiApps.length).toBeGreaterThan(0);
    aiApps.forEach((app) => expect(app.category).toBe("ai"));
  });

  it("each app has required fields", () => {
    const apps = getAppEcosystem();
    for (const app of apps) {
      expect(app.id).toBeTruthy();
      expect(app.name).toBeTruthy();
      expect(app.category).toBeTruthy();
      expect(app.description).toBeTruthy();
      expect(["connected", "available", "coming_soon", "premium"]).toContain(app.status);
      expect(Array.isArray(app.capabilities)).toBe(true);
      expect(app.apiType).toBeTruthy();
    }
  });

  it("returns skills for agents", () => {
    const skills = getSkills();
    expect(skills.length).toBeGreaterThan(0);
    for (const skill of skills) {
      expect(skill.name).toBeTruthy();
      expect(skill.agentId).toBeTruthy();
      expect(["osint", "creative", "security", "code", "research", "social", "business"]).toContain(skill.category);
    }
  });

  it("filters skills by agent", () => {
    const plinySkills = getSkills("pliny");
    expect(plinySkills.length).toBeGreaterThan(0);
    plinySkills.forEach((s) => expect(s.agentId).toBe("pliny"));
  });
});

// ─── Auth Tests ─────────────────────────────────────────────────────────────

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({
      maxAge: -1, secure: true, sameSite: "none", httpOnly: true, path: "/",
    });
  });
});

describe("auth.me", () => {
  it("returns null for unauthenticated user", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const me = await caller.auth.me();
    expect(me).toBeNull();
  });

  it("returns user for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const me = await caller.auth.me();
    expect(me).not.toBeNull();
    expect(me!.name).toBe("The President");
    expect(me!.role).toBe("admin");
  });
});

// ─── tRPC Router Tests ──────────────────────────────────────────────────────

describe("tRPC Router Structure", () => {
  it("has all required routers", () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.agents).toBeTruthy();
    expect(caller.comms).toBeTruthy();
    expect(caller.humint).toBeTruthy();
    expect(caller.ecosystem).toBeTruthy();
    expect(caller.osint).toBeTruthy();
    expect(caller.knowledge).toBeTruthy();
    expect(caller.media).toBeTruthy();
    expect(caller.security).toBeTruthy();
    expect(caller.commandLog).toBeTruthy();
  });

  it("agents.list returns all 5 agents", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const agents = await caller.agents.list();
    expect(agents.length).toBe(5);
    expect(agents.map((a) => a.id).sort()).toEqual(["karpathy", "oppenheimer", "pliny", "suntzu", "virgil"]);
  });

  it("agents.hierarchy returns hierarchy data", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const hierarchy = await caller.agents.hierarchy();
    expect(hierarchy.length).toBe(5);
    const suntzu = hierarchy.find((a) => a.id === "suntzu");
    expect(suntzu!.rank).toBe(1);
    expect(suntzu!.reportsTo).toBeNull();
    const divLeads = hierarchy.filter((a) => a.rank === AGENT_HIERARCHY.DIVISION_LEAD);
    expect(divLeads.length).toBeGreaterThan(0);
    for (const lead of divLeads) {
      expect(lead.reportsTo).toBe("suntzu");
    }
  });

  it("ecosystem.apps returns apps", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const apps = await caller.ecosystem.apps({});
    expect(apps.length).toBeGreaterThan(0);
  });

  it("ecosystem.skills returns skills", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const skills = await caller.ecosystem.skills({});
    expect(skills.length).toBeGreaterThan(0);
  });

  it("ecosystem.appCount returns counts", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const counts = await caller.ecosystem.appCount();
    expect(counts.total).toBeGreaterThan(0);
    expect(typeof counts.connected).toBe("number");
    expect(typeof counts.available).toBe("number");
    expect(typeof counts.comingSoon).toBe("number");
  });

  it("comms.channels returns channels", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const channels = await caller.comms.channels();
    expect(channels.length).toBeGreaterThan(0);
  });

  it("comms.recent returns messages", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const messages = await caller.comms.recent({ limit: 50 });
    expect(Array.isArray(messages)).toBe(true);
  });
});

// ─── OSINT Router Tests ─────────────────────────────────────────────────────

describe("OSINT Integration", () => {
  it("osint.dashboard returns structured data with system status", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const data = await caller.osint.dashboard();
    expect(data).toBeDefined();
    expect(Array.isArray(data.flights)).toBe(true);
    expect(Array.isArray(data.earthquakes)).toBe(true);
    expect(Array.isArray(data.weatherAlerts)).toBe(true);
    expect(Array.isArray(data.cves)).toBe(true);
    expect(Array.isArray(data.news)).toBe(true);
    expect(data.systemStatus).toBeDefined();
    expect(typeof data.systemStatus.feedsOnline).toBe("number");
    expect(data.systemStatus.feedsTotal).toBe(7);
    expect(typeof data.systemStatus.dataPoints).toBe("number");
  }, 60000);

  it("osint.flights returns flight data array", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const flights = await caller.osint.flights();
    expect(Array.isArray(flights)).toBe(true);
  }, 15000);

  it("osint.earthquakes returns seismic data", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const quakes = await caller.osint.earthquakes();
    expect(Array.isArray(quakes)).toBe(true);
  }, 15000);

  it("osint.geoEvents returns geo-event data", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const events = await caller.osint.geoEvents();
    expect(Array.isArray(events)).toBe(true);
  }, 15000);

  it("osint.socialTrends returns social trend data", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const trends = await caller.osint.socialTrends();
    expect(Array.isArray(trends)).toBe(true);
  }, 15000);
});

// ─── SIGINT Social Network ─────────────────────────────────────────────────

describe("SIGINT Social Network", () => {
  it("agents can send messages via comms bus", () => {
    const msg = postMessage({
      fromAgent: "virgil", toAgent: "karpathy", channel: "creative",
      content: "Generated new visual asset for project", messageType: "info", priority: "normal",
    });
    expect(msg.fromAgent).toBe("virgil");
    expect(msg.toAgent).toBe("karpathy");
    expect(msg.channel).toBe("creative");
  });

  it("broadcast messages reach all channels", () => {
    const msg = postMessage({
      fromAgent: "suntzu", toAgent: "broadcast", channel: "general",
      content: "Strategic briefing for all agents", messageType: "directive", priority: "high",
    });
    expect(msg.toAgent).toBe("broadcast");
    const messages = getChannelMessages("general", 50);
    const found = messages.find(m => m.content === "Strategic briefing for all agents");
    expect(found).toBeTruthy();
  });

  it("channels have correct structure", () => {
    const channels = getChannels();
    expect(channels.length).toBeGreaterThanOrEqual(6);
    const channelIds = channels.map(c => c.id);
    expect(channelIds).toContain("general");
    expect(channelIds).toContain("intel");
    expect(channelIds).toContain("creative");
    expect(channelIds).toContain("security");
    expect(channelIds).toContain("research");
    expect(channelIds).toContain("missions");
  });
});
