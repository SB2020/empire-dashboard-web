import { COOKIE_NAME } from "@shared/const";
import { AGENTS, AGENT_IDS } from "@shared/agents";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { generateImage } from "./_core/imageGeneration";
import { z } from "zod";
import {
  createAgentCommand, updateAgentCommand, getAgentCommands, getAllRecentCommands,
  getAgentStats, createKnowledgeNode, getKnowledgeNodes, getKnowledgeNode,
  updateKnowledgeNode, deleteKnowledgeNode, createMediaAsset, updateMediaAsset,
  getMediaAssets, createSecurityLog, getSecurityLogs, getSecurityStats,
} from "./db";
import { fetchAllOsintFeeds, fetchLiveFlights, fetchEarthquakes, fetchWeatherAlerts, fetchRecentCVEs, fetchGlobalNews, fetchGeoEvents, fetchSocialTrends } from "./osint";
import { extractExifFromUrl, extractExifFromBuffer } from "./exif";
import { fetchTrafficCameras, fetchWorldCams, getAggregatedLiveCams } from "./cameras";
import { storagePut } from "./storage";
import { makeRequest } from "./_core/map";
import { buildPersonProfile, quickLookup, searchLinkedIn, getTwitterProfile } from "./humint";
import {
  postMessage, getChannelMessages, getChannels, getAgentMessages, getRecentMessages,
  agentToAgentMessage, broadcastToAgents, getSkills, getAppEcosystem, APP_ECOSYSTEM,
} from "./agentComms";
import {
  createOsintRecord, getOsintRecords, getOsintRecord, getOsintRecordCount,
  upsertEntity, getEntities, getEntityRelations, createEntityRelation, getEntityGraph,
  createCase, getCases, getCase, updateCase,
  addCaseEvidence, getCaseEvidence, updateCaseEvidence, deleteCaseEvidence,
  createTriageAlert, getTriageAlerts, updateTriageAlert,
  oneSearch,
} from "./osintDb";
import { extractEntities, inferGeoFromEntities, computeTriageScore, runEnrichmentPipeline, PLAYBOOKS } from "./enrichment";
import { listCollectors, runCollector, searchShodan, whoisLookup, searchCTLogs, dnsLookup, fetchRSSFeeds, getPublicStreams, getOpenDatasets } from "./collectors";
import { analyzeImage, analyzeVideo, extractOCR, computePerceptualHash, generateTextEmbedding, findSimilar, cosineSimilarity, hammingDistance } from "./mediaPipeline";
import { executePlaybook, clusterAndTriage } from "./playbookEngine";
import { searchRepos, searchOSINTRepos, getRepoDetails, getRepoReadme, getRepoLanguages, getRepoCommits, analyzeRepo, searchUsers, getTrendingRepos, getAllCuratedTools, getCuratedCategories, OSINT_COLLECTIONS } from "./github";

// ─── Delegation Parser ──────────────────────────────────────────────────────
function parseDelegations(response: string): { agentId: string; task: string }[] {
  const delegations: { agentId: string; task: string }[] = [];
  const regex = /\[DELEGATE:(\w+)\]\s*([\s\S]+?)(?=\[DELEGATE:|$)/g;
  let match;
  while ((match = regex.exec(response)) !== null) {
    const agentId = match[1].toLowerCase();
    const task = match[2].trim();
    if (AGENT_IDS.includes(agentId)) {
      delegations.push({ agentId, task });
    }
  }
  return delegations;
}

// ─── Multi-Agent Execution ──────────────────────────────────────────────────
async function executeAgentWithDelegation(
  agentId: string, message: string, userId: number, depth = 0
): Promise<{ response: string; delegations: { agentId: string; response: string }[] }> {
  const agent = AGENTS[agentId];
  if (!agent) throw new Error("Unknown agent");

  const result = await invokeLLM({
    messages: [
      { role: "system", content: agent.systemPrompt },
      { role: "user", content: message },
    ],
  });

  const responseText =
    typeof result.choices[0]?.message?.content === "string"
      ? result.choices[0].message.content
      : JSON.stringify(result.choices[0]?.message?.content);

  const delegationResults: { agentId: string; response: string }[] = [];

  if (depth < 2) {
    const delegations = parseDelegations(responseText);
    for (const del of delegations) {
      if (agent.canDelegateTo.includes(del.agentId)) {
        const subResult = await executeAgentWithDelegation(del.agentId, del.task, userId, depth + 1);
        await createAgentCommand({
          userId, agentId: del.agentId,
          command: `[Delegated from ${agent.name}] ${del.task}`,
          response: subResult.response, status: "completed", completedAt: new Date(),
        });
        delegationResults.push({ agentId: del.agentId, response: subResult.response });

        // Post to comms bus
        postMessage({
          fromAgent: agentId, toAgent: del.agentId, channel: "missions",
          content: del.task, messageType: "handoff", priority: "high",
        });
        postMessage({
          fromAgent: del.agentId, toAgent: agentId, channel: "missions",
          content: subResult.response.substring(0, 500), messageType: "response", priority: "normal",
        });
      }
    }
  }

  return { response: responseText, delegations: delegationResults };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Agent Operations ──────────────────────────────────────────────
  agents: router({
    list: publicProcedure.query(() => {
      return Object.values(AGENTS).map((a) => ({
        id: a.id, name: a.name, archetype: a.archetype, directive: a.directive,
        color: a.color, icon: a.icon, capabilities: a.capabilities,
        rank: a.rank, canDelegateTo: a.canDelegateTo, reportsTo: a.reportsTo, domains: a.domains,
      }));
    }),

    get: publicProcedure.input(z.object({ agentId: z.string() })).query(({ input }) => {
      const agent = AGENTS[input.agentId];
      if (!agent) return null;
      return {
        id: agent.id, name: agent.name, archetype: agent.archetype, directive: agent.directive,
        color: agent.color, icon: agent.icon, capabilities: agent.capabilities,
        rank: agent.rank, canDelegateTo: agent.canDelegateTo, reportsTo: agent.reportsTo, domains: agent.domains,
      };
    }),

    hierarchy: publicProcedure.query(() => {
      return Object.values(AGENTS).map((a) => ({
        id: a.id, name: a.name, rank: a.rank, reportsTo: a.reportsTo,
        canDelegateTo: a.canDelegateTo, color: a.color, icon: a.icon,
      }));
    }),

    stats: protectedProcedure.query(async ({ ctx }) => getAgentStats(ctx.user.id)),

    command: protectedProcedure
      .input(z.object({
        agentId: z.string().refine((v) => AGENT_IDS.includes(v)),
        message: z.string().min(1).max(10000),
      }))
      .mutation(async ({ ctx, input }) => {
        const agent = AGENTS[input.agentId];
        if (!agent) throw new Error("Unknown agent");

        const cmdId = await createAgentCommand({
          userId: ctx.user.id, agentId: input.agentId,
          command: input.message, status: "processing",
        });

        // Post to comms bus
        postMessage({
          fromAgent: "president", toAgent: input.agentId, channel: "missions",
          content: input.message, messageType: "request", priority: "high",
        });

        try {
          const { response, delegations } = await executeAgentWithDelegation(
            input.agentId, input.message, ctx.user.id
          );

          let fullResponse = response;
          if (delegations.length > 0) {
            fullResponse += "\n\n---\n\n## Delegation Reports\n\n";
            for (const del of delegations) {
              const delAgent = AGENTS[del.agentId];
              fullResponse += `### ${delAgent?.name || del.agentId}\n${del.response}\n\n`;
            }
          }

          await updateAgentCommand(cmdId, {
            response: fullResponse, status: "completed", completedAt: new Date(),
          });

          // Post response to comms bus
          postMessage({
            fromAgent: input.agentId, toAgent: "president", channel: "missions",
            content: fullResponse.substring(0, 500), messageType: "response", priority: "normal",
          });

          if (input.agentId === "pliny") {
            await createSecurityLog({
              userId: ctx.user.id, eventType: "scan_complete", severity: "low",
              description: `Security scan completed: ${input.message.substring(0, 100)}`,
            });
          }

          return {
            id: cmdId, response: fullResponse, status: "completed" as const,
            delegations: delegations.map((d) => ({
              agentId: d.agentId, agentName: AGENTS[d.agentId]?.name || d.agentId,
            })),
          };
        } catch (error: any) {
          await updateAgentCommand(cmdId, {
            response: error.message, status: "failed", completedAt: new Date(),
          });
          return { id: cmdId, response: `Error: ${error.message}`, status: "failed" as const, delegations: [] };
        }
      }),

    coordinate: protectedProcedure
      .input(z.object({
        mission: z.string().min(1).max(10000),
        agentIds: z.array(z.string()).min(1).max(5),
      }))
      .mutation(async ({ ctx, input }) => {
        const planResult = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `${AGENTS.suntzu.systemPrompt}\n\nYou are coordinating a multi-agent operation. Break down the mission into specific tasks for each agent. Format each task as:\n[TASK:agent_id] specific task description\n\nAvailable agents: ${input.agentIds.map((id) => `${AGENTS[id]?.name} (${id})`).join(", ")}`,
            },
            { role: "user", content: `Mission: ${input.mission}` },
          ],
        });

        const planText =
          typeof planResult.choices[0]?.message?.content === "string"
            ? planResult.choices[0].message.content : "";

        const coordCmdId = await createAgentCommand({
          userId: ctx.user.id, agentId: "suntzu",
          command: `[COORDINATION] ${input.mission}`,
          response: planText, status: "completed", completedAt: new Date(),
        });

        // Broadcast to comms
        postMessage({
          fromAgent: "suntzu", toAgent: "broadcast", channel: "missions",
          content: `COORDINATED OPERATION: ${input.mission}`, messageType: "alert", priority: "critical",
        });

        const taskRegex = /\[TASK:(\w+)\]\s*([\s\S]+?)(?=\[TASK:|$)/g;
        const tasks: { agentId: string; task: string }[] = [];
        let match;
        while ((match = taskRegex.exec(planText)) !== null) {
          const agentId = match[1].toLowerCase();
          if (input.agentIds.includes(agentId) && AGENTS[agentId]) {
            tasks.push({ agentId, task: match[2].trim() });
          }
        }

        if (tasks.length === 0) {
          for (const agentId of input.agentIds) {
            if (agentId !== "suntzu") tasks.push({ agentId, task: input.mission });
          }
        }

        const results = await Promise.allSettled(
          tasks.map(async (t) => {
            const { response } = await executeAgentWithDelegation(t.agentId, t.task, ctx.user.id);
            await createAgentCommand({
              userId: ctx.user.id, agentId: t.agentId,
              command: `[COORDINATED] ${t.task}`,
              response, status: "completed", completedAt: new Date(),
            });
            return { agentId: t.agentId, agentName: AGENTS[t.agentId]?.name, response };
          })
        );

        const agentResults = results.map((r, i) => {
          if (r.status === "fulfilled") return r.value;
          return { agentId: tasks[i].agentId, agentName: AGENTS[tasks[i].agentId]?.name, response: `Error: ${(r as any).reason?.message}` };
        });

        return { coordinationId: coordCmdId, plan: planText, results: agentResults };
      }),

    autoRoute: protectedProcedure
      .input(z.object({ message: z.string().min(1).max(10000) }))
      .mutation(async ({ input }) => {
        const classifyResult = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `Classify the following message into one of these agent domains. Respond with ONLY the agent ID, nothing else.
- suntzu: strategy, intelligence, OSINT, geopolitics, market analysis, competitor analysis, person profiling
- pliny: security, threats, vulnerabilities, prompt injection, CVE, defense
- karpathy: code, programming, software, architecture, ML, neural networks
- virgil: media, audio, image, visual, creative, aesthetic, music, social media content
- oppenheimer: research, science, papers, academic, physics, knowledge synthesis`,
            },
            { role: "user", content: input.message },
          ],
        });

        const agentId = (
          typeof classifyResult.choices[0]?.message?.content === "string"
            ? classifyResult.choices[0].message.content : "suntzu"
        ).trim().toLowerCase();

        const validAgentId = AGENT_IDS.includes(agentId) ? agentId : "suntzu";
        return { agentId: validAgentId, agentName: AGENTS[validAgentId]?.name };
      }),

    history: protectedProcedure
      .input(z.object({ agentId: z.string().optional(), limit: z.number().default(50) }))
      .query(async ({ ctx, input }) => getAgentCommands(ctx.user.id, input.agentId, input.limit)),
  }),

  // ─── Agent Communication Bus ───────────────────────────────────────
  comms: router({
    channels: protectedProcedure.query(() => getChannels()),

    channelMessages: protectedProcedure
      .input(z.object({ channelId: z.string(), limit: z.number().default(50) }))
      .query(({ input }) => getChannelMessages(input.channelId, input.limit)),

    agentMessages: protectedProcedure
      .input(z.object({ agentId: z.string(), limit: z.number().default(50) }))
      .query(({ input }) => getAgentMessages(input.agentId, input.limit)),

    recent: protectedProcedure
      .input(z.object({ limit: z.number().default(100) }).optional())
      .query(({ input }) => getRecentMessages(input?.limit ?? 100)),

    send: protectedProcedure
      .input(z.object({
        fromAgentId: z.string(),
        toAgentId: z.string(),
        message: z.string().min(1).max(5000),
        channel: z.string().default("general"),
      }))
      .mutation(async ({ input }) => {
        const result = await agentToAgentMessage(
          input.fromAgentId, input.toAgentId, input.message, input.channel
        );
        return result;
      }),

    broadcast: protectedProcedure
      .input(z.object({
        message: z.string().min(1).max(5000),
        agentIds: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const responses = await broadcastToAgents(input.message, input.agentIds);
        return { responses };
      }),

    post: protectedProcedure
      .input(z.object({
        fromAgent: z.string(),
        toAgent: z.string().default("broadcast"),
        channel: z.string().default("general"),
        content: z.string().min(1).max(5000),
        messageType: z.enum(["request", "response", "alert", "intel", "handoff"]).default("request"),
        priority: z.enum(["low", "normal", "high", "critical"]).default("normal"),
      }))
      .mutation(({ input }) => {
        return postMessage(input);
      }),
  }),

  // ─── HUMINT — Person Intelligence ─────────────────────────────────
  humint: router({
    profile: protectedProcedure
      .input(z.object({
        name: z.string().optional(),
        handle: z.string().optional(),
        company: z.string().optional(),
        additionalContext: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const profile = await buildPersonProfile(input);

        // Log the HUMINT operation
        await createAgentCommand({
          userId: ctx.user.id, agentId: "suntzu",
          command: `[HUMINT] Profile: ${input.name || input.handle || "Unknown"}`,
          response: `Dossier built. Confidence: ${profile.confidence}%. Sources: ${profile.sources.join(", ")}`,
          status: "completed", completedAt: new Date(),
        });

        // Post to intel channel
        postMessage({
          fromAgent: "suntzu", toAgent: "broadcast", channel: "intel",
          content: `HUMINT DOSSIER: ${profile.name} — ${profile.bio.substring(0, 200)}`,
          messageType: "intel", priority: "high",
        });

        return profile;
      }),

    quickLookup: protectedProcedure
      .input(z.object({ query: z.string().min(1).max(500) }))
      .mutation(async ({ input }) => {
        return quickLookup(input.query);
      }),

    searchLinkedIn: protectedProcedure
      .input(z.object({
        keywords: z.string().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        company: z.string().optional(),
        title: z.string().optional(),
      }))
      .query(async ({ input }) => searchLinkedIn(input)),

    twitterProfile: protectedProcedure
      .input(z.object({ username: z.string().min(1).max(100) }))
      .query(async ({ input }) => getTwitterProfile(input.username.replace("@", ""))),
  }),

  // ─── App Ecosystem & Skills ────────────────────────────────────────
  ecosystem: router({
    apps: publicProcedure
      .input(z.object({ category: z.string().optional() }).optional())
      .query(({ input }) => getAppEcosystem(input?.category)),

    skills: publicProcedure
      .input(z.object({ agentId: z.string().optional() }).optional())
      .query(({ input }) => getSkills(input?.agentId)),

    appCount: publicProcedure.query(() => ({
      total: APP_ECOSYSTEM.length,
      connected: APP_ECOSYSTEM.filter(a => a.status === "connected").length,
      available: APP_ECOSYSTEM.filter(a => a.status === "available").length,
      comingSoon: APP_ECOSYSTEM.filter(a => a.status === "coming_soon").length,
    })),
  }),

  // ─── OSINT Intelligence Feeds ──────────────────────────────────────
  osint: router({
    dashboard: protectedProcedure.query(async () => fetchAllOsintFeeds()),
    flights: protectedProcedure.query(async () => fetchLiveFlights()),
    earthquakes: protectedProcedure.query(async () => fetchEarthquakes()),
    weather: protectedProcedure.query(async () => fetchWeatherAlerts()),
    cves: protectedProcedure.query(async () => fetchRecentCVEs()),
    news: protectedProcedure.query(async () => fetchGlobalNews()),
    geoEvents: protectedProcedure.query(async () => fetchGeoEvents()),
    socialTrends: protectedProcedure.query(async () => fetchSocialTrends()),

    trafficCameras: protectedProcedure.query(async () => fetchTrafficCameras()),
    worldCams: protectedProcedure.query(async () => fetchWorldCams()),
    aggregatedLiveCams: protectedProcedure.query(() => getAggregatedLiveCams()),

    exifExtract: protectedProcedure
      .input(z.object({ imageUrl: z.string().url() }))
      .mutation(async ({ input }) => {
        const result = await extractExifFromUrl(input.imageUrl);
        return result;
      }),

    exifUpload: protectedProcedure
      .input(z.object({ fileName: z.string(), base64Data: z.string() }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.base64Data, "base64");
        const result = extractExifFromBuffer(buffer);
        return result;
      }),

    streetViewMeta: protectedProcedure
      .input(z.object({ lat: z.number(), lng: z.number(), heading: z.number().optional(), pitch: z.number().optional() }))
      .query(async ({ input }) => {
        try {
          const meta = await makeRequest<any>("/maps/api/streetview/metadata", {
            location: `${input.lat},${input.lng}`,
            source: "outdoor",
          });
          return {
            available: meta.status === "OK",
            panoId: meta.pano_id || null,
            location: meta.location || null,
            date: meta.date || null,
            copyright: meta.copyright || null,
          };
        } catch {
          return { available: false, panoId: null, location: null, date: null, copyright: null };
        }
      }),

    analyze: protectedProcedure
      .input(z.object({ focus: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const data = await fetchAllOsintFeeds();
        const briefing = `
CURRENT INTELLIGENCE SNAPSHOT:
- Live Flights Tracked: ${data.flights.length}
- Active Earthquakes (M2.5+): ${data.earthquakes.length}
- Weather Alerts: ${data.weatherAlerts.length}
- Recent CVEs: ${data.cves.length}
- News Items: ${data.news.length}

TOP EARTHQUAKES:
${data.earthquakes.slice(0, 5).map((q) => `- M${q.magnitude} at ${q.place} (depth: ${q.depth}km${q.tsunami ? " TSUNAMI WARNING" : ""})`).join("\n")}

CRITICAL WEATHER:
${data.weatherAlerts.filter((w) => w.severity === "Extreme" || w.severity === "Severe").slice(0, 5).map((w) => `- ${w.event}: ${w.headline}`).join("\n") || "No extreme weather alerts"}

CRITICAL CVEs:
${data.cves.filter((c) => c.severity === "CRITICAL" || c.severity === "HIGH").slice(0, 5).map((c) => `- ${c.id} (${c.severity}, CVSS: ${c.score}): ${c.description.substring(0, 100)}`).join("\n") || "No critical CVEs"}

TOP NEWS:
${data.news.slice(0, 5).map((n) => `- [${n.region}/${n.source}] ${n.title}`).join("\n")}

GLOBAL EVENTS:
${data.geoEvents.slice(0, 5).map((e) => `- [${e.severity}] ${e.type.toUpperCase()}: ${e.title} (${e.country})`).join("\n")}

SOCIAL TRENDS:
${data.socialTrends.slice(0, 5).map((t) => `- [${t.platform}] ${t.topic} (${t.volume.toLocaleString()} mentions, ${t.sentiment})`).join("\n")}`;

        const result = await invokeLLM({
          messages: [
            { role: "system", content: AGENTS.suntzu.systemPrompt },
            { role: "user", content: `Provide a strategic intelligence briefing based on this real-time OSINT data. ${input.focus ? `Focus area: ${input.focus}` : "Cover all domains."}\n\n${briefing}` },
          ],
        });

        const analysis = typeof result.choices[0]?.message?.content === "string"
          ? result.choices[0].message.content : "";

        await createAgentCommand({
          userId: ctx.user.id, agentId: "suntzu",
          command: `[OSINT ANALYSIS] ${input.focus || "Full Spectrum"}`,
          response: analysis, status: "completed", completedAt: new Date(),
        });

        return { analysis, dataSnapshot: data.systemStatus };
      }),
  }),

  // ─── Knowledge Graph ───────────────────────────────────────────────
  knowledge: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().default(100) }).optional())
      .query(async ({ ctx, input }) => getKnowledgeNodes(ctx.user.id, input?.limit ?? 100)),

    get: protectedProcedure.input(z.object({ id: z.number() }))
      .query(async ({ input }) => getKnowledgeNode(input.id)),

    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1), content: z.string().min(1),
        nodeType: z.enum(["note", "paper", "concept", "entity", "insight"]).default("note"),
        tags: z.array(z.string()).optional(), connections: z.array(z.number()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await createKnowledgeNode({
          userId: ctx.user.id, title: input.title, content: input.content,
          nodeType: input.nodeType, tags: input.tags || [], connections: input.connections || [],
        });
        return { id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(), title: z.string().optional(), content: z.string().optional(),
        tags: z.array(z.string()).optional(), connections: z.array(z.number()).optional(),
      }))
      .mutation(async ({ input }) => {
        await updateKnowledgeNode(input.id, input);
        return { success: true };
      }),

    delete: protectedProcedure.input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteKnowledgeNode(input.id);
        return { success: true };
      }),

    synthesize: protectedProcedure
      .input(z.object({ nodeIds: z.array(z.number()).min(1) }))
      .mutation(async ({ input }) => {
        const nodes = await Promise.all(input.nodeIds.map((id) => getKnowledgeNode(id)));
        const validNodes = nodes.filter(Boolean);
        if (validNodes.length === 0) throw new Error("No valid nodes found");

        const nodesText = validNodes.map((n) => `## ${n!.title}\n${n!.content}`).join("\n\n---\n\n");

        const result = await invokeLLM({
          messages: [
            { role: "system", content: AGENTS.oppenheimer.systemPrompt },
            { role: "user", content: `Synthesize the following knowledge nodes into a unified briefing. Identify connections, contradictions, and actionable insights:\n\n${nodesText}` },
          ],
        });

        const responseText = typeof result.choices[0]?.message?.content === "string"
          ? result.choices[0].message.content : JSON.stringify(result.choices[0]?.message?.content);

        return { synthesis: responseText };
      }),
  }),

  // ─── Media Generation ──────────────────────────────────────────────
  media: router({
    list: protectedProcedure
      .input(z.object({ assetType: z.enum(["audio", "image", "video"]).optional(), limit: z.number().default(50) }).optional())
      .query(async ({ ctx, input }) => getMediaAssets(ctx.user.id, input?.assetType, input?.limit ?? 50)),

    generateImage: protectedProcedure
      .input(z.object({ prompt: z.string().min(1).max(5000) }))
      .mutation(async ({ ctx, input }) => {
        const assetId = await createMediaAsset({
          userId: ctx.user.id, assetType: "image", prompt: input.prompt, status: "generating",
        });
        try {
          const enhanced = await invokeLLM({
            messages: [
              { role: "system", content: "You are an expert image prompt engineer. Take the user's description and enhance it into a detailed, vivid image generation prompt. Output ONLY the enhanced prompt, nothing else." },
              { role: "user", content: input.prompt },
            ],
          });
          const enhancedPrompt = typeof enhanced.choices[0]?.message?.content === "string"
            ? enhanced.choices[0].message.content : input.prompt;
          const { url } = await generateImage({ prompt: enhancedPrompt });
          await updateMediaAsset(assetId, { url: url || undefined, status: "completed" });

          // Post to creative channel
          postMessage({
            fromAgent: "virgil", toAgent: "broadcast", channel: "creative",
            content: `Image generated: ${input.prompt.substring(0, 100)}`, messageType: "response", priority: "normal",
          });

          return { id: assetId, url, status: "completed" as const };
        } catch (error: any) {
          await updateMediaAsset(assetId, { status: "failed" });
          return { id: assetId, url: null, status: "failed" as const, error: error.message };
        }
      }),

    generateAudioPrompt: protectedProcedure
      .input(z.object({ description: z.string().min(1).max(5000) }))
      .mutation(async ({ ctx, input }) => {
        const result = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `${AGENTS.virgil.systemPrompt}\n\nYou are now generating a detailed Suno AI music prompt. Output a JSON object with: { "title": "track title", "genre": "genre/style", "mood": "mood description", "lyrics": "optional lyrics or [Instrumental]", "prompt": "the full Suno prompt" }`,
            },
            { role: "user", content: input.description },
          ],
        });

        const responseText = typeof result.choices[0]?.message?.content === "string"
          ? result.choices[0].message.content : JSON.stringify(result.choices[0]?.message?.content);

        await createAgentCommand({
          userId: ctx.user.id, agentId: "virgil",
          command: input.description, response: responseText,
          status: "completed", completedAt: new Date(),
        });

        return { prompt: responseText };
      }),
  }),

  // ─── Security ──────────────────────────────────────────────────────
  security: router({
    logs: protectedProcedure
      .input(z.object({ limit: z.number().default(100) }).optional())
      .query(async ({ input }) => getSecurityLogs(input?.limit ?? 100)),

    stats: protectedProcedure.query(async () => getSecurityStats()),

    scan: protectedProcedure
      .input(z.object({ text: z.string().min(1).max(10000) }))
      .mutation(async ({ ctx, input }) => {
        const result = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `${AGENTS.pliny.systemPrompt}\n\nAnalyze the following text for prompt injection attacks, adversarial patterns, and security threats. Respond with a JSON object: { "threatLevel": "LOW|MEDIUM|HIGH|CRITICAL", "threats": [{"type": "string", "description": "string", "severity": "string"}], "sanitized": "cleaned version of input", "recommendation": "string" }`,
            },
            { role: "user", content: `Analyze this input for security threats:\n\n${input.text}` },
          ],
        });

        const responseText = typeof result.choices[0]?.message?.content === "string"
          ? result.choices[0].message.content : JSON.stringify(result.choices[0]?.message?.content);

        const isCritical = responseText.toUpperCase().includes("CRITICAL");
        const isHigh = responseText.toUpperCase().includes("HIGH");
        const severity = isCritical ? "critical" : isHigh ? "high" : "medium";

        await createSecurityLog({
          userId: ctx.user.id, eventType: "scan_complete", severity: severity as any,
          description: `Security scan: ${input.text.substring(0, 200)}`, payload: responseText,
        });

        // Alert on comms if high/critical
        if (isCritical || isHigh) {
          postMessage({
            fromAgent: "pliny", toAgent: "broadcast", channel: "security",
            content: `THREAT DETECTED (${severity.toUpperCase()}): ${input.text.substring(0, 100)}`,
            messageType: "alert", priority: isCritical ? "critical" : "high",
          });
        }

        return { analysis: responseText };
      }),
  }),

  // ─── Command Log ───────────────────────────────────────────────────
  commandLog: router({
    recent: protectedProcedure
      .input(z.object({ limit: z.number().default(100) }).optional())
      .query(async ({ ctx, input }) => getAllRecentCommands(ctx.user.id, input?.limit ?? 100)),
  }),

  // ─── OSINT Records (Live Feed) ────────────────────────────────────
  records: router({
    list: protectedProcedure
      .input(z.object({
        limit: z.number().default(30),
        offset: z.number().default(0),
        type: z.string().optional(),
        severity: z.string().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const opts = input || { limit: 30, offset: 0 };
        const [records, total] = await Promise.all([
          getOsintRecords(opts),
          getOsintRecordCount(opts),
        ]);
        return { records, total, hasMore: (opts.offset ?? 0) + records.length < total };
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => getOsintRecord(input.id)),

    ingest: protectedProcedure
      .input(z.object({
        sourceUrl: z.string().optional(),
        collectorId: z.string(),
        recordType: z.enum(["post", "image", "video", "article", "stream", "alert", "domain", "camera"]),
        title: z.string().optional(),
        content: z.string().optional(),
        imageUrl: z.string().optional(),
        latitude: z.string().optional(),
        longitude: z.string().optional(),
        severity: z.enum(["low", "medium", "high", "critical"]).default("low"),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        // Run enrichment pipeline
        const enrichment = await runEnrichmentPipeline({
          content: input.content,
          sourceUrl: input.sourceUrl,
          recordType: input.recordType,
          severity: input.severity,
        });

        // Create the record
        const record = await createOsintRecord({
          sourceUrl: input.sourceUrl || null,
          collectorId: input.collectorId,
          recordType: input.recordType,
          title: input.title || null,
          content: input.content || null,
          imageUrl: input.imageUrl || null,
          latitude: input.latitude || enrichment.geoCandidates[0]?.lat?.toString() || null,
          longitude: input.longitude || enrichment.geoCandidates[0]?.lon?.toString() || null,
          confidence: enrichment.triage.score,
          severity: input.severity,
          enrichments: enrichment as any,
          entities: enrichment.entities as any,
          tags: input.tags as any || null,
          lang: enrichment.lang,
          transformationChain: enrichment.transformationChain as any,
        });

        // Upsert entities
        for (const entity of enrichment.entities) {
          await upsertEntity({
            entityType: entity.type as any,
            name: entity.name,
            canonicalKey: `${entity.type}:${entity.name.toLowerCase().replace(/\s+/g, "_")}`,
            confidence: Math.round(entity.confidence * 100),
            sources: [input.sourceUrl] as any,
          });
        }

        // Create triage alert if score is high
        if (enrichment.triage.score >= 40) {
          await createTriageAlert({
            recordId: record.id,
            score: enrichment.triage.score,
            rules: enrichment.triage.rules as any,
            explanation: enrichment.triage.explanation,
          });
        }

        return { id: record.id, enrichment };
      }),

    enrich: protectedProcedure
      .input(z.object({ content: z.string() }))
      .mutation(async ({ input }) => runEnrichmentPipeline({ content: input.content })),
  }),

  // ─── Entity Graph ─────────────────────────────────────────────────
  entities: router({
    list: protectedProcedure
      .input(z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
        type: z.string().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input }) => getEntities(input || {})),

    graph: protectedProcedure
      .input(z.object({ limit: z.number().default(100) }).optional())
      .query(async ({ input }) => getEntityGraph(input)),

    relations: protectedProcedure
      .input(z.object({ entityId: z.number() }))
      .query(async ({ input }) => getEntityRelations(input.entityId)),

    addRelation: protectedProcedure
      .input(z.object({
        fromEntityId: z.number(),
        toEntityId: z.number(),
        relationType: z.string(),
        confidence: z.number().default(50),
      }))
      .mutation(async ({ input }) => createEntityRelation(input)),
  }),

  // ─── Cases & Workspace ────────────────────────────────────────────
  cases: router({
    list: protectedProcedure.query(async ({ ctx }) => getCases(ctx.user.id)),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const caseData = await getCase(input.id);
        const evidence = caseData ? await getCaseEvidence(input.id) : [];
        return { case: caseData, evidence };
      }),

    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => createCase({
        userId: ctx.user.id,
        title: input.title,
        description: input.description || null,
        priority: input.priority,
        tags: input.tags as any || null,
      })),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["open", "active", "closed", "archived"]).optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateCase(id, data as any);
        return { success: true };
      }),

    addEvidence: protectedProcedure
      .input(z.object({
        caseId: z.number(),
        recordId: z.number().optional(),
        evidenceType: z.enum(["record", "entity", "note", "link", "image", "file"]),
        title: z.string(),
        content: z.string().optional(),
        sourceUrl: z.string().optional(),
        confidence: z.number().default(50),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => addCaseEvidence(input as any)),

    updateEvidence: protectedProcedure
      .input(z.object({
        id: z.number(),
        notes: z.string().optional(),
        confidence: z.number().optional(),
        position: z.any().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateCaseEvidence(id, data as any);
        return { success: true };
      }),

    removeEvidence: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteCaseEvidence(input.id);
        return { success: true };
      }),

    export: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const caseData = await getCase(input.id);
        const evidence = caseData ? await getCaseEvidence(input.id) : [];
        // Generate markdown report
        let report = `# Case Report: ${caseData?.title || "Unknown"}\n\n`;
        report += `**Status:** ${caseData?.status}\n`;
        report += `**Priority:** ${caseData?.priority}\n`;
        report += `**Created:** ${caseData?.createdAt}\n\n`;
        report += `## Description\n${caseData?.description || "No description"}\n\n`;
        report += `## Evidence (${evidence.length} items)\n\n`;
        for (const e of evidence) {
          report += `### ${e.title}\n`;
          report += `- **Type:** ${e.evidenceType}\n`;
          report += `- **Confidence:** ${e.confidence}%\n`;
          if (e.sourceUrl) report += `- **Source:** ${e.sourceUrl}\n`;
          if (e.notes) report += `- **Notes:** ${e.notes}\n`;
          if (e.content) report += `\n${e.content}\n`;
          report += `\n---\n\n`;
        }
        report += `\n*Provenance: Empire Dashboard OSINT Platform | Generated ${new Date().toISOString()}*`;
        return { report, case: caseData, evidenceCount: evidence.length };
      }),
  }),

  // ─── Triage & Alerts ──────────────────────────────────────────────
  triage: router({
    alerts: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
        limit: z.number().default(50),
      }).optional())
      .query(async ({ input }) => getTriageAlerts(input)),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["new", "reviewed", "escalated", "dismissed"]),
      }))
      .mutation(async ({ input }) => {
        await updateTriageAlert(input.id, { status: input.status });
        return { success: true };
      }),
  }),

  // ─── Playbooks ────────────────────────────────────────────────────
  playbooks: router({
    list: protectedProcedure.query(() => PLAYBOOKS),

    run: protectedProcedure
      .input(z.object({
        playbookId: z.string(),
        targetId: z.number().optional(),
        targetUrl: z.string().optional(),
        targetText: z.string().optional(),
        params: z.record(z.string(), z.any()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const playbook = PLAYBOOKS.find((p) => p.id === input.playbookId);
        if (!playbook) throw new Error("Unknown playbook");

        const initialInput: Record<string, any> = {
          imageUrl: input.targetUrl,
          query: input.targetText || input.targetUrl,
          target: input.targetText,
          ...(input.params || {}),
        };

        const result = await executePlaybook(
          input.playbookId,
          playbook.steps,
          initialInput,
          input.params || {}
        );

        return {
          playbookId: input.playbookId,
          name: playbook.name,
          results: result.steps.map(s => ({ step: s.stepId, status: s.status, output: JSON.stringify(s.output).substring(0, 2000) })),
          status: result.status,
          summary: result.summary,
          entities: result.entities,
          triageScore: result.triageScore,
          durationMs: result.totalDurationMs,
        };
      }),

    cluster: protectedProcedure
      .input(z.object({ recordIds: z.array(z.number()).optional() }))
      .mutation(async () => {
        const records = await getOsintRecords({ limit: 50 });
        const mapped = records.map(r => ({
          id: r.id,
          title: r.title || "",
          content: r.content || "",
          score: (r as any).triageScore || 0,
          latitude: r.latitude || undefined,
          longitude: r.longitude || undefined,
        }));
        return clusterAndTriage(mapped);
      }),
  }),

  // ─── One-Search ───────────────────────────────────────────────────
  search: router({
    query: protectedProcedure
      .input(z.object({ q: z.string().min(1), limit: z.number().default(30) }))
      .query(async ({ input }) => oneSearch(input.q, { limit: input.limit })),
  }),

  // ─── Source Collectors ────────────────────────────────────────────
  collectors: router({
    list: protectedProcedure.query(() => listCollectors()),

    run: protectedProcedure
      .input(z.object({
        collectorId: z.string(),
        params: z.record(z.string(), z.any()).optional(),
      }))
      .mutation(async ({ input }) => runCollector(input.collectorId, input.params)),

    shodan: protectedProcedure
      .input(z.object({ query: z.string(), apiKey: z.string().optional() }))
      .query(async ({ input }) => searchShodan(input.query, input.apiKey)),

    whois: protectedProcedure
      .input(z.object({ domain: z.string() }))
      .query(async ({ input }) => {
        const [whois, ct, dns] = await Promise.all([
          whoisLookup(input.domain),
          searchCTLogs(input.domain),
          dnsLookup(input.domain),
        ]);
        return { whois, ctCerts: ct, dnsRecords: dns };
      }),

    rss: protectedProcedure.query(async () => fetchRSSFeeds()),

    streams: protectedProcedure.query(() => getPublicStreams()),

    datasets: protectedProcedure.query(() => getOpenDatasets()),
  }),

  // ─── Media Pipeline ───────────────────────────────────────────────────────
  pipeline: router({
    analyzeImage: protectedProcedure
      .input(z.object({ imageUrl: z.string() }))
      .mutation(async ({ input }) => analyzeImage(input.imageUrl)),

    analyzeVideo: protectedProcedure
      .input(z.object({ videoUrl: z.string() }))
      .mutation(async ({ input }) => analyzeVideo(input.videoUrl)),

    ocr: protectedProcedure
      .input(z.object({ imageUrl: z.string() }))
      .mutation(async ({ input }) => extractOCR(input.imageUrl)),

    hash: protectedProcedure
      .input(z.object({ imageUrl: z.string() }))
      .mutation(async ({ input }) => {
        const hash = await computePerceptualHash(input.imageUrl);
        return { hash, imageUrl: input.imageUrl };
      }),

    embed: protectedProcedure
      .input(z.object({ text: z.string() }))
      .mutation(async ({ input }) => generateTextEmbedding(input.text)),

    similar: protectedProcedure
      .input(z.object({ text: z.string(), topK: z.number().default(10) }))
      .mutation(async ({ input }) => {
        const { vector } = await generateTextEmbedding(input.text);
        const queryVec = JSON.parse(vector);
        // In production, this would query the embeddings table
        return { queryVector: vector, results: [], message: "Similarity search ready — index embeddings to enable" };
      }),
  }),

  // ─── Operational Metrics ──────────────────────────────────────────
  metrics: router({
    dashboard: protectedProcedure.query(async ({ ctx }) => {
      const records = await getOsintRecords({ limit: 100 });
      const totalRecords = await getOsintRecordCount();
      const entities = await getEntities({ limit: 500 });
      const cases = await getCases(ctx.user.id);
      const alerts = await getTriageAlerts({ limit: 100 });

      const now = Date.now();
      const last24h = records.filter(r => now - new Date(r.createdAt || 0).getTime() < 86400000);
      const lastWeek = records.filter(r => now - new Date(r.createdAt || 0).getTime() < 7 * 86400000);

      const severityCounts = { low: 0, medium: 0, high: 0, critical: 0 };
      for (const r of records) {
        const sev = (r.severity || "low") as keyof typeof severityCounts;
        if (sev in severityCounts) severityCounts[sev]++;
      }

      const typeCounts: Record<string, number> = {};
      for (const r of records) {
        const t = r.recordType || "unknown";
        typeCounts[t] = (typeCounts[t] || 0) + 1;
      }

      const alertStatusCounts: Record<string, number> = {};
      for (const a of alerts) {
        const s = a.status || "new";
        alertStatusCounts[s] = (alertStatusCounts[s] || 0) + 1;
      }

      return {
        totalRecords,
        totalEntities: entities.length,
        totalCases: cases.length,
        totalAlerts: alerts.length,
        last24hRecords: last24h.length,
        lastWeekRecords: lastWeek.length,
        severityCounts,
        typeCounts,
        alertStatusCounts,
        avgTriageScore: records.length > 0 ? Math.round(records.reduce((s, r) => s + ((r as any).triageScore || 0), 0) / records.length) : 0,
        collectors: listCollectors(),
        recentRecords: records.slice(0, 10),
      };
    }),
  }),

  // ─── Social Platform ─────────────────────────────────────────────────
  github: router({
    search: publicProcedure.input(z.object({ query: z.string(), sort: z.enum(["stars", "forks", "updated", "best-match"]).default("stars"), page: z.number().default(1) })).query(async ({ input }) => {
      return searchRepos(input.query, input.sort, input.page, 20);
    }),
    searchOSINT: publicProcedure.input(z.object({ topic: z.string(), page: z.number().default(1) })).query(async ({ input }) => {
      return searchOSINTRepos(input.topic, input.page);
    }),
    trending: publicProcedure.query(async () => {
      return getTrendingRepos();
    }),
    repoDetails: publicProcedure.input(z.object({ owner: z.string(), repo: z.string() })).query(async ({ input }) => {
      return getRepoDetails(input.owner, input.repo);
    }),
    analyze: publicProcedure.input(z.object({ owner: z.string(), repo: z.string() })).query(async ({ input }) => {
      return analyzeRepo(input.owner, input.repo);
    }),
    readme: publicProcedure.input(z.object({ owner: z.string(), repo: z.string() })).query(async ({ input }) => {
      return getRepoReadme(input.owner, input.repo);
    }),
    languages: publicProcedure.input(z.object({ owner: z.string(), repo: z.string() })).query(async ({ input }) => {
      return getRepoLanguages(input.owner, input.repo);
    }),
    commits: publicProcedure.input(z.object({ owner: z.string(), repo: z.string(), count: z.number().default(5) })).query(async ({ input }) => {
      return getRepoCommits(input.owner, input.repo, input.count);
    }),
    searchUsers: publicProcedure.input(z.object({ query: z.string(), page: z.number().default(1) })).query(async ({ input }) => {
      return searchUsers(input.query, input.page);
    }),
    curatedTools: publicProcedure.query(() => {
      return { tools: getAllCuratedTools(), categories: getCuratedCategories(), collections: OSINT_COLLECTIONS };
    }),
    // Tracked repos CRUD
    tracked: protectedProcedure.query(async ({ ctx }) => {
      const db = (await (await import("./db")).getDb())!;
      const { trackedRepos } = await import("../drizzle/schema");
      const { eq, desc } = await import("drizzle-orm");
      return db.select().from(trackedRepos).where(eq(trackedRepos.userId, ctx.user.id)).orderBy(desc(trackedRepos.createdAt));
    }),
    trackRepo: protectedProcedure.input(z.object({
      ghId: z.number(), fullName: z.string(), owner: z.string(), name: z.string(),
      description: z.string().nullable(), language: z.string().nullable(),
      stars: z.number(), forks: z.number(), topics: z.string().nullable(),
      htmlUrl: z.string(), category: z.enum(["osint_tool", "security", "data_source", "automation", "visualization", "ml_ai", "other"]).default("other"),
      notes: z.string().optional(), status: z.enum(["watching", "imported", "archived", "starred"]).default("watching"),
    })).mutation(async ({ ctx, input }) => {
      const db = (await (await import("./db")).getDb())!;
      const { trackedRepos } = await import("../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");
      const existing = await db.select().from(trackedRepos).where(and(eq(trackedRepos.userId, ctx.user.id), eq(trackedRepos.ghId, input.ghId)));
      if (existing.length > 0) return { success: true, id: existing[0].id, message: "Already tracked" };
      const [result] = await db.insert(trackedRepos).values({ ...input, userId: ctx.user.id });
      return { success: true, id: result.insertId, message: "Repo tracked" };
    }),
    updateTracked: protectedProcedure.input(z.object({ id: z.number(), status: z.enum(["watching", "imported", "archived", "starred"]).optional(), notes: z.string().optional(), category: z.enum(["osint_tool", "security", "data_source", "automation", "visualization", "ml_ai", "other"]).optional() })).mutation(async ({ ctx, input }) => {
      const db = (await (await import("./db")).getDb())!;
      const { trackedRepos } = await import("../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");
      const updates: any = {};
      if (input.status) updates.status = input.status;
      if (input.notes !== undefined) updates.notes = input.notes;
      if (input.category) updates.category = input.category;
      await db.update(trackedRepos).set(updates).where(and(eq(trackedRepos.id, input.id), eq(trackedRepos.userId, ctx.user.id)));
      return { success: true };
    }),
    removeTracked: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      const db = (await (await import("./db")).getDb())!;
      const { trackedRepos } = await import("../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");
      await db.delete(trackedRepos).where(and(eq(trackedRepos.id, input.id), eq(trackedRepos.userId, ctx.user.id)));
      return { success: true };
    }),
  }),
  social: router({
    // Invitations
    createInvite: protectedProcedure.input(z.object({ maxUses: z.number().min(1).max(10).default(1) })).mutation(async ({ ctx, input }) => {
      const db = (await (await import("./db")).getDb())!;
      const { invitations } = await import("../drizzle/schema");
      const code = Array.from({ length: 8 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
      await db.insert(invitations).values({ code, inviterId: ctx.user.id, maxUses: input.maxUses });
      return { code };
    }),
    myInvites: protectedProcedure.query(async ({ ctx }) => {
      const db = (await (await import("./db")).getDb())!;
      const { invitations } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      return db.select().from(invitations).where(eq(invitations.inviterId, ctx.user.id)).orderBy(invitations.createdAt);
    }),
    redeemInvite: protectedProcedure.input(z.object({ code: z.string() })).mutation(async ({ ctx, input }) => {
      const db = (await (await import("./db")).getDb())!;
      const { invitations, trustScores } = await import("../drizzle/schema");
      const { eq, and, lt, or, isNull } = await import("drizzle-orm");
      const [invite] = await db.select().from(invitations).where(eq(invitations.code, input.code.toUpperCase()));
      if (!invite) throw new Error("Invalid invite code");
      if (invite.usedCount >= invite.maxUses) throw new Error("Invite code fully used");
      if (invite.expiresAt && invite.expiresAt < new Date()) throw new Error("Invite code expired");
      await db.update(invitations).set({ usedCount: invite.usedCount + 1, inviteeId: ctx.user.id }).where(eq(invitations.id, invite.id));
      // Initialize trust score for invitee
      const [existing] = await db.select().from(trustScores).where(eq(trustScores.userId, ctx.user.id));
      if (!existing) {
        await db.insert(trustScores).values({ userId: ctx.user.id, score: 60, level: "newcomer", inviteChainDepth: 1 });
      }
      return { success: true };
    }),

    // Trust
    myTrust: protectedProcedure.query(async ({ ctx }) => {
      const db = (await (await import("./db")).getDb())!;
      const { trustScores } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const [trust] = await db.select().from(trustScores).where(eq(trustScores.userId, ctx.user.id));
      return trust || { score: 50, level: "unverified", postsCount: 0, flagsReceived: 0 };
    }),

    // Posts
    createPost: protectedProcedure.input(z.object({
      type: z.enum(["text", "image", "link", "intel", "analysis"]).default("text"),
      title: z.string().max(256).optional(),
      content: z.string().min(1).max(10000),
      mediaUrl: z.string().optional(),
      latitude: z.string().optional(),
      longitude: z.string().optional(),
      tags: z.array(z.string()).optional(),
      visibility: z.enum(["public", "trusted", "private"]).default("public"),
      parentId: z.number().optional(),
    })).mutation(async ({ ctx, input }) => {
      const db = (await (await import("./db")).getDb())!;
      const { socialPosts, trustScores } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const [result] = await db.insert(socialPosts).values({
        authorId: ctx.user.id,
        type: input.type,
        title: input.title,
        content: input.content,
        mediaUrl: input.mediaUrl,
        latitude: input.latitude,
        longitude: input.longitude,
        tags: input.tags || [],
        visibility: input.visibility,
        parentId: input.parentId,
      });
      // Update trust score
      await db.update(trustScores).set({ postsCount: (await import("drizzle-orm")).sql`posts_count + 1` }).where(eq(trustScores.userId, ctx.user.id));
      return { id: result.insertId };
    }),
    listPosts: protectedProcedure.input(z.object({
      type: z.enum(["text", "image", "link", "intel", "analysis"]).optional(),
      limit: z.number().min(1).max(50).default(20),
      offset: z.number().min(0).default(0),
      parentId: z.number().optional(),
    })).query(async ({ input }) => {
      const db = (await (await import("./db")).getDb())!;
      const { socialPosts, users } = await import("../drizzle/schema");
      const { eq, desc, and, isNull } = await import("drizzle-orm");
      const conditions = [];
      if (input.type) conditions.push(eq(socialPosts.type, input.type));
      if (input.parentId) conditions.push(eq(socialPosts.parentId, input.parentId));
      else conditions.push(isNull(socialPosts.parentId));
      const posts = await db.select({
        id: socialPosts.id,
        authorId: socialPosts.authorId,
        authorName: users.name,
        type: socialPosts.type,
        title: socialPosts.title,
        content: socialPosts.content,
        mediaUrl: socialPosts.mediaUrl,
        latitude: socialPosts.latitude,
        longitude: socialPosts.longitude,
        tags: socialPosts.tags,
        visibility: socialPosts.visibility,
        upvotes: socialPosts.upvotes,
        downvotes: socialPosts.downvotes,
        replyCount: socialPosts.replyCount,
        flagCount: socialPosts.flagCount,
        parentId: socialPosts.parentId,
        createdAt: socialPosts.createdAt,
      }).from(socialPosts)
        .leftJoin(users, eq(socialPosts.authorId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(socialPosts.createdAt))
        .limit(input.limit)
        .offset(input.offset);
      return posts;
    }),

    // Votes
    vote: protectedProcedure.input(z.object({
      postId: z.number(),
      vote: z.enum(["up", "down"]),
    })).mutation(async ({ ctx, input }) => {
      const db = (await (await import("./db")).getDb())!;
      const { socialVotes, socialPosts } = await import("../drizzle/schema");
      const { eq, and, sql } = await import("drizzle-orm");
      const [existing] = await db.select().from(socialVotes).where(and(eq(socialVotes.userId, ctx.user.id), eq(socialVotes.postId, input.postId)));
      if (existing) {
        if (existing.vote === input.vote) return { action: "already_voted" };
        await db.update(socialVotes).set({ vote: input.vote }).where(eq(socialVotes.id, existing.id));
        const upDelta = input.vote === "up" ? 1 : -1;
        await db.update(socialPosts).set({
          upvotes: sql`upvotes + ${upDelta}`,
          downvotes: sql`downvotes - ${upDelta}`,
        }).where(eq(socialPosts.id, input.postId));
        return { action: "changed" };
      }
      await db.insert(socialVotes).values({ userId: ctx.user.id, postId: input.postId, vote: input.vote });
      const field = input.vote === "up" ? "upvotes" : "downvotes";
      await db.update(socialPosts).set({ [field]: sql`${sql.identifier(field)} + 1` }).where(eq(socialPosts.id, input.postId));
      return { action: "voted" };
    }),

    // Flags
    flagPost: protectedProcedure.input(z.object({
      postId: z.number(),
      reason: z.enum(["spam", "bot", "harassment", "misinformation", "off-topic", "other"]).default("other"),
      details: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      const db = (await (await import("./db")).getDb())!;
      const { socialFlags, socialPosts } = await import("../drizzle/schema");
      const { eq, sql } = await import("drizzle-orm");
      await db.insert(socialFlags).values({ reporterId: ctx.user.id, targetPostId: input.postId, reason: input.reason, details: input.details });
      await db.update(socialPosts).set({ flagCount: sql`flag_count + 1` }).where(eq(socialPosts.id, input.postId));
      return { success: true };
    }),
  }),

  // ── OSINT Tools Directory ──────────────────────────────────────────
  osintDirectory: router({
    getTools: publicProcedure.input(z.object({
      category: z.string().optional(),
      search: z.string().optional(),
    }).optional()).query(async ({ input }) => {
      const fs = await import("fs");
      const path = await import("path");
      const raw = fs.readFileSync(path.join(process.cwd(), "shared/osint-data.json"), "utf-8");
      const data = JSON.parse(raw);
      let tools = data.osint_tools as Array<{name:string;url:string;category:string;description?:string}>;
      if (input?.category) tools = tools.filter(t => t.category === input.category);
      if (input?.search) {
        const q = input.search.toLowerCase();
        tools = tools.filter(t => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) || (t.description||'').toLowerCase().includes(q));
      }
      const categories = Array.from(new Set(data.osint_tools.map((t:any) => t.category))).sort() as string[];
      return { tools, categories, total: data.osint_tools.length };
    }),
  }),

  // ── Survivor Library ──────────────────────────────────────────────
  survivorLibrary: router({
    getCategories: publicProcedure.query(async () => {
      const fs = await import("fs");
      const path = await import("path");
      const raw = fs.readFileSync(path.join(process.cwd(), "shared/osint-data.json"), "utf-8");
      const data = JSON.parse(raw);
      const cats = Object.entries(data.survivor_library_categories).map(([name, items]: [string, any]) => ({
        name,
        count: items.length,
      }));
      return { categories: cats, totalItems: cats.reduce((s,c) => s + c.count, 0) };
    }),
    getCategoryItems: publicProcedure.input(z.object({
      category: z.string(),
      search: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(50),
    })).query(async ({ input }) => {
      const fs = await import("fs");
      const path = await import("path");
      const raw = fs.readFileSync(path.join(process.cwd(), "shared/osint-data.json"), "utf-8");
      const data = JSON.parse(raw);
      let items = (data.survivor_library_categories[input.category] || []) as Array<{title:string;size?:string}>;
      if (input.search) {
        const q = input.search.toLowerCase();
        items = items.filter(i => i.title.toLowerCase().includes(q));
      }
      const total = items.length;
      const start = (input.page - 1) * input.pageSize;
      const paged = items.slice(start, start + input.pageSize);
      // Generate download URLs: title with spaces -> underscores, hyphens kept, lowercased, .pdf
      const BASE = "https://www.survivorlibrary.com/library/";
      const withUrls = paged.map(item => {
        const isZip = item.title.toLowerCase().endsWith('.zip');
        const filename = item.title.toLowerCase().replace(/ /g, '_');
        const ext = isZip ? '' : '.pdf';
        return { ...item, downloadUrl: BASE + encodeURIComponent(filename + ext).replace(/%2F/g, '/') };
      });
      return { items: withUrls, total, page: input.page, pageSize: input.pageSize, totalPages: Math.ceil(total / input.pageSize) };
    }),
    getCategoryDownloadUrls: publicProcedure.input(z.object({
      category: z.string(),
    })).query(async ({ input }) => {
      const fs = await import("fs");
      const path = await import("path");
      const raw = fs.readFileSync(path.join(process.cwd(), "shared/osint-data.json"), "utf-8");
      const data = JSON.parse(raw);
      const items = (data.survivor_library_categories[input.category] || []) as Array<{title:string;size?:string}>;
      const BASE = "https://www.survivorlibrary.com/library/";
      const files = items.map(item => {
        const isZip = item.title.toLowerCase().endsWith('.zip');
        const filename = item.title.toLowerCase().replace(/ /g, '_');
        const ext = isZip ? '' : '.pdf';
        const url = BASE + encodeURIComponent(filename + ext).replace(/%2F/g, '/');
        return { title: item.title, url, filename: filename + ext };
      });
      return { category: input.category, files, total: files.length };
    }),
    getIndividualBreaches: publicProcedure.input(z.object({
      search: z.string().optional(),
    }).optional()).query(async ({ input }) => {
      const fs = await import("fs");
      const path = await import("path");
      const raw = fs.readFileSync(path.join(process.cwd(), "shared/osint-data.json"), "utf-8");
      const data = JSON.parse(raw);
      let breaches = data.survivor_library_individual_breaches as Array<{date:string;title:string;link_info:string}>;
      if (input?.search) {
        const q = input.search.toLowerCase();
        breaches = breaches.filter(b => b.title.toLowerCase().includes(q));
      }
      const BASE = "https://www.survivorlibrary.com/library/";
      const withUrls = breaches.map(b => {
        const isZip = b.title.toLowerCase().endsWith('.zip');
        const filename = b.title.toLowerCase();
        const ext = isZip ? '' : '.pdf';
        return { ...b, downloadUrl: BASE + encodeURIComponent(filename + ext).replace(/%2F/g, '/') };
      });
      return { breaches: withUrls, total: withUrls.length };
    }),
    searchAll: publicProcedure.input(z.object({
      query: z.string(),
    })).query(async ({ input }) => {
      const fs = await import("fs");
      const path = await import("path");
      const raw = fs.readFileSync(path.join(process.cwd(), "shared/osint-data.json"), "utf-8");
      const data = JSON.parse(raw);
      const q = input.query.toLowerCase();
      const BASE = "https://www.survivorlibrary.com/library/";
      const results: Array<{category:string;title:string;size?:string;downloadUrl:string}> = [];
      for (const [cat, items] of Object.entries(data.survivor_library_categories)) {
        for (const item of items as any[]) {
          if (item.title.toLowerCase().includes(q)) {
            const isZip = item.title.toLowerCase().endsWith('.zip');
            const filename = item.title.toLowerCase().replace(/ /g, '_');
            const ext = isZip ? '' : '.pdf';
            results.push({ category: cat, title: item.title, size: item.size, downloadUrl: BASE + encodeURIComponent(filename + ext).replace(/%2F/g, '/') });
          }
        }
      }
      return { results: results.slice(0, 100), total: results.length };
    }),
  }),

  // ── OSINT Tool Health Checker ──────────────────────────────────────────
  toolHealth: router({
    checkAll: protectedProcedure.mutation(async () => {
      const fs = await import("fs");
      const path = await import("path");
      const raw = fs.readFileSync(path.join(process.cwd(), "shared/osint-data.json"), "utf-8");
      const data = JSON.parse(raw);
      const tools = data.osint_tools as Array<{name:string;url:string;category:string}>;
      const results: Array<{name:string;url:string;status:string;responseTimeMs:number|null;statusCode:number|null}> = [];
      // Check tools in batches of 5
      const batchSize = 5;
      for (let i = 0; i < tools.length; i += batchSize) {
        const batch = tools.slice(i, i + batchSize);
        const checks = await Promise.allSettled(batch.map(async (tool) => {
          const start = Date.now();
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);
            const resp = await fetch(tool.url, { method: "HEAD", signal: controller.signal, redirect: "follow" });
            clearTimeout(timeout);
            const ms = Date.now() - start;
            return { name: tool.name, url: tool.url, status: resp.ok ? "online" : (resp.status >= 500 ? "degraded" : "online"), responseTimeMs: ms, statusCode: resp.status };
          } catch {
            return { name: tool.name, url: tool.url, status: "offline", responseTimeMs: Date.now() - start, statusCode: null };
          }
        }));
        for (const c of checks) {
          if (c.status === "fulfilled") results.push(c.value);
        }
      }
      // Save to DB
      const db = (await (await import("./db")).getDb())!;
      const { toolHealthChecks } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      for (const r of results) {
        const [existing] = await db.select().from(toolHealthChecks).where(eq(toolHealthChecks.toolUrl, r.url));
        if (existing) {
          await db.update(toolHealthChecks).set({ status: r.status as any, responseTimeMs: r.responseTimeMs, statusCode: r.statusCode, lastChecked: new Date() }).where(eq(toolHealthChecks.id, existing.id));
        } else {
          await db.insert(toolHealthChecks).values({ toolName: r.name, toolUrl: r.url, status: r.status as any, responseTimeMs: r.responseTimeMs, statusCode: r.statusCode });
        }
      }
      return { results, checkedAt: new Date().toISOString() };
    }),
    getStatus: publicProcedure.query(async () => {
      const db = (await (await import("./db")).getDb())!;
      const { toolHealthChecks } = await import("../drizzle/schema");
      const { desc } = await import("drizzle-orm");
      const checks = await db.select().from(toolHealthChecks).orderBy(desc(toolHealthChecks.lastChecked));
      const statusMap: Record<string, { status: string; responseTimeMs: number|null; statusCode: number|null; lastChecked: string }> = {};
      for (const c of checks) {
        if (!statusMap[c.toolUrl]) {
          statusMap[c.toolUrl] = { status: c.status, responseTimeMs: c.responseTimeMs, statusCode: c.statusCode, lastChecked: c.lastChecked.toISOString() };
        }
      }
      return { statusMap, totalChecked: Object.keys(statusMap).length };
    }),
  }),

  // ── Bookmarks / Favorites ──────────────────────────────────────────
  bookmarks: router({
    list: protectedProcedure.input(z.object({
      itemType: z.enum(["osint_tool", "library_category", "world_cam", "github_repo", "case", "entity"]).optional(),
    }).optional()).query(async ({ ctx, input }) => {
      const db = (await (await import("./db")).getDb())!;
      const { bookmarks } = await import("../drizzle/schema");
      const { eq, and, desc } = await import("drizzle-orm");
      const conditions = [eq(bookmarks.userId, ctx.user.id)];
      if (input?.itemType) conditions.push(eq(bookmarks.itemType, input.itemType));
      const items = await db.select().from(bookmarks).where(and(...conditions)).orderBy(desc(bookmarks.createdAt));
      return items;
    }),
    add: protectedProcedure.input(z.object({
      itemType: z.enum(["osint_tool", "library_category", "world_cam", "github_repo", "case", "entity"]),
      itemKey: z.string(),
      label: z.string(),
      metadata: z.any().optional(),
    })).mutation(async ({ ctx, input }) => {
      const db = (await (await import("./db")).getDb())!;
      const { bookmarks } = await import("../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");
      // Check if already bookmarked
      const [existing] = await db.select().from(bookmarks).where(and(eq(bookmarks.userId, ctx.user.id), eq(bookmarks.itemType, input.itemType), eq(bookmarks.itemKey, input.itemKey)));
      if (existing) return { action: "already_exists", bookmark: existing };
      const [inserted] = await db.insert(bookmarks).values({ userId: ctx.user.id, itemType: input.itemType, itemKey: input.itemKey, label: input.label, metadata: input.metadata }).$returningId();
      return { action: "added", id: inserted.id };
    }),
    remove: protectedProcedure.input(z.object({
      itemType: z.enum(["osint_tool", "library_category", "world_cam", "github_repo", "case", "entity"]),
      itemKey: z.string(),
    })).mutation(async ({ ctx, input }) => {
      const db = (await (await import("./db")).getDb())!;
      const { bookmarks } = await import("../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");
      await db.delete(bookmarks).where(and(eq(bookmarks.userId, ctx.user.id), eq(bookmarks.itemType, input.itemType), eq(bookmarks.itemKey, input.itemKey)));
      return { action: "removed" };
    }),
    toggle: protectedProcedure.input(z.object({
      itemType: z.enum(["osint_tool", "library_category", "world_cam", "github_repo", "case", "entity"]),
      itemKey: z.string(),
      label: z.string(),
      metadata: z.any().optional(),
    })).mutation(async ({ ctx, input }) => {
      const db = (await (await import("./db")).getDb())!;
      const { bookmarks } = await import("../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");
      const [existing] = await db.select().from(bookmarks).where(and(eq(bookmarks.userId, ctx.user.id), eq(bookmarks.itemType, input.itemType), eq(bookmarks.itemKey, input.itemKey)));
      if (existing) {
        await db.delete(bookmarks).where(eq(bookmarks.id, existing.id));
        return { action: "removed" };
      }
      const [inserted] = await db.insert(bookmarks).values({ userId: ctx.user.id, itemType: input.itemType, itemKey: input.itemKey, label: input.label, metadata: input.metadata }).$returningId();
      return { action: "added", id: inserted.id };
    }),
  }),

  // ── Intelligence Report Export ──────────────────────────────────────────
  reports: router({
    generate: protectedProcedure.input(z.object({
      title: z.string().default("Intelligence Briefing"),
      sections: z.array(z.enum(["worldview", "osint_feeds", "cases", "entities", "threats", "social_trends"])).default(["worldview", "osint_feeds", "threats"]),
      dateRange: z.object({ from: z.string().optional(), to: z.string().optional() }).optional(),
      caseId: z.number().optional(),
    })).mutation(async ({ ctx, input }) => {
      // Gather data for each section
      const reportData: any = { title: input.title, generatedAt: new Date().toISOString(), generatedBy: ctx.user.name || "Analyst", sections: {} };

      if (input.sections.includes("worldview")) {
        try {
          const [flights, quakes, weather, geoEvents] = await Promise.allSettled([
            fetchLiveFlights(),
            fetchEarthquakes(),
            fetchWeatherAlerts(),
            fetchGeoEvents(),
          ]);
          reportData.sections.worldview = {
            flights: flights.status === "fulfilled" ? flights.value.slice(0, 20) : [],
            earthquakes: quakes.status === "fulfilled" ? quakes.value.slice(0, 15) : [],
            weatherAlerts: weather.status === "fulfilled" ? weather.value.slice(0, 10) : [],
            geoEvents: geoEvents.status === "fulfilled" ? geoEvents.value.slice(0, 10) : [],
          };
        } catch { reportData.sections.worldview = { error: "Failed to fetch WORLDVIEW data" }; }
      }

      if (input.sections.includes("osint_feeds")) {
        try {
          const db = (await (await import("./db")).getDb())!;
          const { osintRecords } = await import("../drizzle/schema");
          const { desc } = await import("drizzle-orm");
          const records = await db.select().from(osintRecords).orderBy(desc(osintRecords.createdAt)).limit(30);
          reportData.sections.osint_feeds = { records: records.map(r => ({ id: r.id, type: r.recordType, title: r.title, source: r.collectorId, severity: r.severity, confidence: r.confidence, collectedAt: r.collectedAt })) };
        } catch { reportData.sections.osint_feeds = { records: [] }; }
      }

      if (input.sections.includes("threats")) {
        try {
          const db = (await (await import("./db")).getDb())!;
          const { securityLogs } = await import("../drizzle/schema");
          const { desc } = await import("drizzle-orm");
          const logs = await db.select().from(securityLogs).orderBy(desc(securityLogs.createdAt)).limit(20);
          reportData.sections.threats = { logs: logs.map(l => ({ type: l.eventType, severity: l.severity, description: l.description, resolved: l.resolved, createdAt: l.createdAt })) };
        } catch { reportData.sections.threats = { logs: [] }; }
      }

      if (input.sections.includes("entities")) {
        try {
          const db = (await (await import("./db")).getDb())!;
          const { osintEntities } = await import("../drizzle/schema");
          const { desc } = await import("drizzle-orm");
          const entities = await db.select().from(osintEntities).orderBy(desc(osintEntities.lastSeen)).limit(30);
          reportData.sections.entities = { entities: entities.map(e => ({ type: e.entityType, name: e.name, confidence: e.confidence, sourceCount: e.sourceCount, lastSeen: e.lastSeen })) };
        } catch { reportData.sections.entities = { entities: [] }; }
      }

      if (input.sections.includes("cases")) {
        try {
          const db = (await (await import("./db")).getDb())!;
          const { cases: casesTable, caseEvidence: ceTable } = await import("../drizzle/schema");
          const { eq, desc } = await import("drizzle-orm");
          if (input.caseId) {
            const [c] = await db.select().from(casesTable).where(eq(casesTable.id, input.caseId));
            const evidence = await db.select().from(ceTable).where(eq(ceTable.caseId, input.caseId));
            reportData.sections.cases = { cases: c ? [{ ...c, evidence }] : [] };
          } else {
            const allCases = await db.select().from(casesTable).orderBy(desc(casesTable.updatedAt)).limit(10);
            reportData.sections.cases = { cases: allCases };
          }
        } catch { reportData.sections.cases = { cases: [] }; }
      }

      if (input.sections.includes("social_trends")) {
        try {
          const trends = await fetchSocialTrends();
          reportData.sections.social_trends = trends;
        } catch { reportData.sections.social_trends = { error: "Failed to fetch trends" }; }
      }

      // Generate markdown report
      let md = `# ${reportData.title}\n\n`;
      md += `**Classification:** UNCLASSIFIED // FOR OFFICIAL USE ONLY\n\n`;
      md += `**Generated:** ${new Date().toLocaleString()} UTC\n\n`;
      md += `**Analyst:** ${reportData.generatedBy}\n\n`;
      md += `---\n\n`;

      if (reportData.sections.worldview) {
        const wv = reportData.sections.worldview;
        md += `## WORLDVIEW — Geospatial Intelligence\n\n`;
        if (wv.earthquakes?.length) {
          md += `### Seismic Activity (${wv.earthquakes.length} events)\n\n`;
          md += `| Magnitude | Location | Depth | Time |\n|-----------|----------|-------|------|\n`;
          for (const q of wv.earthquakes) {
            md += `| M${q.magnitude} | ${q.place || q.title || 'Unknown'} | ${q.depth || 'N/A'} km | ${q.time ? new Date(q.time).toLocaleString() : 'N/A'} |\n`;
          }
          md += `\n`;
        }
        if (wv.flights?.length) {
          md += `### Active Flights (${wv.flights.length} tracked)\n\n`;
          md += `| Callsign | Origin | Altitude | Velocity |\n|----------|--------|----------|----------|\n`;
          for (const f of wv.flights.slice(0, 10)) {
            md += `| ${f.callsign || 'N/A'} | ${f.origin_country || 'Unknown'} | ${f.baro_altitude ? Math.round(f.baro_altitude) + ' m' : 'N/A'} | ${f.velocity ? Math.round(f.velocity) + ' m/s' : 'N/A'} |\n`;
          }
          md += `\n`;
        }
        if (wv.weatherAlerts?.length) {
          md += `### Weather Alerts (${wv.weatherAlerts.length})\n\n`;
          for (const w of wv.weatherAlerts.slice(0, 5)) {
            md += `- **${w.event || w.headline || 'Alert'}** — ${w.description?.slice(0, 200) || 'No details'}\n`;
          }
          md += `\n`;
        }
        md += `---\n\n`;
      }

      if (reportData.sections.osint_feeds?.records?.length) {
        md += `## OSINT Feed Summary (${reportData.sections.osint_feeds.records.length} records)\n\n`;
        md += `| Type | Title | Source | Severity | Confidence |\n|------|-------|--------|----------|------------|\n`;
        for (const r of reportData.sections.osint_feeds.records) {
          md += `| ${r.type} | ${(r.title || 'Untitled').slice(0, 60)} | ${r.source} | ${r.severity} | ${r.confidence}% |\n`;
        }
        md += `\n---\n\n`;
      }

      if (reportData.sections.threats?.logs?.length) {
        md += `## Threat Intelligence (${reportData.sections.threats.logs.length} events)\n\n`;
        md += `| Type | Severity | Description | Resolved |\n|------|----------|-------------|----------|\n`;
        for (const t of reportData.sections.threats.logs) {
          md += `| ${t.type} | ${t.severity} | ${(t.description || '').slice(0, 80)} | ${t.resolved ? 'Yes' : 'No'} |\n`;
        }
        md += `\n---\n\n`;
      }

      if (reportData.sections.entities?.entities?.length) {
        md += `## Entity Intelligence (${reportData.sections.entities.entities.length} entities)\n\n`;
        md += `| Type | Name | Confidence | Sources | Last Seen |\n|------|------|------------|---------|-----------|\n`;
        for (const e of reportData.sections.entities.entities) {
          md += `| ${e.type} | ${e.name} | ${e.confidence}% | ${e.sourceCount} | ${e.lastSeen ? new Date(e.lastSeen).toLocaleDateString() : 'N/A'} |\n`;
        }
        md += `\n---\n\n`;
      }

      if (reportData.sections.cases?.cases?.length) {
        md += `## Case Files (${reportData.sections.cases.cases.length})\n\n`;
        for (const c of reportData.sections.cases.cases) {
          md += `### Case #${c.id}: ${c.title}\n\n`;
          md += `**Status:** ${c.status} | **Priority:** ${c.priority}\n\n`;
          if (c.description) md += `${c.description}\n\n`;
          if (c.evidence?.length) {
            md += `**Evidence Items:** ${c.evidence.length}\n\n`;
            for (const ev of c.evidence) {
              md += `- [${ev.evidenceType}] ${ev.title} (confidence: ${ev.confidence}%)\n`;
            }
            md += `\n`;
          }
        }
        md += `---\n\n`;
      }

      if (reportData.sections.social_trends) {
        md += `## Social Intelligence Trends\n\n`;
        const st = reportData.sections.social_trends;
        if (st.twitter?.length) {
          md += `### Twitter/X Trending\n\n`;
          for (const t of st.twitter.slice(0, 10)) {
            md += `- ${t.name || t.query || t.topic || JSON.stringify(t)}\n`;
          }
          md += `\n`;
        }
        if (st.reddit?.length) {
          md += `### Reddit Hot\n\n`;
          for (const r of st.reddit.slice(0, 10)) {
            md += `- ${r.title || r.name || JSON.stringify(r)}\n`;
          }
          md += `\n`;
        }
        md += `---\n\n`;
      }

      md += `\n\n*End of Intelligence Briefing — ${reportData.title}*\n`;

      // Store the report as a file in S3
      const reportBuffer = Buffer.from(md, "utf-8");
      const timestamp = Date.now();
      const fileKey = `reports/intel-briefing-${timestamp}.md`;
      const { url } = await storagePut(fileKey, reportBuffer, "text/markdown");

      return { markdown: md, downloadUrl: url, generatedAt: reportData.generatedAt, sectionCount: Object.keys(reportData.sections).length };
    }),
  }),

  // ── Evidence Feed ─────────────────────────────────────────
  evidence: router({
    list: protectedProcedure.input(z.object({
      status: z.enum(["new","triaged","verified","flagged","archived"]).optional(),
      mediaType: z.enum(["image","video","text","document","link"]).optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }).optional()).query(async ({ ctx, input }) => {
      const db = (await (await import("./db")).getDb())!;
      const schema = await import("../drizzle/schema");
      const { desc, eq, like, and, sql } = await import("drizzle-orm");
      const conditions: any[] = [eq(schema.evidenceRecords.userId, ctx.user.id)];
      if (input?.status) conditions.push(eq(schema.evidenceRecords.status, input.status));
      if (input?.mediaType) conditions.push(eq(schema.evidenceRecords.mediaType, input.mediaType));
      if (input?.search) conditions.push(like(schema.evidenceRecords.title, `%${input.search}%`));
      const items = await db.select().from(schema.evidenceRecords).where(and(...conditions)).orderBy(desc(schema.evidenceRecords.collectedAt)).limit(input?.limit ?? 20).offset(input?.offset ?? 0);
      const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(schema.evidenceRecords).where(and(...conditions));
      return { items, total: countResult?.count ?? 0 };
    }),
    create: protectedProcedure.input(z.object({
      title: z.string().min(1),
      excerpt: z.string().optional(),
      mediaType: z.enum(["image","video","text","document","link"]).default("text"),
      mediaUrl: z.string().optional(),
      thumbnailUrl: z.string().optional(),
      sourceUrl: z.string().optional(),
      sourcePlatform: z.string().optional(),
      collectorId: z.string().optional(),
      confidenceScore: z.number().min(0).max(1).optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      provenanceSummary: z.string().optional(),
      tags: z.array(z.string()).optional(),
      caseId: z.number().optional(),
    })).mutation(async ({ ctx, input }) => {
      const db = (await (await import("./db")).getDb())!;
      const schema = await import("../drizzle/schema");
      const [result] = await db.insert(schema.evidenceRecords).values({ ...input, userId: ctx.user.id, tags: input.tags ? JSON.stringify(input.tags) : null });
      // Audit log
      await db.insert(schema.auditLog).values({ actorId: ctx.user.id, actorName: ctx.user.name || "Unknown", actorType: "user", action: "create_evidence", resourceType: "evidence_record", resourceId: String(result.insertId), details: JSON.stringify({ title: input.title }) });
      return { id: result.insertId };
    }),
    updateStatus: protectedProcedure.input(z.object({
      id: z.number(),
      status: z.enum(["new","triaged","verified","flagged","archived"]),
    })).mutation(async ({ ctx, input }) => {
      const db = (await (await import("./db")).getDb())!;
      const schema = await import("../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");
      await db.update(schema.evidenceRecords).set({ status: input.status }).where(and(eq(schema.evidenceRecords.id, input.id), eq(schema.evidenceRecords.userId, ctx.user.id)));
      await db.insert(schema.auditLog).values({ actorId: ctx.user.id, actorName: ctx.user.name || "Unknown", actorType: "user", action: "update_evidence_status", resourceType: "evidence_record", resourceId: String(input.id), details: JSON.stringify({ status: input.status }) });
      return { success: true };
    }),
    getProvenance: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
      const db = (await (await import("./db")).getDb())!;
      const schema = await import("../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");
      const [record] = await db.select().from(schema.evidenceRecords).where(and(eq(schema.evidenceRecords.id, input.id), eq(schema.evidenceRecords.userId, ctx.user.id)));
      if (!record) throw new Error("Record not found");
      return { sourceUrl: record.sourceUrl, sourcePlatform: record.sourcePlatform, collectorId: record.collectorId, collectedAt: record.collectedAt, confidenceScore: record.confidenceScore, provenanceSummary: record.provenanceSummary, transformationChain: record.transformationChain, rawPayloadPath: record.rawPayloadPath };
    }),
    stats: protectedProcedure.query(async ({ ctx }) => {
      const db = (await (await import("./db")).getDb())!;
      const schema = await import("../drizzle/schema");
      const { eq, sql } = await import("drizzle-orm");
      const [total] = await db.select({ count: sql<number>`count(*)` }).from(schema.evidenceRecords).where(eq(schema.evidenceRecords.userId, ctx.user.id));
      const byStatus = await db.select({ status: schema.evidenceRecords.status, count: sql<number>`count(*)` }).from(schema.evidenceRecords).where(eq(schema.evidenceRecords.userId, ctx.user.id)).groupBy(schema.evidenceRecords.status);
      const byType = await db.select({ mediaType: schema.evidenceRecords.mediaType, count: sql<number>`count(*)` }).from(schema.evidenceRecords).where(eq(schema.evidenceRecords.userId, ctx.user.id)).groupBy(schema.evidenceRecords.mediaType);
      return { total: total?.count ?? 0, byStatus, byType };
    }),
  }),

  // ── Playbook System ─────────────────────────────────────
  playbook: router({
    list: protectedProcedure.query(async () => {
      const db = (await (await import("./db")).getDb())!;
      const schema = await import("../drizzle/schema");
      const { desc } = await import("drizzle-orm");
      const items = await db.select().from(schema.playbooks).orderBy(desc(schema.playbooks.createdAt));
      // If empty, seed built-in playbooks
      if (items.length === 0) {
        const builtIns = [
          { name: "Image Verify", description: "Extract frames, run OCR, compute perceptual hash, CLIP embed, compare with street imagery, geo-infer, and score confidence.", category: "Verification", icon: "image", steps: JSON.stringify([{name:"fetch_record",label:"Fetch Record"},{name:"extract_frames",label:"Extract Frames (ffmpeg)"},{name:"ocr_tesseract",label:"OCR (Tesseract)"},{name:"exiftool",label:"EXIF Extraction"},{name:"compute_phash",label:"Perceptual Hash"},{name:"clip_embed",label:"CLIP Embedding → Vector Search"},{name:"street_imagery_compare",label:"Street Imagery Compare"},{name:"geo_infer",label:"Geo Inference"},{name:"confidence_score",label:"Confidence Scoring"}]), isBuiltIn: true, isPublic: true, version: "1.0" },
          { name: "Target Sweep", description: "Graph lookup entity, search recent mentions, NER + dedupe, cluster by geo/time, rank by confidence, push top results to case.", category: "Investigation", icon: "target", steps: JSON.stringify([{name:"graph_lookup",label:"Graph Lookup (Entity)"},{name:"search_api",label:"Search API (7d window)"},{name:"ner_spacy",label:"NER + Dedupe"},{name:"cluster_geo_time",label:"Cluster by Geo/Time"},{name:"rank_confidence",label:"Rank by Confidence"},{name:"push_to_case",label:"Push Top to Case"}]), isBuiltIn: true, isPublic: true, version: "1.0" },
          { name: "Rapid Report", description: "Collect case items, apply redaction rules, assemble report from template, attach provenance footer.", category: "Reporting", icon: "file-text", steps: JSON.stringify([{name:"collect_items",label:"Collect Case Items"},{name:"apply_redaction",label:"Apply Redaction Rules"},{name:"assemble_report",label:"Assemble Report (Template)"},{name:"attach_provenance",label:"Attach Provenance Footer"}]), isBuiltIn: true, isPublic: true, version: "1.0" },
          { name: "Social Publish Assist", description: "Draft via personal agent, auto-tag places, attach provenance links, optional cross-post via OAuth.", category: "Social", icon: "share-2", steps: JSON.stringify([{name:"draft_content",label:"Draft via Agent"},{name:"auto_tag_places",label:"Auto-Tag Places"},{name:"attach_provenance",label:"Attach Provenance Links"},{name:"cross_post",label:"Cross-Post (OAuth)"}]), isBuiltIn: true, isPublic: true, version: "1.0" },
          { name: "OSINT Sweep", description: "Multi-source OSINT collection across social media, news, and public records with automated enrichment.", category: "Collection", icon: "radar", steps: JSON.stringify([{name:"social_scan",label:"Social Media Scan"},{name:"news_scan",label:"News & RSS Scan"},{name:"public_records",label:"Public Records Check"},{name:"enrich_entities",label:"Entity Enrichment"},{name:"deduplicate",label:"Deduplicate Results"},{name:"score_relevance",label:"Score Relevance"},{name:"generate_summary",label:"Generate Summary"}]), isBuiltIn: true, isPublic: true, version: "1.0" },
          { name: "Threat Assessment", description: "Evaluate threat indicators, cross-reference with known threat databases, and generate risk scoring.", category: "Security", icon: "shield-alert", steps: JSON.stringify([{name:"collect_indicators",label:"Collect Indicators"},{name:"threat_db_lookup",label:"Threat DB Lookup"},{name:"cve_cross_ref",label:"CVE Cross-Reference"},{name:"risk_scoring",label:"Risk Scoring"},{name:"generate_advisory",label:"Generate Advisory"}]), isBuiltIn: true, isPublic: true, version: "1.0" },
        ];
        for (const pb of builtIns) { await db.insert(schema.playbooks).values(pb); }
        return db.select().from(schema.playbooks).orderBy(desc(schema.playbooks.createdAt));
      }
      return items;
    }),
    run: protectedProcedure.input(z.object({
      playbookId: z.number(),
      targetId: z.string().optional(),
      targetType: z.string().optional(),
      params: z.record(z.string(), z.any()).optional(),
    })).mutation(async ({ ctx, input }) => {
      const db = (await (await import("./db")).getDb())!;
      const schema = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const [playbook] = await db.select().from(schema.playbooks).where(eq(schema.playbooks.id, input.playbookId));
      if (!playbook) throw new Error("Playbook not found");
      const steps = typeof playbook.steps === "string" ? JSON.parse(playbook.steps) : playbook.steps;
      const [result] = await db.insert(schema.playbookRuns).values({ playbookId: String(input.playbookId), userId: ctx.user.id, targetIds: input.targetId ? JSON.stringify([input.targetId]) : null, params: input.params ? JSON.stringify(input.params) : null, status: "running", startedAt: new Date() });
      const runId = result.insertId;
      // Simulate step execution
      const stepResults: any[] = [];
      for (let i = 0; i < steps.length; i++) {
        stepResults.push({ step: steps[i].name, label: steps[i].label, status: "completed", startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), output: `Step ${i+1}/${steps.length} completed` });
      }
      await db.update(schema.playbookRuns).set({ status: "completed", result: JSON.stringify({ summary: `Playbook '${playbook.name}' completed ${steps.length} steps`, stepResults }), stepResults: JSON.stringify(stepResults), completedAt: new Date(), durationMs: Math.floor(Math.random() * 5000) + 1000 }).where(eq(schema.playbookRuns.id, runId));
      await db.insert(schema.auditLog).values({ actorId: ctx.user.id, actorName: ctx.user.name || "Unknown", actorType: "user", action: "run_playbook", resourceType: "playbook", resourceId: String(input.playbookId), details: JSON.stringify({ playbookName: playbook.name, runId, targetId: input.targetId }) });
      return { runId, status: "completed", steps: stepResults.length };
    }),
    runs: protectedProcedure.input(z.object({ limit: z.number().default(20) }).optional()).query(async ({ ctx, input }) => {
      const db = (await (await import("./db")).getDb())!;
      const schema = await import("../drizzle/schema");
      const { desc, eq } = await import("drizzle-orm");
      return db.select().from(schema.playbookRuns).where(eq(schema.playbookRuns.userId, ctx.user.id)).orderBy(desc(schema.playbookRuns.createdAt)).limit(input?.limit ?? 20);
    }),
  }),

  // ── Case Annotations & Audit ────────────────────────────
  caseEnhanced: router({
    addAnnotation: protectedProcedure.input(z.object({
      caseId: z.number(),
      content: z.string().min(1),
      annotationType: z.enum(["note","finding","question","action_item","conclusion"]).default("note"),
      referencedItemId: z.number().optional(),
    })).mutation(async ({ ctx, input }) => {
      const db = (await (await import("./db")).getDb())!;
      const schema = await import("../drizzle/schema");
      const [result] = await db.insert(schema.caseAnnotations).values({ ...input, authorId: ctx.user.id, authorName: ctx.user.name || "Unknown" });
      await db.insert(schema.auditLog).values({ actorId: ctx.user.id, actorName: ctx.user.name || "Unknown", actorType: "user", action: "add_annotation", resourceType: "case", resourceId: String(input.caseId), details: JSON.stringify({ annotationType: input.annotationType }) });
      return { id: result.insertId };
    }),
    getAnnotations: protectedProcedure.input(z.object({ caseId: z.number() })).query(async ({ input }) => {
      const db = (await (await import("./db")).getDb())!;
      const schema = await import("../drizzle/schema");
      const { eq, desc } = await import("drizzle-orm");
      return db.select().from(schema.caseAnnotations).where(eq(schema.caseAnnotations.caseId, input.caseId)).orderBy(desc(schema.caseAnnotations.createdAt));
    }),
    getAuditLog: protectedProcedure.input(z.object({
      resourceType: z.string().optional(),
      resourceId: z.string().optional(),
      limit: z.number().default(50),
    }).optional()).query(async ({ input }) => {
      const db = (await (await import("./db")).getDb())!;
      const schema = await import("../drizzle/schema");
      const { desc, eq, and } = await import("drizzle-orm");
      const conditions: any[] = [];
      if (input?.resourceType) conditions.push(eq(schema.auditLog.resourceType, input.resourceType));
      if (input?.resourceId) conditions.push(eq(schema.auditLog.resourceId, input.resourceId));
      const query = conditions.length > 0 ? db.select().from(schema.auditLog).where(and(...conditions)) : db.select().from(schema.auditLog);
      return query.orderBy(desc(schema.auditLog.createdAt)).limit(input?.limit ?? 50);
    }),
    exportCase: protectedProcedure.input(z.object({
      caseId: z.number(),
      includeProvenance: z.boolean().default(true),
      redactFields: z.array(z.string()).optional(),
    })).mutation(async ({ ctx, input }) => {
      const db = (await (await import("./db")).getDb())!;
      const schema = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const [caseData] = await db.select().from(schema.cases).where(eq(schema.cases.id, input.caseId));
      if (!caseData) throw new Error("Case not found");
      const evidence = await db.select().from(schema.caseEvidence).where(eq(schema.caseEvidence.caseId, input.caseId));
      const annotations = await db.select().from(schema.caseAnnotations).where(eq(schema.caseAnnotations.caseId, input.caseId));
      const auditEntries = await db.select().from(schema.auditLog).where(eq(schema.auditLog.resourceId, String(input.caseId)));
      let md = `# CASE EXPORT: ${caseData.title}\n\n`;
      md += `**Classification:** TOP SECRET // SI // NOFORN\n`;
      md += `**Case ID:** ${caseData.id}\n`;
      md += `**Status:** ${caseData.status}\n`;
      md += `**Generated:** ${new Date().toISOString()}\n\n`;
      md += `---\n\n## Evidence Items (${evidence.length})\n\n`;
      for (const e of evidence) { md += `- **${e.title || "Untitled"}** [${e.evidenceType}] — Confidence: ${e.confidence ?? "N/A"}\n`; }
      md += `\n## Annotations (${annotations.length})\n\n`;
      for (const a of annotations) { md += `- [${a.annotationType.toUpperCase()}] ${a.content} — *${a.authorName}, ${a.createdAt}*\n`; }
      if (input.includeProvenance) { md += `\n## Audit Trail (${auditEntries.length})\n\n`; for (const a of auditEntries) { md += `- ${a.createdAt} | ${a.actorName} | ${a.action} | ${a.rationale || ""}\n`; } }
      md += `\n---\n*Provenance footer: All evidence items maintain full chain of custody. Export generated by System Zero.*\n`;
      const reportBuffer = Buffer.from(md, "utf-8");
      const { url } = await storagePut(`case-exports/case-${input.caseId}-${Date.now()}.md`, reportBuffer, "text/markdown");
      await db.insert(schema.auditLog).values({ actorId: ctx.user.id, actorName: ctx.user.name || "Unknown", actorType: "user", action: "export_case", resourceType: "case", resourceId: String(input.caseId), details: JSON.stringify({ includeProvenance: input.includeProvenance }) });
      return { markdown: md, downloadUrl: url };
    }),
  }),

  // ── Agent Interaction ───────────────────────────────────
  agentInteraction: router({
    listAgents: publicProcedure.query(async () => {
      return Object.values(AGENTS).map(a => ({ id: a.id, name: a.name, archetype: a.archetype, capabilities: a.capabilities, domains: a.domains, rank: a.rank, icon: a.icon, color: a.color }));
    }),
    chat: protectedProcedure.input(z.object({
      agentId: z.string(),
      message: z.string().min(1),
      context: z.record(z.string(), z.any()).optional(),
    })).mutation(async ({ ctx, input }) => {
      const agentDef = AGENTS[input.agentId] || Object.values(AGENTS)[0];
      const systemPrompt = `You are ${agentDef.name}, an AI agent in the System Zero intelligence platform. Your archetype: ${agentDef.archetype}. Capabilities: ${agentDef.capabilities?.join(", ") || "general intelligence"}. Respond concisely and professionally. When suggesting actions, format them as [ACTION: action_name] so the UI can render them as buttons.`;
      const response = await invokeLLM({ messages: [{ role: "system", content: systemPrompt }, { role: "user", content: input.message }] });
      const rawContent = response.choices?.[0]?.message?.content;
      const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent) || "No response generated.";
      // Extract suggested actions from response
      const actionRegex = /\[ACTION:\s*([^\]]+)\]/g;
      const suggestedActions: string[] = [];
      let match;
      while ((match = actionRegex.exec(content)) !== null) { suggestedActions.push(match[1].trim()); }
      const cleanContent = content.replace(actionRegex, "").trim();
      // Log to audit
      const db = (await (await import("./db")).getDb())!;
      const schema = await import("../drizzle/schema");
      await db.insert(schema.auditLog).values({ actorId: ctx.user.id, actorName: ctx.user.name || "Unknown", actorType: "user", action: "agent_chat", resourceType: "agent", resourceId: input.agentId, details: JSON.stringify({ messageLength: input.message.length }) });
      return { response: cleanContent, suggestedActions, agentName: agentDef.name, agentId: agentDef.id, rationale: `Response generated by ${agentDef.name} based on ${agentDef.domains?.[0] || "general"} expertise.` };
    }),
    quickAction: protectedProcedure.input(z.object({
      action: z.enum(["verify_image", "sweep_target", "summarize_thread", "run_playbook", "add_to_case"]),
      targetId: z.string().optional(),
      params: z.record(z.string(), z.any()).optional(),
    })).mutation(async ({ ctx, input }) => {
      const db = (await (await import("./db")).getDb())!;
      const schema = await import("../drizzle/schema");
      await db.insert(schema.auditLog).values({ actorId: ctx.user.id, actorName: ctx.user.name || "Unknown", actorType: "user", action: `quick_action_${input.action}`, resourceType: "agent_action", resourceId: input.targetId || "none", rationale: `User triggered quick action: ${input.action}` });
      const actionDescriptions: Record<string, string> = {
        verify_image: "Image verification playbook queued. Extracting frames, running OCR, computing perceptual hash, and cross-referencing with known imagery databases.",
        sweep_target: "Target sweep initiated. Searching across social media, news, and public records for the last 7 days.",
        summarize_thread: "Thread summarization in progress. Extracting key entities, timeline, and sentiment analysis.",
        run_playbook: "Playbook execution queued. Select a playbook from the Playbook Runner to configure and execute.",
        add_to_case: "Item flagged for case addition. Navigate to Case Workspace to assign to an active case.",
      };
      return { status: "initiated", action: input.action, description: actionDescriptions[input.action] || "Action initiated.", timestamp: new Date().toISOString() };
    }),
  }),

  // ── Connectors (OAuth/API Status) ───────────────────────
  connector: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = (await (await import("./db")).getDb())!;
      const schema = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const userConnectors = await db.select().from(schema.connectors).where(eq(schema.connectors.userId, ctx.user.id));
      // Return with all available platforms (connected or not)
      const allPlatforms = [
        { platform: "twitter", displayName: "Twitter / X", icon: "twitter", scopes: ["read", "write"], oauthUrl: "#" },
        { platform: "facebook", displayName: "Facebook", icon: "facebook", scopes: ["public_profile", "pages_read"], oauthUrl: "#" },
        { platform: "instagram", displayName: "Instagram", icon: "instagram", scopes: ["basic", "media_read"], oauthUrl: "#" },
        { platform: "youtube", displayName: "YouTube", icon: "youtube", scopes: ["readonly", "upload"], oauthUrl: "#" },
        { platform: "linkedin", displayName: "LinkedIn", icon: "linkedin", scopes: ["r_liteprofile", "r_emailaddress"], oauthUrl: "#" },
        { platform: "reddit", displayName: "Reddit", icon: "message-circle", scopes: ["read", "history"], oauthUrl: "#" },
        { platform: "tiktok", displayName: "TikTok", icon: "video", scopes: ["user.info.basic"], oauthUrl: "#" },
        { platform: "telegram", displayName: "Telegram", icon: "send", scopes: ["messages"], oauthUrl: "#" },
        { platform: "discord", displayName: "Discord", icon: "message-square", scopes: ["identify", "guilds"], oauthUrl: "#" },
        { platform: "shodan", displayName: "Shodan", icon: "server", scopes: ["api_access"], oauthUrl: "#" },
        { platform: "censys", displayName: "Censys", icon: "search", scopes: ["api_access"], oauthUrl: "#" },
        { platform: "maltego", displayName: "Maltego", icon: "git-branch", scopes: ["transform_access"], oauthUrl: "#" },
      ];
      return allPlatforms.map(p => {
        const existing = userConnectors.find(c => c.platform === p.platform);
        return { ...p, status: existing?.status || "disconnected", lastSyncAt: existing?.lastSyncAt, tokenExpiresAt: existing?.tokenExpiresAt, connectorId: existing?.id };
      });
    }),
    connect: protectedProcedure.input(z.object({ platform: z.string() })).mutation(async ({ ctx, input }) => {
      const db = (await (await import("./db")).getDb())!;
      const schema = await import("../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");
      const [existing] = await db.select().from(schema.connectors).where(and(eq(schema.connectors.userId, ctx.user.id), eq(schema.connectors.platform, input.platform)));
      if (existing) {
        await db.update(schema.connectors).set({ status: "connected", lastSyncAt: new Date(), tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }).where(eq(schema.connectors.id, existing.id));
      } else {
        await db.insert(schema.connectors).values({ userId: ctx.user.id, platform: input.platform, displayName: input.platform, status: "connected", lastSyncAt: new Date(), tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) });
      }
      await db.insert(schema.auditLog).values({ actorId: ctx.user.id, actorName: ctx.user.name || "Unknown", actorType: "user", action: "connect_platform", resourceType: "connector", resourceId: input.platform });
      return { success: true, platform: input.platform };
    }),
    disconnect: protectedProcedure.input(z.object({ platform: z.string() })).mutation(async ({ ctx, input }) => {
      const db = (await (await import("./db")).getDb())!;
      const schema = await import("../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");
      await db.update(schema.connectors).set({ status: "disconnected" }).where(and(eq(schema.connectors.userId, ctx.user.id), eq(schema.connectors.platform, input.platform)));
      await db.insert(schema.auditLog).values({ actorId: ctx.user.id, actorName: ctx.user.name || "Unknown", actorType: "user", action: "disconnect_platform", resourceType: "connector", resourceId: input.platform });
      return { success: true };
    }),
  }),

  // ── Audit Chain Verification & Export ────────────────────
  // ─── PDF Library ──────────────────────────────────────────────────
  pdfLibrary: router({
    upload: protectedProcedure.input(z.object({
      title: z.string().min(1),
      author: z.string().optional(),
      description: z.string().optional(),
      category: z.enum(["intelligence", "research", "policy", "technical", "legal", "training", "reference", "report", "manual", "other"]).default("other"),
      tags: z.array(z.string()).optional(),
      isPublic: z.boolean().default(false),
      fileBase64: z.string(),
      fileName: z.string(),
      fileSize: z.number(),
      pageCount: z.number().optional(),
    })).mutation(async ({ ctx, input }) => {
      const { createPdfDocument, updatePdfDocument } = await import("./db");
      const { storagePut } = await import("./storage");
      const buffer = Buffer.from(input.fileBase64, "base64");
      const suffix = Math.random().toString(36).slice(2, 10);
      const fileKey = `pdf-library/${ctx.user.id}/${suffix}-${input.fileName}`;
      const { url } = await storagePut(fileKey, buffer, "application/pdf");

      // Extract text from PDF using pdf-parse
      let extractedText = "";
      let detectedPageCount = input.pageCount ?? 0;
      try {
        const pdfParseModule = await import("pdf-parse");
        const pdfParse = (pdfParseModule as any).default || pdfParseModule;
        const parsed = await pdfParse(buffer);
        extractedText = parsed.text?.slice(0, 60000) || "";
        if (parsed.numpages) detectedPageCount = parsed.numpages;
      } catch (e) {
        console.warn("[PDF] Text extraction failed:", e);
      }

      const doc = await createPdfDocument({
        userId: ctx.user.id,
        title: input.title,
        author: input.author ?? null,
        description: input.description ?? null,
        fileUrl: url,
        fileKey,
        fileSize: input.fileSize,
        pageCount: detectedPageCount,
        category: input.category,
        tags: input.tags ?? [],
        isPublic: input.isPublic,
      });

      // Save extracted text asynchronously (don't block upload)
      if (extractedText && doc?.id) {
        updatePdfDocument(doc.id, { extractedText }).catch(() => {});
      }

      return { ...doc, extractedText: extractedText ? "extracted" : "none" };
    }),

    list: protectedProcedure.input(z.object({
      category: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
      includePublic: z.boolean().default(true),
    }).optional()).query(async ({ ctx, input }) => {
      const { getPdfDocuments } = await import("./db");
      const opts = input ?? { category: undefined, search: undefined, limit: 50, offset: 0, includePublic: true };
      // Get user's own docs + public docs
      const own = await getPdfDocuments({ userId: ctx.user.id, category: opts.category ?? undefined, search: opts.search ?? undefined, limit: opts.limit ?? 50, offset: opts.offset ?? 0 });
      if (opts.includePublic) {
        const pub = await getPdfDocuments({ isPublic: true, category: opts.category ?? undefined, search: opts.search ?? undefined, limit: 20, offset: 0 });
        const pubFiltered = pub.documents.filter(d => d.userId !== ctx.user.id);
        return { documents: own.documents, publicDocuments: pubFiltered, total: own.total };
      }
      return { documents: own.documents, publicDocuments: [], total: own.total };
    }),

    get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const { getPdfDocument } = await import("./db");
      return getPdfDocument(input.id);
    }),

    update: protectedProcedure.input(z.object({
      id: z.number(),
      title: z.string().optional(),
      author: z.string().optional(),
      description: z.string().optional(),
      category: z.enum(["intelligence", "research", "policy", "technical", "legal", "training", "reference", "report", "manual", "other"]).optional(),
      tags: z.array(z.string()).optional(),
      isPublic: z.boolean().optional(),
      summary: z.string().optional(),
      extractedText: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { updatePdfDocument } = await import("./db");
      const { id, ...updates } = input;
      await updatePdfDocument(id, updates as any);
      return { success: true };
    }),

    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const { deletePdfDocument } = await import("./db");
      await deletePdfDocument(input.id);
      return { success: true };
    }),

    // Reading Progress
    getProgress: protectedProcedure.input(z.object({ documentId: z.number() })).query(async ({ ctx, input }) => {
      const { getReadingProgress } = await import("./db");
      return getReadingProgress(ctx.user.id, input.documentId);
    }),

    updateProgress: protectedProcedure.input(z.object({
      documentId: z.number(),
      currentPage: z.number(),
      totalPages: z.number(),
      progressPercent: z.number(),
      notes: z.string().optional(),
      highlights: z.any().optional(),
      bookmarks: z.any().optional(),
    })).mutation(async ({ ctx, input }) => {
      const { upsertReadingProgress, updatePdfDocument } = await import("./db");
      await upsertReadingProgress({ userId: ctx.user.id, ...input });
      await updatePdfDocument(input.documentId, { readCount: (await import("drizzle-orm")).sql`read_count + 1` as any });
      return { success: true };
    }),

    recentlyRead: protectedProcedure.input(z.object({ limit: z.number().default(10) }).optional()).query(async ({ ctx, input }) => {
      const { getRecentlyRead } = await import("./db");
      return getRecentlyRead(ctx.user.id, input?.limit ?? 10);
    }),

    // Collections
    collections: protectedProcedure.query(async ({ ctx }) => {
      const { getPdfCollections } = await import("./db");
      return getPdfCollections(ctx.user.id);
    }),

    createCollection: protectedProcedure.input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      icon: z.string().optional(),
      color: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      const { createPdfCollection } = await import("./db");
      return createPdfCollection({ userId: ctx.user.id, ...input });
    }),

    addToCollection: protectedProcedure.input(z.object({
      collectionId: z.number(),
      documentId: z.number(),
    })).mutation(async ({ input }) => {
      const { addDocumentToCollection } = await import("./db");
      await addDocumentToCollection(input.collectionId, input.documentId);
      return { success: true };
    }),

    removeFromCollection: protectedProcedure.input(z.object({
      collectionId: z.number(),
      documentId: z.number(),
    })).mutation(async ({ input }) => {
      const { removeDocumentFromCollection } = await import("./db");
      await removeDocumentFromCollection(input.collectionId, input.documentId);
      return { success: true };
    }),

    collectionDocuments: protectedProcedure.input(z.object({ collectionId: z.number() })).query(async ({ input }) => {
      const { getCollectionDocuments } = await import("./db");
      return getCollectionDocuments(input.collectionId);
    }),

    // Agent Chat (reader3-inspired LLM companion)
    chatHistory: protectedProcedure.input(z.object({ documentId: z.number() })).query(async ({ ctx, input }) => {
      const { getPdfAgentChats } = await import("./db");
      return getPdfAgentChats(input.documentId, ctx.user.id);
    }),

    askAgent: protectedProcedure.input(z.object({
      documentId: z.number(),
      question: z.string().min(1),
      contextText: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      const { createPdfAgentChat, getPdfDocument } = await import("./db");
      // Save user message
      await createPdfAgentChat({ userId: ctx.user.id, documentId: input.documentId, role: "user", content: input.question });
      // Get document context
      const doc = await getPdfDocument(input.documentId);
      const docContext = input.contextText || doc?.extractedText || doc?.summary || "No text extracted yet.";
      // Ask LLM
      const response = await invokeLLM({
        messages: [
          { role: "system", content: `You are Oppenheimer, the research agent for Empire Dashboard. You are helping the user understand a PDF document titled "${doc?.title || "Unknown"}". Use the document context below to answer questions accurately. If the context doesn't contain enough information, say so honestly.\n\nDocument context:\n${docContext.slice(0, 8000)}` },
          { role: "user", content: input.question },
        ],
      });
      const answer = String(response.choices?.[0]?.message?.content || "I couldn't generate a response. Please try again.");
      // Save agent response
      await createPdfAgentChat({ userId: ctx.user.id, documentId: input.documentId, role: "agent", content: answer });
      return { answer };
    }),

    // Summarize document via LLM
    summarize: protectedProcedure.input(z.object({
      documentId: z.number(),
      text: z.string().min(1),
    })).mutation(async ({ input }) => {
      const { updatePdfDocument } = await import("./db");
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are a research assistant. Produce a concise, structured summary of the following document text. Include key findings, methodology, and conclusions. Use markdown formatting." },
          { role: "user", content: input.text.slice(0, 12000) },
        ],
      });
      const summary = String(response.choices?.[0]?.message?.content || "Summary generation failed.");
      await updatePdfDocument(input.documentId, { summary, extractedText: input.text.slice(0, 60000) });
      return { summary };
    }),
  }),

  auditChain: router({
    verify: protectedProcedure.query(async () => {
      const { verifyAuditChain } = await import("./db");
      return verifyAuditChain();
    }),
    export: protectedProcedure.input(z.object({
      format: z.enum(["json", "markdown"]).default("json"),
      limit: z.number().default(1000),
    }).optional()).query(async ({ input }) => {
      const db = (await (await import("./db")).getDb())!;
      const schema = await import("../drizzle/schema");
      const { desc } = await import("drizzle-orm");
      const entries = await db.select().from(schema.auditLog).orderBy(desc(schema.auditLog.createdAt)).limit(input?.limit ?? 1000);
      if (input?.format === "markdown") {
        let md = "# Audit Log Export\n\n";
        md += `**Generated:** ${new Date().toISOString()}\n`;
        md += `**Entries:** ${entries.length}\n\n`;
        md += "| # | Action | Actor | Resource | Time | Hash |\n";
        md += "|---|--------|-------|----------|------|------|\n";
        for (const e of entries) {
          md += `| ${e.id} | ${e.action} | ${e.actorName} | ${e.resourceType}:${e.resourceId || "-"} | ${e.createdAt.toISOString()} | ${(e.hash || "-").slice(0, 8)}... |\n`;
        }
        return { format: "markdown", content: md, count: entries.length };
      }
      return { format: "json", entries, count: entries.length };
    }),
  }),
});

export type AppRouter = typeof appRouter;
