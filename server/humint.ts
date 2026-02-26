/**
 * HUMINT — Human Intelligence Profiling Service
 * Cross-references multiple OSINT sources to build person dossiers.
 * Uses: LinkedIn API, Twitter API, public records fusion via LLM.
 */
import { callDataApi } from "./_core/dataApi";
import { invokeLLM } from "./_core/llm";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PersonProfile {
  name: string;
  aliases: string[];
  bio: string;
  location: string;
  occupation: string;
  company: string;
  linkedin: LinkedInProfile | null;
  twitter: TwitterProfile | null;
  riskAssessment: string;
  connections: string[];
  timeline: TimelineEvent[];
  confidence: number; // 0-100
  sources: string[];
  rawIntel: string;
}

export interface LinkedInProfile {
  fullName: string;
  headline: string;
  location: string;
  profileUrl: string;
  profilePicture: string | null;
  username: string;
  summary: string;
}

export interface TwitterProfile {
  username: string;
  displayName: string;
  bio: string;
  location: string;
  followers: number;
  following: number;
  tweets: number;
  verified: boolean;
  blueVerified: boolean;
  profileImage: string | null;
  createdAt: string;
  recentTweets: TweetData[];
}

export interface TweetData {
  id: string;
  text: string;
  createdAt: string;
  likes: number;
  retweets: number;
  replies: number;
}

export interface TimelineEvent {
  date: string;
  event: string;
  source: string;
  significance: "low" | "medium" | "high" | "critical";
}

// ─── LinkedIn Search ────────────────────────────────────────────────────────

export async function searchLinkedIn(query: {
  keywords?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  title?: string;
}): Promise<LinkedInProfile[]> {
  try {
    const params: Record<string, string> = {};
    if (query.keywords) params.keywords = query.keywords;
    if (query.firstName) params.firstName = query.firstName;
    if (query.lastName) params.lastName = query.lastName;
    if (query.company) params.company = query.company;
    if (query.title) params.keywordTitle = query.title;

    const result = await callDataApi("LinkedIn/search_people", { query: params }) as any;

    if (!result?.success || !result?.data?.items) return [];

    return (result.data.items as any[]).slice(0, 10).map((p: any) => ({
      fullName: p.fullName || p.name || "Unknown",
      headline: p.headline || "",
      location: p.location || "",
      profileUrl: p.profileURL || p.url || "",
      profilePicture: p.profilePicture || null,
      username: p.username || "",
      summary: p.summary || "",
    }));
  } catch (error) {
    console.error("[HUMINT] LinkedIn search failed:", error);
    return [];
  }
}

// ─── Twitter Profile Lookup ─────────────────────────────────────────────────

export async function getTwitterProfile(username: string): Promise<TwitterProfile | null> {
  try {
    const result = await callDataApi("Twitter/get_user_profile_by_username", {
      query: { username },
    }) as any;

    if (!result) return null;

    // Navigate nested structure: result.data.user.result
    const userData = result?.result?.data?.user?.result || result?.data?.user?.result || result;
    if (!userData) return null;

    const core = userData.core || {};
    const legacy = userData.legacy || {};
    const avatar = userData.avatar || {};
    const verification = userData.verification || {};

    const profile: TwitterProfile = {
      username: core.screen_name || username,
      displayName: core.name || legacy.name || "Unknown",
      bio: legacy.description || "",
      location: userData.location?.location || legacy.location || "",
      followers: legacy.followers_count || 0,
      following: legacy.friends_count || 0,
      tweets: legacy.statuses_count || 0,
      verified: verification.verified || false,
      blueVerified: userData.is_blue_verified || false,
      profileImage: avatar.image_url || legacy.profile_image_url_https || null,
      createdAt: core.created_at || "",
      recentTweets: [],
    };

    // Try to get recent tweets
    const restId = userData.rest_id;
    if (restId) {
      try {
        const tweetsResult = await callDataApi("Twitter/get_user_tweets", {
          query: { user: restId, count: "5" },
        }) as any;

        if (tweetsResult?.result?.timeline?.instructions) {
          for (const instruction of tweetsResult.result.timeline.instructions) {
            if (instruction.type === "TimelineAddEntries") {
              for (const entry of (instruction.entries || [])) {
                if (entry.entryId?.startsWith("tweet-")) {
                  const tweetResult = entry.content?.itemContent?.tweet_results?.result;
                  if (tweetResult?.legacy) {
                    const tl = tweetResult.legacy;
                    profile.recentTweets.push({
                      id: tl.id_str || tweetResult.rest_id || "",
                      text: tl.full_text || "",
                      createdAt: tl.created_at || "",
                      likes: tl.favorite_count || 0,
                      retweets: tl.retweet_count || 0,
                      replies: tl.reply_count || 0,
                    });
                  }
                }
              }
            }
          }
        }
      } catch {
        // Tweets fetch is optional
      }
    }

    return profile;
  } catch (error) {
    console.error("[HUMINT] Twitter lookup failed:", error);
    return null;
  }
}

// ─── Full Person Profile Builder ────────────────────────────────────────────

export async function buildPersonProfile(input: {
  name?: string;
  handle?: string;
  company?: string;
  additionalContext?: string;
}): Promise<PersonProfile> {
  const sources: string[] = [];
  const collectedData: { linkedin: LinkedInProfile | null; twitter: TwitterProfile | null; linkedinAll: LinkedInProfile[] } = {
    linkedin: null,
    twitter: null,
    linkedinAll: [],
  };

  // Parallel data collection
  const promises: Promise<void>[] = [];

  // LinkedIn search
  if (input.name || input.company) {
    promises.push(
      (async () => {
        const nameParts = input.name?.split(" ") || [];
        const results = await searchLinkedIn({
          keywords: input.name,
          firstName: nameParts[0],
          lastName: nameParts.length > 1 ? nameParts[nameParts.length - 1] : undefined,
          company: input.company,
        });
        if (results.length > 0) {
          collectedData.linkedin = results[0];
          collectedData.linkedinAll.push(...results);
          sources.push("LinkedIn");
        }
      })()
    );
  }

  // Twitter lookup
  if (input.handle) {
    const cleanHandle = input.handle.replace("@", "").replace("https://twitter.com/", "").replace("https://x.com/", "");
    promises.push(
      (async () => {
        collectedData.twitter = await getTwitterProfile(cleanHandle);
        if (collectedData.twitter) sources.push("Twitter/X");
      })()
    );
  }

  await Promise.allSettled(promises);

  // Build raw intel string for LLM synthesis
  let rawIntel = `HUMINT COLLECTION REPORT\n========================\n`;
  rawIntel += `Target: ${input.name || input.handle || "Unknown"}\n`;
  rawIntel += `Company: ${input.company || "Unknown"}\n\n`;

  const linkedinData = collectedData.linkedin;
  const twitterData = collectedData.twitter;
  const linkedinResults = collectedData.linkedinAll;

  if (linkedinData) {
    rawIntel += `--- LINKEDIN INTELLIGENCE ---\n`;
    rawIntel += `Name: ${linkedinData.fullName}\n`;
    rawIntel += `Headline: ${linkedinData.headline}\n`;
    rawIntel += `Location: ${linkedinData.location}\n`;
    rawIntel += `Profile: ${linkedinData.profileUrl}\n`;
    rawIntel += `Summary: ${linkedinData.summary}\n\n`;

    if (linkedinResults.length > 1) {
      rawIntel += `Additional LinkedIn matches:\n`;
      for (const r of linkedinResults.slice(1, 5)) {
        rawIntel += `- ${r.fullName} | ${r.headline} | ${r.location}\n`;
      }
      rawIntel += "\n";
    }
  }

  if (twitterData) {
    rawIntel += `--- TWITTER/X INTELLIGENCE ---\n`;
    rawIntel += `Handle: @${twitterData.username}\n`;
    rawIntel += `Display: ${twitterData.displayName}\n`;
    rawIntel += `Bio: ${twitterData.bio}\n`;
    rawIntel += `Location: ${twitterData.location}\n`;
    rawIntel += `Followers: ${twitterData.followers.toLocaleString()}\n`;
    rawIntel += `Following: ${twitterData.following.toLocaleString()}\n`;
    rawIntel += `Tweets: ${twitterData.tweets.toLocaleString()}\n`;
    rawIntel += `Verified: ${twitterData.verified} | Blue: ${twitterData.blueVerified}\n`;
    rawIntel += `Account Created: ${twitterData.createdAt}\n\n`;

    if (twitterData.recentTweets.length > 0) {
      rawIntel += `Recent Activity:\n`;
      for (const t of twitterData.recentTweets) {
        rawIntel += `[${t.createdAt}] ${t.text.substring(0, 200)} (❤${t.likes} 🔁${t.retweets})\n`;
      }
      rawIntel += "\n";
    }
  }

  if (input.additionalContext) {
    rawIntel += `--- ADDITIONAL CONTEXT ---\n${input.additionalContext}\n\n`;
  }

  // LLM synthesis into structured dossier
  const synthesisResult = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a senior intelligence analyst. Synthesize the provided OSINT data into a structured person dossier. Be precise, analytical, and identify patterns. Output a JSON object with these fields:
{
  "name": "Full name",
  "aliases": ["Known aliases or handles"],
  "bio": "Concise biographical summary (2-3 sentences)",
  "location": "Primary location",
  "occupation": "Current role/occupation",
  "company": "Current company/organization",
  "riskAssessment": "Brief risk/opportunity assessment",
  "connections": ["Notable connections or affiliations"],
  "timeline": [{"date": "YYYY-MM or description", "event": "What happened", "source": "Where this was found", "significance": "low|medium|high|critical"}],
  "confidence": 0-100
}
Respond ONLY with valid JSON.`,
      },
      { role: "user", content: rawIntel },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "person_dossier",
        strict: true,
        schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            aliases: { type: "array", items: { type: "string" } },
            bio: { type: "string" },
            location: { type: "string" },
            occupation: { type: "string" },
            company: { type: "string" },
            riskAssessment: { type: "string" },
            connections: { type: "array", items: { type: "string" } },
            timeline: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: { type: "string" },
                  event: { type: "string" },
                  source: { type: "string" },
                  significance: { type: "string" },
                },
                required: ["date", "event", "source", "significance"],
                additionalProperties: false,
              },
            },
            confidence: { type: "number" },
          },
          required: ["name", "aliases", "bio", "location", "occupation", "company", "riskAssessment", "connections", "timeline", "confidence"],
          additionalProperties: false,
        },
      },
    },
  });

  let dossier: any = {};
  try {
    const content = typeof synthesisResult.choices[0]?.message?.content === "string"
      ? synthesisResult.choices[0].message.content
      : "";
    dossier = JSON.parse(content);
  } catch {
    dossier = {
      name: input.name || input.handle || "Unknown",
      aliases: [],
      bio: "Insufficient data for synthesis",
      location: "Unknown",
      occupation: "Unknown",
      company: input.company || "Unknown",
      riskAssessment: "Unable to assess — insufficient data",
      connections: [],
      timeline: [],
      confidence: 10,
    };
  }

  return {
    name: dossier.name || input.name || "Unknown",
    aliases: dossier.aliases || [],
    bio: dossier.bio || "",
    location: dossier.location || "",
    occupation: dossier.occupation || "",
    company: dossier.company || "",
    linkedin: linkedinData,
    twitter: twitterData,
    riskAssessment: dossier.riskAssessment || "",
    connections: dossier.connections || [],
    timeline: (dossier.timeline || []).map((t: any) => ({
      date: t.date || "",
      event: t.event || "",
      source: t.source || "",
      significance: t.significance || "low",
    })),
    confidence: dossier.confidence || 0,
    sources,
    rawIntel,
  };
}

// ─── Quick Lookup (lightweight) ─────────────────────────────────────────────

export async function quickLookup(query: string): Promise<{
  twitter: TwitterProfile | null;
  linkedin: LinkedInProfile[];
}> {
  const isHandle = query.startsWith("@") || !query.includes(" ");

  const [twitter, linkedin] = await Promise.allSettled([
    isHandle ? getTwitterProfile(query.replace("@", "")) : Promise.resolve(null),
    searchLinkedIn({ keywords: query }),
  ]);

  return {
    twitter: twitter.status === "fulfilled" ? twitter.value : null,
    linkedin: linkedin.status === "fulfilled" ? linkedin.value : [],
  };
}
