export interface AppConfig {
  facebookPageId: string;
  facebookAccessToken: string;
  linkedinUserId: string;
  linkedinAccessToken: string;
  geminiApiKey: string;
  groqApiKey: string;
  githubTargetRepos: string[];
  githubToken: string;
}

export const getConfig = (): AppConfig => {
  return {
    facebookPageId: process.env.FACEBOOK_PAGE_ID || '',
    facebookAccessToken: process.env.FACEBOOK_ACCESS_TOKEN || '',
    linkedinUserId: process.env.LINKEDIN_USER_ID || '',
    linkedinAccessToken: process.env.LINKEDIN_ACCESS_TOKEN || '',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    groqApiKey: process.env.GROQ_API_KEY || '',
    // Comma-separated list of "owner/repo" to scan for releases.
    githubTargetRepos: (process.env.TARGET_REPOS || '')
      .split(',')
      .map(r => r.trim())
      .filter(r => r.length > 0),
    githubToken: process.env.GITHUB_TOKEN || '',
  };
};
