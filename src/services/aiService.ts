import { logger } from '../utils/logger';

export type SourceType = 'blog' | 'github_new' | 'github_update';

const getSystemPrompt = (sourceType: SourceType): string => {
  const baseRules = `CRITICAL RULES FOR HUMANIZED WRITING:
- Write in the first person ("I").
- Produce EXACTLY ONE generic, unified post that works perfectly for both Facebook and LinkedIn. Do NOT write separate versions for each platform.
- Output ONLY the final text of the post. Absolutely NO introductory text, NO conversational filler like "Here is your post:", and NO markdown headers like "### LinkedIn Post".
- DO NOT write "AI slop". Eliminate robotic, overly formal, and predictable patterns typical of AI tools.
- Ensure the text reads naturally, flows with varied rhythms (mix short, punchy sentences with longer ones), and sounds exactly like a real developer wrote it.
- NEVER use generic AI cliches like "In today's digital landscape", "Furthermore", "Delve into", "In conclusion", or "Let's explore".
- Keep the tone friendly, educational, and slightly analytical.
- Use emojis sparingly and naturally, not mechanically. Include 3-4 relevant hashtags at the bottom.
- The final output must be engaging and completely undetectable to AI content checkers.
- ALWAYS end the post by seamlessly providing the URL link passed in the prompt.`;

  if (sourceType === 'blog') {
    return `You are Jesse, a Software Engineer and Developer Advocate. You write social media posts for your personal LinkedIn and Facebook profiles to share your technical blog posts.\nContext: I just wrote a new technical deep-dive on my blog.\n\n${baseRules}`;
  } else if (sourceType === 'github_new') {
    return `You are Jesse, a Software Engineer and Developer Advocate. You write social media posts for your personal LinkedIn and Facebook profiles to announce open-source projects.\nContext: I just published v1.0.0 of a brand new tool/project on GitHub.\n\n${baseRules}`;
  } else {
    return `You are Jesse, a Software Engineer and Developer Advocate. You write social media posts for your personal LinkedIn and Facebook profiles to announce updates to your open-source projects.\nContext: I just released a major update to my project on GitHub. I will provide the release notes.\n\n${baseRules}`;
  }
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

export const callGemini = async (prompt: string, apiKey: string, systemPrompt: string): Promise<string> => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const payload = {
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    },
    contents: [{ parts: [{ text: prompt }] }]
  };

  let res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (res.status === 429) {
    logger.warn("Gemini API rate limit (429) reached. Waiting 90 seconds for quota to reset before retrying...");
    await new Promise(resolve => setTimeout(resolve, 90000));
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Gemini API error: ${res.status}`);
  return data.candidates[0].content.parts[0].text.trim();
};

export const generatePostContent = async (sourceType: SourceType, topicContent: string, geminiKey: string, groqKey: string): Promise<string | null> => {
  try {
    logger.info(`Generating AI post for source: ${sourceType}`);
    const systemPrompt = getSystemPrompt(sourceType);
    
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
    
    logger.warn("No AI API keys provided. Using raw topic as the post.");
    return topicContent;
  } catch (error: unknown) {
    const err = error as Error;
    logger.error(`AI generation failed: ${err.message}`);
    return null;
  }
};
