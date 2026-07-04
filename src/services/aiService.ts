import { logger } from '../utils/logger';

export type SourceType =
  | 'blog'
  | 'github_new'
  | 'github_major'
  | 'github_minor'
  | 'github_patch';

export type Platform = 'facebook' | 'linkedin';

/**
 * Map a release to a post flavor. A repo's first-ever stable release is a
 * launch; otherwise the trailing-zero shape of the semver tag tells us the
 * bump magnitude (X.0.0 major, X.Y.0 minor, X.Y.Z patch).
 */
export const classifyRelease = (tagName: string, isFirstRelease: boolean): SourceType => {
  if (isFirstRelease) return 'github_new';

  const match = tagName.replace(/^v/i, '').match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return 'github_minor'; // Unparseable tag: treat as a generic update.

  const [, , minor, patch] = match;
  if (Number(patch) > 0) return 'github_patch';
  if (Number(minor) > 0) return 'github_minor';
  return 'github_major'; // X.0.0
};

const getSystemPrompt = (sourceType: SourceType, platform: Platform): string => {
  const baseRules = `CRITICAL RULES FOR HUMANIZED WRITING:
- Write in the first person ("I").
- Output ONLY the final text of the post. Absolutely NO introductory text, NO conversational filler like "Here is your post:", and NO markdown headers like "### LinkedIn Post".
- DO NOT write "AI slop". Eliminate robotic, overly formal, and predictable patterns typical of AI tools.
- Ensure the text reads naturally, flows with varied rhythms (mix short, punchy sentences with longer ones), and sounds exactly like a real developer wrote it.
- NEVER use generic AI cliches like "In today's digital landscape", "Furthermore", "Delve into", "In conclusion", or "Let's explore".
- Keep the tone friendly, educational, and slightly analytical.
- Use emojis sparingly and naturally, not mechanically. Include 3-4 relevant hashtags at the bottom.
- ALWAYS end the post by seamlessly providing the URL link passed in the prompt.

AVOID THESE AI TELLS (hard constraints):
- NEVER use em dashes or en dashes (— or –). Use periods, commas, colons, or restructure the sentence.
- Use straight quotes ('), never curly/smart quotes.
- No signposting or announcements ("Let's dive in", "here's what you need to know", "buckle up").
- No forced rule-of-three groupings (e.g. "faster, cleaner, and simpler").
- No negative parallelism ("It's not just X, it's Y").
- No aphorism formulas ("X is the Y of Z").
- No manufactured punchlines or one-word staccato drama for effect.
- No generic positive wrap-up sentence that adds nothing.
- Prefer the verb "is" over hedges like "serves as", "acts as", "stands as".
- No mechanical boldfacing of phrases and no Title Case Headings inside the post.
- Drop filler: "in order to", "due to the fact that", "at the end of the day".`;

  let platformRules: string;
  if (platform === 'linkedin') {
    platformRules = `\nCRITICAL LINKEDIN RULES:\n- Format the post for a professional networking audience.\n- Aggressively scan the provided text for any companies, software products, or frameworks mentioned. Generate highly targeted hashtags for them at the bottom of the post (e.g., #ReactJS, #GoogleCloud, #AWS) to maximize discoverability.`;
  } else {
    platformRules = `\nCRITICAL FACEBOOK RULES:\n- Format the post for a broader, slightly more casual audience.`;
  }

  const combinedRules = baseRules + platformRules;

  const persona = `You are Jesse, a Software Engineer and Developer Advocate writing on your personal LinkedIn and Facebook.`;

  const context: Record<SourceType, string> = {
    blog: `Context: I just published a new technical deep-dive on my blog.
Goal: Hook the reader with the core problem or insight, tease what they'll learn, and invite them to read the full article. Do not summarize the whole post — leave curiosity on the table.`,

    github_new: `Context: I just shipped the FIRST public release of a brand-new open-source project on GitHub. This is a launch announcement.
Goal: Explain in one or two lines what the project does and the pain it removes. Convey genuine builder excitement (not hype). Invite people to try it, star it, and give feedback. Lead with the problem it solves, not the version number.`,

    github_major: `Context: I just shipped a MAJOR version of my open-source project (a X.0.0 release) — expect breaking changes and headline features.
Goal: Lead with the single biggest change and why it matters. Briefly flag that it's a major version so users know to check for breaking changes/migration. Keep it energetic but honest.`,

    github_minor: `Context: I just shipped a MINOR update to my open-source project (new features, backward compatible).
Goal: Highlight the one or two most useful new features from the release notes and what they unlock for users. Keep it upbeat and concrete.`,

    github_patch: `Context: I just shipped a PATCH release for my open-source project (bug fixes / small improvements, no new features).
Goal: Keep it short and low-key. Note the key fixes or stability wins from the notes. Thank anyone who reported issues if relevant. Don't oversell a patch.`,
  };

  return `${persona}\n${context[sourceType]}\n\n${combinedRules}`;
};

export const callGroq = async (prompt: string, apiKey: string, systemPrompt: string): Promise<string> => {
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ]
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Groq API error: ${res.status}`);
  return data.choices[0].message.content.trim();
};

// Tried in order. If one is rate-limited (429) or errors, fall through to the
// next before ever touching Groq. Each Gemini model has its own free quota.
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.5-flash'];

const callGeminiModel = async (prompt: string, apiKey: string, systemPrompt: string, model: string): Promise<string> => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const payload = {
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    },
    contents: [{ parts: [{ text: prompt }] }]
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Gemini ${model} error: ${res.status}`);
  return data.candidates[0].content.parts[0].text.trim();
};

export const callGemini = async (prompt: string, apiKey: string, systemPrompt: string): Promise<string> => {
  let lastError: Error | null = null;

  for (const model of GEMINI_MODELS) {
    try {
      logger.info(`Trying Gemini model: ${model}`);
      return await callGeminiModel(prompt, apiKey, systemPrompt, model);
    } catch (error: unknown) {
      lastError = error as Error;
      logger.warn(`Gemini model ${model} failed: ${lastError.message}. Trying next model...`);
    }
  }

  // All Gemini models exhausted; let the caller fall back to Groq.
  throw lastError ?? new Error('All Gemini models failed');
};

export const generatePostContent = async (sourceType: SourceType, platform: Platform, topicContent: string, geminiKey: string, groqKey: string): Promise<string | null> => {
  try {
    logger.info(`Generating AI post for source: ${sourceType}, platform: ${platform}`);
    const systemPrompt = getSystemPrompt(sourceType, platform);
    
    if (geminiKey) {
      try {
        return await callGemini(topicContent, geminiKey, systemPrompt);
      } catch (geminiError: unknown) {
        logger.warn(`Gemini API failed: ${(geminiError as Error).message}. Falling back to Groq...`);
        if (groqKey) {
          return await callGroq(topicContent, groqKey, systemPrompt);
        } else {
          throw geminiError;
        }
      }
    } else if (groqKey) {
      return await callGroq(topicContent, groqKey, systemPrompt);
    }
    
    logger.warn("No AI API keys provided. Skipping post generation.");
    return null;
  } catch (error: unknown) {
    const err = error as Error;
    logger.error(`AI generation failed: ${err.message}`);
    return null;
  }
};
