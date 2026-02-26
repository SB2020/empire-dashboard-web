/**
 * Agent Communication Bus — Inter-agent messaging and cooperation protocol.
 * Agents can post messages to shared channels, subscribe to topics,
 * and chain outputs into other agents' inputs.
 */
import { invokeLLM } from "./_core/llm";
import { AGENTS } from "@shared/agents";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AgentMessage {
  id: string;
  fromAgent: string;
  toAgent: string | "broadcast";
  channel: string;
  content: string;
  messageType: "request" | "response" | "alert" | "intel" | "handoff";
  priority: "low" | "normal" | "high" | "critical";
  timestamp: number;
  metadata?: Record<string, unknown>;
  parentId?: string; // For threaded conversations
}

export interface CommChannel {
  id: string;
  name: string;
  description: string;
  participants: string[];
  messages: AgentMessage[];
  createdAt: number;
}

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  agentId: string;
  category: "osint" | "creative" | "security" | "code" | "research" | "social" | "business";
  inputSchema: string;
  outputSchema: string;
  learnedAt: number;
  usageCount: number;
}

export interface AppIntegration {
  id: string;
  name: string;
  description: string;
  category: "ai" | "social" | "business" | "creative" | "security" | "data";
  icon: string;
  status: "connected" | "available" | "coming_soon";
  capabilities: string[];
  apiType: "built_in" | "external" | "open_source";
  url?: string;
}

// ─── In-Memory Message Bus ──────────────────────────────────────────────────
// In production this would be Redis/Kafka. For now, in-memory with DB persistence.

const messageHistory: AgentMessage[] = [];
const channels: Map<string, CommChannel> = new Map();
let messageCounter = 0;

function generateId(): string {
  return `msg_${Date.now()}_${++messageCounter}`;
}

// Initialize default channels
function initChannels() {
  if (channels.size > 0) return;

  const defaults: Omit<CommChannel, "messages" | "createdAt">[] = [
    { id: "general", name: "General Operations", description: "All-agent broadcast channel", participants: Object.keys(AGENTS) },
    { id: "intel", name: "Intelligence Feed", description: "OSINT and HUMINT intelligence sharing", participants: ["suntzu", "pliny", "oppenheimer"] },
    { id: "creative", name: "Creative Pipeline", description: "Media generation and content creation", participants: ["virgil", "karpathy"] },
    { id: "security", name: "Security Alerts", description: "Threat detection and defense coordination", participants: ["pliny", "suntzu"] },
    { id: "research", name: "Research Synthesis", description: "Academic and knowledge sharing", participants: ["oppenheimer", "karpathy", "suntzu"] },
    { id: "missions", name: "Active Missions", description: "Multi-agent coordinated operations", participants: Object.keys(AGENTS) },
  ];

  for (const ch of defaults) {
    channels.set(ch.id, { ...ch, messages: [], createdAt: Date.now() });
  }
}

initChannels();

// ─── Message Bus Operations ─────────────────────────────────────────────────

export function postMessage(msg: Omit<AgentMessage, "id" | "timestamp">): AgentMessage {
  const fullMsg: AgentMessage = {
    ...msg,
    id: generateId(),
    timestamp: Date.now(),
  };

  messageHistory.push(fullMsg);

  // Add to channel
  const channel = channels.get(msg.channel);
  if (channel) {
    channel.messages.push(fullMsg);
    // Keep channel messages bounded
    if (channel.messages.length > 200) {
      channel.messages = channel.messages.slice(-100);
    }
  }

  // Keep global history bounded
  if (messageHistory.length > 1000) {
    messageHistory.splice(0, 500);
  }

  return fullMsg;
}

export function getChannelMessages(channelId: string, limit = 50): AgentMessage[] {
  const channel = channels.get(channelId);
  if (!channel) return [];
  return channel.messages.slice(-limit);
}

export function getChannels(): CommChannel[] {
  return Array.from(channels.values()).map(ch => ({
    ...ch,
    messages: ch.messages.slice(-5), // Only last 5 for listing
  }));
}

export function getAgentMessages(agentId: string, limit = 50): AgentMessage[] {
  return messageHistory
    .filter(m => m.fromAgent === agentId || m.toAgent === agentId || m.toAgent === "broadcast")
    .slice(-limit);
}

export function getRecentMessages(limit = 100): AgentMessage[] {
  return messageHistory.slice(-limit);
}

// ─── Agent-to-Agent Communication ───────────────────────────────────────────

export async function agentToAgentMessage(
  fromAgentId: string,
  toAgentId: string,
  message: string,
  channel = "general"
): Promise<{ sent: AgentMessage; reply: AgentMessage }> {
  const fromAgent = AGENTS[fromAgentId];
  const toAgent = AGENTS[toAgentId];
  if (!fromAgent || !toAgent) throw new Error("Invalid agent IDs");

  // Post the original message
  const sent = postMessage({
    fromAgent: fromAgentId,
    toAgent: toAgentId,
    channel,
    content: message,
    messageType: "request",
    priority: "normal",
  });

  // Generate the receiving agent's response
  const result = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `${toAgent.systemPrompt}\n\nYou are receiving a message from ${fromAgent.name} (${fromAgent.archetype}). Respond in character, be concise and actionable. If you need to delegate further, use [HANDOFF:agentId] tag.`,
      },
      {
        role: "user",
        content: `Message from ${fromAgent.name}: ${message}`,
      },
    ],
  });

  const responseText =
    typeof result.choices[0]?.message?.content === "string"
      ? result.choices[0].message.content
      : "Acknowledged.";

  const reply = postMessage({
    fromAgent: toAgentId,
    toAgent: fromAgentId,
    channel,
    content: responseText,
    messageType: "response",
    priority: "normal",
    parentId: sent.id,
  });

  return { sent, reply };
}

// ─── Broadcast Operation ────────────────────────────────────────────────────

export async function broadcastToAgents(
  message: string,
  agentIds?: string[]
): Promise<AgentMessage[]> {
  const targetIds = agentIds || Object.keys(AGENTS);
  const responses: AgentMessage[] = [];

  // Post the broadcast
  const broadcast = postMessage({
    fromAgent: "system",
    toAgent: "broadcast",
    channel: "general",
    content: message,
    messageType: "alert",
    priority: "high",
  });

  // Collect responses in parallel
  const results = await Promise.allSettled(
    targetIds.map(async (agentId) => {
      const agent = AGENTS[agentId];
      if (!agent) return null;

      const result = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `${agent.systemPrompt}\n\nYou received a system-wide broadcast. Respond briefly with your assessment from your domain expertise. Be concise (2-3 sentences max).`,
          },
          { role: "user", content: `BROADCAST: ${message}` },
        ],
      });

      const responseText =
        typeof result.choices[0]?.message?.content === "string"
          ? result.choices[0].message.content
          : "Acknowledged.";

      return postMessage({
        fromAgent: agentId,
        toAgent: "broadcast",
        channel: "general",
        content: responseText,
        messageType: "response",
        priority: "normal",
        parentId: broadcast.id,
      });
    })
  );

  for (const r of results) {
    if (r.status === "fulfilled" && r.value) {
      responses.push(r.value);
    }
  }

  return responses;
}

// ─── App Ecosystem Registry ─────────────────────────────────────────────────

export const APP_ECOSYSTEM: AppIntegration[] = [
  // AI Models
  { id: "claude", name: "Claude", description: "Anthropic's reasoning model — deep analysis, coding, and strategic thinking", category: "ai", icon: "Brain", status: "connected", capabilities: ["reasoning", "coding", "analysis", "writing"], apiType: "built_in" },
  { id: "gpt4", name: "GPT-4", description: "OpenAI's multimodal model — vision, code, and general intelligence", category: "ai", icon: "Sparkles", status: "connected", capabilities: ["vision", "coding", "reasoning", "multimodal"], apiType: "built_in" },
  { id: "gemini", name: "Gemini", description: "Google's multimodal model — long context, search grounding", category: "ai", icon: "Gem", status: "available", capabilities: ["long_context", "search", "multimodal"], apiType: "external" },
  { id: "grok", name: "Grok", description: "xAI's real-time model — Twitter/X data access, unfiltered analysis", category: "ai", icon: "Zap", status: "available", capabilities: ["real_time", "twitter_data", "unfiltered"], apiType: "external" },

  // Creative / Media
  { id: "suno", name: "Suno AI", description: "AI music generation — create full songs from text prompts", category: "creative", icon: "Music", status: "connected", capabilities: ["music_generation", "lyrics", "audio"], apiType: "built_in" },
  { id: "imagen", name: "Imagen", description: "Image generation — photorealistic and artistic image creation", category: "creative", icon: "Image", status: "connected", capabilities: ["image_generation", "editing", "inpainting"], apiType: "built_in" },
  { id: "sora", name: "Sora", description: "OpenAI's video generation — create videos from text descriptions", category: "creative", icon: "Video", status: "coming_soon", capabilities: ["video_generation", "animation"], apiType: "external" },
  { id: "kling", name: "Kling AI", description: "Video generation — high-quality video from text and images", category: "creative", icon: "Film", status: "available", capabilities: ["video_generation", "lip_sync"], apiType: "external" },
  { id: "elevenlabs", name: "ElevenLabs", description: "Voice synthesis — realistic voice cloning and TTS", category: "creative", icon: "Mic", status: "available", capabilities: ["voice_clone", "tts", "voice_design"], apiType: "external" },

  // Social Media
  { id: "twitter", name: "Twitter/X", description: "Social intelligence — profile analysis, trend monitoring, content posting", category: "social", icon: "AtSign", status: "connected", capabilities: ["profile_lookup", "trend_analysis", "posting", "monitoring"], apiType: "built_in" },
  { id: "linkedin", name: "LinkedIn", description: "Professional network — people search, company intel, career tracking", category: "social", icon: "Briefcase", status: "connected", capabilities: ["people_search", "company_intel", "job_tracking"], apiType: "built_in" },
  { id: "instagram", name: "Instagram", description: "Visual social intelligence — profile analysis, content monitoring", category: "social", icon: "Camera", status: "available", capabilities: ["profile_analysis", "content_monitoring", "hashtag_tracking"], apiType: "external" },
  { id: "youtube", name: "YouTube", description: "Video intelligence — channel analysis, content search, trend tracking", category: "social", icon: "Play", status: "connected", capabilities: ["search", "channel_analysis", "transcript"], apiType: "built_in" },
  { id: "reddit", name: "Reddit", description: "Community intelligence — subreddit monitoring, sentiment analysis", category: "social", icon: "MessageCircle", status: "available", capabilities: ["subreddit_monitoring", "sentiment", "trending"], apiType: "external" },

  // Business
  { id: "crunchbase", name: "Crunchbase", description: "Company intelligence — funding, investors, market data", category: "business", icon: "TrendingUp", status: "available", capabilities: ["company_data", "funding_rounds", "investor_tracking"], apiType: "external" },
  { id: "hunter", name: "Hunter.io", description: "Email intelligence — find and verify professional email addresses", category: "business", icon: "Mail", status: "available", capabilities: ["email_finder", "email_verification", "domain_search"], apiType: "external" },

  // Security
  { id: "shodan", name: "Shodan", description: "Internet-connected device search — network reconnaissance", category: "security", icon: "Radar", status: "available", capabilities: ["device_search", "port_scan", "vulnerability"], apiType: "external" },
  { id: "virustotal", name: "VirusTotal", description: "Malware analysis — file/URL scanning, threat intelligence", category: "security", icon: "ShieldAlert", status: "available", capabilities: ["malware_scan", "url_check", "threat_intel"], apiType: "external" },
  { id: "nvd", name: "NVD/NIST", description: "Vulnerability database — CVE tracking and analysis", category: "security", icon: "Bug", status: "connected", capabilities: ["cve_search", "vulnerability_tracking"], apiType: "built_in" },

  // Data / OSINT
  { id: "opensky", name: "OpenSky Network", description: "Live flight tracking — real-time aircraft positions worldwide", category: "data", icon: "Plane", status: "connected", capabilities: ["flight_tracking", "aircraft_data"], apiType: "built_in" },
  { id: "usgs", name: "USGS", description: "Seismic monitoring — real-time earthquake data globally", category: "data", icon: "Activity", status: "connected", capabilities: ["earthquake_data", "seismic_monitoring"], apiType: "built_in" },
  { id: "gdelt", name: "GDELT Project", description: "Global event monitoring — news, conflict, and sentiment analysis", category: "data", icon: "Globe", status: "connected", capabilities: ["news_monitoring", "conflict_tracking", "sentiment"], apiType: "built_in" },
  { id: "nws", name: "NWS", description: "Weather intelligence — alerts, forecasts, and severe weather tracking", category: "data", icon: "CloudLightning", status: "connected", capabilities: ["weather_alerts", "forecasts"], apiType: "built_in" },
];

// ─── Skill Registry ─────────────────────────────────────────────────────────

const agentSkills: AgentSkill[] = [
  // Pliny skills
  { id: "prompt_injection_scan", name: "Prompt Injection Scanner", description: "Detect and neutralize adversarial prompt injections", agentId: "pliny", category: "security", inputSchema: "text", outputSchema: "threat_report", learnedAt: Date.now(), usageCount: 0 },
  { id: "threat_assessment", name: "Threat Assessment", description: "Evaluate security posture and identify vulnerabilities", agentId: "pliny", category: "security", inputSchema: "context", outputSchema: "assessment", learnedAt: Date.now(), usageCount: 0 },

  // Karpathy skills
  { id: "code_generation", name: "Code Generation", description: "Generate production-ready code from natural language", agentId: "karpathy", category: "code", inputSchema: "description", outputSchema: "code", learnedAt: Date.now(), usageCount: 0 },
  { id: "code_review", name: "Code Review", description: "Analyze code for bugs, security issues, and improvements", agentId: "karpathy", category: "code", inputSchema: "code", outputSchema: "review", learnedAt: Date.now(), usageCount: 0 },
  { id: "architecture_design", name: "Architecture Design", description: "Design system architectures and data models", agentId: "karpathy", category: "code", inputSchema: "requirements", outputSchema: "architecture", learnedAt: Date.now(), usageCount: 0 },

  // Virgil skills
  { id: "image_generation", name: "Image Generation", description: "Create images from text descriptions", agentId: "virgil", category: "creative", inputSchema: "prompt", outputSchema: "image_url", learnedAt: Date.now(), usageCount: 0 },
  { id: "music_prompt", name: "Music Prompt Engineering", description: "Generate optimized Suno AI music prompts", agentId: "virgil", category: "creative", inputSchema: "description", outputSchema: "suno_prompt", learnedAt: Date.now(), usageCount: 0 },
  { id: "content_strategy", name: "Content Strategy", description: "Plan multi-platform content campaigns", agentId: "virgil", category: "social", inputSchema: "goals", outputSchema: "strategy", learnedAt: Date.now(), usageCount: 0 },

  // Sun Tzu skills
  { id: "osint_collection", name: "OSINT Collection", description: "Gather open-source intelligence from multiple feeds", agentId: "suntzu", category: "osint", inputSchema: "target", outputSchema: "intel_report", learnedAt: Date.now(), usageCount: 0 },
  { id: "person_profiling", name: "Person Profiling", description: "Build comprehensive person dossiers from OSINT sources", agentId: "suntzu", category: "osint", inputSchema: "person_query", outputSchema: "dossier", learnedAt: Date.now(), usageCount: 0 },
  { id: "competitor_analysis", name: "Competitor Analysis", description: "Analyze competitive landscape and market positioning", agentId: "suntzu", category: "business", inputSchema: "company", outputSchema: "analysis", learnedAt: Date.now(), usageCount: 0 },
  { id: "social_graph", name: "Social Graph Mapping", description: "Map social connections and influence networks", agentId: "suntzu", category: "osint", inputSchema: "entity", outputSchema: "graph", learnedAt: Date.now(), usageCount: 0 },

  // Oppenheimer skills
  { id: "paper_mining", name: "Paper Mining", description: "Search and analyze academic papers from Springer and arXiv", agentId: "oppenheimer", category: "research", inputSchema: "query", outputSchema: "papers", learnedAt: Date.now(), usageCount: 0 },
  { id: "knowledge_synthesis", name: "Knowledge Synthesis", description: "Synthesize multiple sources into unified briefings", agentId: "oppenheimer", category: "research", inputSchema: "sources", outputSchema: "synthesis", learnedAt: Date.now(), usageCount: 0 },
];

export function getSkills(agentId?: string): AgentSkill[] {
  if (agentId) return agentSkills.filter(s => s.agentId === agentId);
  return agentSkills;
}

export function getAppEcosystem(category?: string): AppIntegration[] {
  if (category) return APP_ECOSYSTEM.filter(a => a.category === category);
  return APP_ECOSYSTEM;
}
