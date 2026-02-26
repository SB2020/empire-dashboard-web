/**
 * GitHub OSINT Intelligence Service
 * Search repos, analyze tools, curated OSINT collections, and repo tracking.
 * Uses GitHub public API (no auth required for basic search, rate-limited to 10 req/min).
 */

import axios from "axios";

const GH_API = "https://api.github.com";
const HEADERS = {
  Accept: "application/vnd.github.v3+json",
  "User-Agent": "EmpireDashboard-OSINT/1.0",
};

// ── Types ──────────────────────────────────────────────────────

export interface GHRepo {
  id: number;
  full_name: string;
  owner: { login: string; avatar_url: string };
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  topics: string[];
  created_at: string;
  updated_at: string;
  pushed_at: string;
  license: { spdx_id: string; name: string } | null;
  size: number;
  default_branch: string;
  archived: boolean;
  fork: boolean;
}

export interface GHSearchResult {
  total_count: number;
  incomplete_results: boolean;
  items: GHRepo[];
}

export interface GHUser {
  login: string;
  avatar_url: string;
  html_url: string;
  name: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
}

export interface RepoAnalysis {
  repo: GHRepo;
  readme: string | null;
  languages: Record<string, number>;
  recentCommits: { sha: string; message: string; date: string; author: string }[];
  securityIndicators: {
    hasSecurityPolicy: boolean;
    hasCodeOfConduct: boolean;
    licenseName: string | null;
    isArchived: boolean;
    daysSinceLastPush: number;
    openIssueRatio: number;
  };
  osintRelevance: {
    score: number;
    categories: string[];
    keywords: string[];
  };
}

// ── Curated OSINT Tool Collections ──────────────────────────────

export interface CuratedTool {
  fullName: string;
  description: string;
  category: string;
  tags: string[];
}

export const OSINT_COLLECTIONS: Record<string, CuratedTool[]> = {
  "Reconnaissance": [
    { fullName: "laramies/theHarvester", description: "E-mails, subdomains, hosts, employee names, open ports and banners from public sources", category: "osint_tool", tags: ["recon", "email", "subdomain"] },
    { fullName: "smicallef/spiderfoot", description: "SpiderFoot automates OSINT for threat intelligence and mapping attack surface", category: "osint_tool", tags: ["recon", "automation", "threat-intel"] },
    { fullName: "lanmaster53/recon-ng", description: "Full-featured reconnaissance framework with independent modules and database interaction", category: "osint_tool", tags: ["recon", "framework", "modules"] },
    { fullName: "sherlock-project/sherlock", description: "Hunt down social media accounts by username across social networks", category: "osint_tool", tags: ["social", "username", "hunting"] },
    { fullName: "soxoj/maigret", description: "Collect a dossier on a person by username from thousands of sites", category: "osint_tool", tags: ["social", "username", "dossier"] },
  ],
  "Network Intelligence": [
    { fullName: "projectdiscovery/subfinder", description: "Fast passive subdomain enumeration tool", category: "security", tags: ["subdomain", "dns", "passive"] },
    { fullName: "projectdiscovery/httpx", description: "Fast and multi-purpose HTTP toolkit for probing", category: "security", tags: ["http", "probe", "scanning"] },
    { fullName: "projectdiscovery/nuclei", description: "Fast and customizable vulnerability scanner based on templates", category: "security", tags: ["vuln", "scanner", "templates"] },
    { fullName: "OWASP/Amass", description: "In-depth attack surface mapping and asset discovery", category: "security", tags: ["dns", "mapping", "asset-discovery"] },
    { fullName: "aboul3la/Sublist3r", description: "Fast subdomains enumeration tool for penetration testers", category: "security", tags: ["subdomain", "enumeration"] },
  ],
  "Image & Media Analysis": [
    { fullName: "opentibiabr/canern", description: "Reverse image search and visual intelligence", category: "osint_tool", tags: ["image", "reverse-search", "visual"] },
    { fullName: "GuidoBartoli/sherloq", description: "Open-source digital image forensic toolset", category: "osint_tool", tags: ["image", "forensics", "exif"] },
    { fullName: "yt-dlp/yt-dlp", description: "Feature-rich command-line audio/video downloader", category: "data_source", tags: ["video", "download", "media"] },
    { fullName: "Bellingcat/auto-archiver", description: "Automatically archive social media posts, videos, and images", category: "automation", tags: ["archive", "social", "preservation"] },
  ],
  "Geospatial Intelligence": [
    { fullName: "opendronemap/ODM", description: "Open-source toolkit for processing aerial drone imagery", category: "data_source", tags: ["drone", "imagery", "mapping"] },
    { fullName: "openstreetmap/openstreetmap-website", description: "The Rails application that powers OpenStreetMap", category: "data_source", tags: ["maps", "geospatial", "open-data"] },
    { fullName: "CesiumGS/cesium", description: "Open platform for software applications designed to unleash the power of 3D data", category: "visualization", tags: ["3d", "globe", "geospatial"] },
    { fullName: "keplergl/kepler.gl", description: "Powerful open source geospatial analysis tool for large-scale data sets", category: "visualization", tags: ["geospatial", "visualization", "data"] },
  ],
  "Threat Intelligence": [
    { fullName: "OpenCTI-Platform/opencti", description: "Open Cyber Threat Intelligence Platform", category: "osint_tool", tags: ["cti", "threat-intel", "platform"] },
    { fullName: "MISP/MISP", description: "Malware Information Sharing Platform and Threat Sharing", category: "osint_tool", tags: ["malware", "sharing", "ioc"] },
    { fullName: "yeti-platform/yeti", description: "Your Everyday Threat Intelligence platform", category: "osint_tool", tags: ["threat-intel", "ioc", "platform"] },
    { fullName: "InQuest/ThreatIngestor", description: "Extract and aggregate threat intelligence from various sources", category: "automation", tags: ["threat-intel", "ingest", "automation"] },
  ],
  "Data Analysis & Visualization": [
    { fullName: "pudo/aleph", description: "Toolkit for investigative data analysis", category: "osint_tool", tags: ["investigation", "data", "analysis"] },
    { fullName: "neo4j/neo4j", description: "Graph database for connected data", category: "data_source", tags: ["graph", "database", "relationships"] },
    { fullName: "maltego/trx", description: "Maltego Transform Library for Python", category: "osint_tool", tags: ["maltego", "transforms", "graph"] },
    { fullName: "obsidianmd/obsidian-releases", description: "Knowledge base that works on local Markdown files", category: "other", tags: ["notes", "knowledge", "markdown"] },
  ],
  "Automation & Frameworks": [
    { fullName: "projectdiscovery/notify", description: "Stream output of tools to multiple platforms", category: "automation", tags: ["notification", "automation", "pipeline"] },
    { fullName: "hahwul/dalfox", description: "Parameter analysis and XSS scanning tool", category: "security", tags: ["xss", "scanning", "security"] },
    { fullName: "six2dez/reconftw", description: "Automated recon toolkit for bug bounty and pentesting", category: "automation", tags: ["recon", "automation", "toolkit"] },
    { fullName: "yogeshojha/rengine", description: "Automated reconnaissance framework for web applications", category: "automation", tags: ["recon", "web", "automation"] },
  ],
  "AI & Machine Learning": [
    { fullName: "ultralytics/ultralytics", description: "YOLOv8 — state-of-the-art object detection, segmentation, and classification", category: "ml_ai", tags: ["yolo", "detection", "vision"] },
    { fullName: "openai/whisper", description: "Robust speech recognition via large-scale weak supervision", category: "ml_ai", tags: ["speech", "transcription", "audio"] },
    { fullName: "huggingface/transformers", description: "State-of-the-art Machine Learning for PyTorch, TensorFlow, and JAX", category: "ml_ai", tags: ["nlp", "ml", "transformers"] },
    { fullName: "langchain-ai/langchain", description: "Build context-aware reasoning applications", category: "ml_ai", tags: ["llm", "agents", "rag"] },
  ],
};

export function getAllCuratedTools(): CuratedTool[] {
  return Object.values(OSINT_COLLECTIONS).flat();
}

export function getCuratedCategories(): string[] {
  return Object.keys(OSINT_COLLECTIONS);
}

// ── GitHub API Functions ──────────────────────────────────────

export async function searchRepos(
  query: string,
  sort: "stars" | "forks" | "updated" | "best-match" = "stars",
  page = 1,
  perPage = 20
): Promise<GHSearchResult> {
  try {
    const resp = await axios.get(`${GH_API}/search/repositories`, {
      headers: HEADERS,
      params: { q: query, sort: sort === "best-match" ? undefined : sort, order: "desc", page, per_page: perPage },
      timeout: 10000,
    });
    return resp.data;
  } catch (err: any) {
    if (err.response?.status === 403) {
      return { total_count: 0, incomplete_results: true, items: [] };
    }
    throw err;
  }
}

export async function searchOSINTRepos(
  topic: string,
  page = 1
): Promise<GHSearchResult> {
  const query = `${topic} topic:osint OR topic:security OR topic:intelligence OR topic:recon`;
  return searchRepos(query, "stars", page, 20);
}

export async function getRepoDetails(owner: string, repo: string): Promise<GHRepo> {
  const resp = await axios.get(`${GH_API}/repos/${owner}/${repo}`, {
    headers: HEADERS,
    timeout: 10000,
  });
  return resp.data;
}

export async function getRepoReadme(owner: string, repo: string): Promise<string | null> {
  try {
    const resp = await axios.get(`${GH_API}/repos/${owner}/${repo}/readme`, {
      headers: { ...HEADERS, Accept: "application/vnd.github.v3.raw" },
      timeout: 10000,
    });
    return typeof resp.data === "string" ? resp.data.slice(0, 5000) : null;
  } catch {
    return null;
  }
}

export async function getRepoLanguages(owner: string, repo: string): Promise<Record<string, number>> {
  try {
    const resp = await axios.get(`${GH_API}/repos/${owner}/${repo}/languages`, {
      headers: HEADERS,
      timeout: 10000,
    });
    return resp.data;
  } catch {
    return {};
  }
}

export async function getRepoCommits(
  owner: string,
  repo: string,
  count = 5
): Promise<{ sha: string; message: string; date: string; author: string }[]> {
  try {
    const resp = await axios.get(`${GH_API}/repos/${owner}/${repo}/commits`, {
      headers: HEADERS,
      params: { per_page: count },
      timeout: 10000,
    });
    return resp.data.map((c: any) => ({
      sha: c.sha.slice(0, 7),
      message: (c.commit?.message || "").split("\n")[0].slice(0, 120),
      date: c.commit?.author?.date || "",
      author: c.commit?.author?.name || c.author?.login || "unknown",
    }));
  } catch {
    return [];
  }
}

export async function analyzeRepo(owner: string, repo: string): Promise<RepoAnalysis> {
  const [repoData, readme, languages, recentCommits] = await Promise.all([
    getRepoDetails(owner, repo),
    getRepoReadme(owner, repo),
    getRepoLanguages(owner, repo),
    getRepoCommits(owner, repo, 5),
  ]);

  const daysSinceLastPush = Math.floor(
    (Date.now() - new Date(repoData.pushed_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  const securityIndicators = {
    hasSecurityPolicy: false,
    hasCodeOfConduct: false,
    licenseName: repoData.license?.name || null,
    isArchived: repoData.archived,
    daysSinceLastPush,
    openIssueRatio: repoData.open_issues_count / Math.max(repoData.stargazers_count, 1),
  };

  const osintKeywords = [
    "osint", "intelligence", "recon", "security", "threat", "forensic",
    "scanner", "enumeration", "hunting", "investigation", "surveillance",
    "monitor", "scraper", "crawler", "analysis", "geospatial", "cyber",
  ];

  const textToSearch = [
    repoData.description || "",
    ...(repoData.topics || []),
    readme?.slice(0, 2000) || "",
  ].join(" ").toLowerCase();

  const matchedKeywords = osintKeywords.filter(kw => textToSearch.includes(kw));
  const categories: string[] = [];

  if (matchedKeywords.some(k => ["osint", "intelligence", "investigation"].includes(k))) categories.push("OSINT");
  if (matchedKeywords.some(k => ["security", "scanner"].includes(k))) categories.push("Security");
  if (matchedKeywords.some(k => ["recon", "enumeration", "hunting"].includes(k))) categories.push("Reconnaissance");
  if (matchedKeywords.some(k => ["threat", "forensic", "cyber"].includes(k))) categories.push("Threat Intel");
  if (matchedKeywords.some(k => ["geospatial"].includes(k))) categories.push("Geospatial");
  if (matchedKeywords.some(k => ["scraper", "crawler", "monitor"].includes(k))) categories.push("Data Collection");

  let score = Math.min(30, Math.floor(Math.log10(Math.max(repoData.stargazers_count, 1)) * 10));
  score += Math.min(20, matchedKeywords.length * 4);
  score += daysSinceLastPush < 30 ? 20 : daysSinceLastPush < 90 ? 10 : daysSinceLastPush < 365 ? 5 : 0;
  score += repoData.topics?.some(t => ["osint", "security", "intelligence"].includes(t)) ? 15 : 0;
  score += repoData.license ? 5 : 0;
  score += !repoData.archived ? 10 : 0;
  score = Math.min(100, score);

  return {
    repo: repoData,
    readme,
    languages,
    recentCommits,
    securityIndicators,
    osintRelevance: { score, categories, keywords: matchedKeywords },
  };
}

export async function searchUsers(query: string, page = 1): Promise<{ total_count: number; items: GHUser[] }> {
  try {
    const resp = await axios.get(`${GH_API}/search/users`, {
      headers: HEADERS,
      params: { q: query, page, per_page: 10 },
      timeout: 10000,
    });
    return resp.data;
  } catch {
    return { total_count: 0, items: [] };
  }
}

export async function getTrendingRepos(language?: string): Promise<GHRepo[]> {
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const dateStr = since.toISOString().split("T")[0];
  const langFilter = language ? `+language:${language}` : "";
  const query = `created:>${dateStr}${langFilter}`;
  const result = await searchRepos(query, "stars", 1, 15);
  return result.items;
}
