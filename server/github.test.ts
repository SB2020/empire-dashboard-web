import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock axios to avoid hitting real GitHub API in tests
vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
  },
}));

import axios from "axios";
const mockGet = vi.mocked(axios.get);

import {
  searchRepos,
  searchOSINTRepos,
  getRepoDetails,
  getRepoReadme,
  getRepoLanguages,
  getRepoCommits,
  analyzeRepo,
  searchUsers,
  getTrendingRepos,
  getAllCuratedTools,
  getCuratedCategories,
  OSINT_COLLECTIONS,
} from "./github";

// ── Test Data ──────────────────────────────────────────────────

const MOCK_REPO = {
  id: 12345,
  full_name: "test/osint-tool",
  owner: { login: "test", avatar_url: "https://example.com/avatar.png" },
  name: "osint-tool",
  description: "An OSINT intelligence gathering tool for security researchers",
  html_url: "https://github.com/test/osint-tool",
  language: "Python",
  stargazers_count: 5000,
  forks_count: 800,
  open_issues_count: 42,
  topics: ["osint", "security", "intelligence"],
  created_at: "2023-01-15T00:00:00Z",
  updated_at: "2026-02-20T00:00:00Z",
  pushed_at: "2026-02-19T00:00:00Z",
  license: { spdx_id: "MIT", name: "MIT License" },
  size: 15000,
  default_branch: "main",
  archived: false,
  fork: false,
};

const MOCK_SEARCH_RESULT = {
  total_count: 150,
  incomplete_results: false,
  items: [MOCK_REPO],
};

// ── Tests ──────────────────────────────────────────────────────

describe("GitHub OSINT Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("searchRepos", () => {
    it("should search repos with query and return results", async () => {
      mockGet.mockResolvedValueOnce({ data: MOCK_SEARCH_RESULT });

      const result = await searchRepos("osint tools", "stars", 1, 20);

      expect(result.total_count).toBe(150);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].full_name).toBe("test/osint-tool");
      expect(mockGet).toHaveBeenCalledWith(
        "https://api.github.com/search/repositories",
        expect.objectContaining({
          params: expect.objectContaining({ q: "osint tools", order: "desc" }),
        })
      );
    });

    it("should handle 403 rate limit gracefully", async () => {
      mockGet.mockRejectedValueOnce({ response: { status: 403 } });

      const result = await searchRepos("test", "stars");

      expect(result.total_count).toBe(0);
      expect(result.incomplete_results).toBe(true);
      expect(result.items).toHaveLength(0);
    });

    it("should pass best-match sort without sort param", async () => {
      mockGet.mockResolvedValueOnce({ data: MOCK_SEARCH_RESULT });

      await searchRepos("test", "best-match");

      expect(mockGet).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({ sort: undefined }),
        })
      );
    });
  });

  describe("searchOSINTRepos", () => {
    it("should append OSINT topic filters to query", async () => {
      mockGet.mockResolvedValueOnce({ data: MOCK_SEARCH_RESULT });

      await searchOSINTRepos("network scanner");

      const callParams = mockGet.mock.calls[0][1]?.params;
      expect(callParams.q).toContain("network scanner");
      expect(callParams.q).toContain("topic:osint");
    });
  });

  describe("getRepoDetails", () => {
    it("should fetch repo details by owner/repo", async () => {
      mockGet.mockResolvedValueOnce({ data: MOCK_REPO });

      const result = await getRepoDetails("test", "osint-tool");

      expect(result.full_name).toBe("test/osint-tool");
      expect(result.stargazers_count).toBe(5000);
      expect(mockGet).toHaveBeenCalledWith(
        "https://api.github.com/repos/test/osint-tool",
        expect.any(Object)
      );
    });
  });

  describe("getRepoReadme", () => {
    it("should fetch and truncate README content", async () => {
      const longReadme = "A".repeat(6000);
      mockGet.mockResolvedValueOnce({ data: longReadme });

      const result = await getRepoReadme("test", "osint-tool");

      expect(result).toHaveLength(5000);
    });

    it("should return null when README not found", async () => {
      mockGet.mockRejectedValueOnce(new Error("404"));

      const result = await getRepoReadme("test", "no-readme");

      expect(result).toBeNull();
    });
  });

  describe("getRepoLanguages", () => {
    it("should return language breakdown", async () => {
      mockGet.mockResolvedValueOnce({ data: { Python: 50000, JavaScript: 20000 } });

      const result = await getRepoLanguages("test", "osint-tool");

      expect(result.Python).toBe(50000);
      expect(result.JavaScript).toBe(20000);
    });

    it("should return empty object on error", async () => {
      mockGet.mockRejectedValueOnce(new Error("fail"));

      const result = await getRepoLanguages("test", "fail");

      expect(result).toEqual({});
    });
  });

  describe("getRepoCommits", () => {
    it("should return formatted commit list", async () => {
      mockGet.mockResolvedValueOnce({
        data: [
          {
            sha: "abc1234567890",
            commit: {
              message: "Fix security vulnerability\nDetailed description",
              author: { name: "Alice", date: "2026-02-19T10:00:00Z" },
            },
            author: { login: "alice" },
          },
        ],
      });

      const result = await getRepoCommits("test", "osint-tool", 5);

      expect(result).toHaveLength(1);
      expect(result[0].sha).toBe("abc1234");
      expect(result[0].message).toBe("Fix security vulnerability");
      expect(result[0].author).toBe("Alice");
    });

    it("should return empty array on error", async () => {
      mockGet.mockRejectedValueOnce(new Error("fail"));

      const result = await getRepoCommits("test", "fail");

      expect(result).toEqual([]);
    });
  });

  describe("analyzeRepo", () => {
    it("should return comprehensive analysis with OSINT relevance score", async () => {
      mockGet
        .mockResolvedValueOnce({ data: MOCK_REPO })
        .mockResolvedValueOnce({ data: "# OSINT Tool\nA tool for intelligence gathering and security research." })
        .mockResolvedValueOnce({ data: { Python: 50000, Shell: 5000 } })
        .mockResolvedValueOnce({ data: [] });

      const result = await analyzeRepo("test", "osint-tool");

      expect(result.repo.full_name).toBe("test/osint-tool");
      expect(result.languages.Python).toBe(50000);
      expect(result.osintRelevance.score).toBeGreaterThan(0);
      expect(result.osintRelevance.categories.length).toBeGreaterThan(0);
      expect(result.osintRelevance.keywords).toContain("osint");
      expect(result.securityIndicators.licenseName).toBe("MIT License");
      expect(result.securityIndicators.isArchived).toBe(false);
    });
  });

  describe("searchUsers", () => {
    it("should search GitHub users", async () => {
      mockGet.mockResolvedValueOnce({
        data: {
          total_count: 5,
          items: [{ login: "securityresearcher", followers: 1000 }],
        },
      });

      const result = await searchUsers("security researcher");

      expect(result.total_count).toBe(5);
      expect(result.items[0].login).toBe("securityresearcher");
    });

    it("should return empty on error", async () => {
      mockGet.mockRejectedValueOnce(new Error("fail"));

      const result = await searchUsers("fail");

      expect(result.total_count).toBe(0);
      expect(result.items).toEqual([]);
    });
  });

  describe("getTrendingRepos", () => {
    it("should search for recently created repos sorted by stars", async () => {
      mockGet.mockResolvedValueOnce({ data: { ...MOCK_SEARCH_RESULT, items: [MOCK_REPO] } });

      const result = await getTrendingRepos();

      expect(result).toHaveLength(1);
      const callParams = mockGet.mock.calls[0][1]?.params;
      expect(callParams.q).toContain("created:>");
    });

    it("should filter by language when specified", async () => {
      mockGet.mockResolvedValueOnce({ data: { ...MOCK_SEARCH_RESULT, items: [] } });

      await getTrendingRepos("Python");

      const callParams = mockGet.mock.calls[0][1]?.params;
      expect(callParams.q).toContain("language:Python");
    });
  });

  describe("Curated Collections", () => {
    it("should return all curated tools as flat list", () => {
      const tools = getAllCuratedTools();

      expect(tools.length).toBeGreaterThan(20);
      expect(tools[0]).toHaveProperty("fullName");
      expect(tools[0]).toHaveProperty("description");
      expect(tools[0]).toHaveProperty("category");
      expect(tools[0]).toHaveProperty("tags");
    });

    it("should return curated category names", () => {
      const categories = getCuratedCategories();

      expect(categories).toContain("Reconnaissance");
      expect(categories).toContain("Network Intelligence");
      expect(categories).toContain("Threat Intelligence");
      expect(categories).toContain("AI & Machine Learning");
      expect(categories.length).toBeGreaterThanOrEqual(7);
    });

    it("should have valid structure for all curated tools", () => {
      for (const [category, tools] of Object.entries(OSINT_COLLECTIONS)) {
        expect(category.length).toBeGreaterThan(0);
        for (const tool of tools) {
          expect(tool.fullName).toMatch(/^[^/]+\/[^/]+$/);
          expect(tool.description.length).toBeGreaterThan(0);
          expect(tool.tags.length).toBeGreaterThan(0);
        }
      }
    });
  });
});
