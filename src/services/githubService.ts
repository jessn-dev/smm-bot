import path from 'path';
import { logger } from '../utils/logger';
import { getPublishedPlatforms, markPlatformPublished } from './stateStore';

export interface GithubRelease {
  repoName: string;
  tagName: string;
  body: string;
  htmlUrl: string;
  isFirstRelease: boolean;
}

export const LAST_RELEASE_FILE = path.join(process.cwd(), '.last_github_release_id');

const buildHeaders = (token: string): Record<string, string> => {
  const headers: Record<string, string> = {
    'User-Agent': 'smm-bot',
    'Accept': 'application/vnd.github+json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

const fetchLatestReleaseForRepo = async (repo: string, token: string): Promise<GithubRelease | null> => {
  try {
    // Pull a page of releases so we can both grab the latest stable one and
    // tell whether it's the repo's very first — impossible from a bare tag.
    const res = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=30`, {
      headers: buildHeaders(token),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const releases = await res.json();

    // Ignore drafts and prereleases; announce stable releases only.
    const stable = (releases as any[]).filter(r => !r.draft && !r.prerelease);
    if (stable.length === 0) return null;

    const latest = stable[0];
    return {
      repoName: repo,
      tagName: latest.tag_name,
      body: latest.body || '',
      htmlUrl: latest.html_url,
      isFirstRelease: stable.length === 1,
    };
  } catch (error) {
    logger.error(`Error fetching latest release for ${repo}: ${(error as Error).message}`);
    return null;
  }
};

/**
 * Fetch the latest release of every configured repo. Deterministic:
 * queries each repo's releases/latest endpoint directly instead of
 * relying on the user's public-event stream (which drops old events).
 */
export const getLatestReleases = async (repos: string[], token: string): Promise<GithubRelease[]> => {
  const results = await Promise.all(repos.map(repo => fetchLatestReleaseForRepo(repo, token)));
  return results.filter((r): r is GithubRelease => r !== null);
};

export const getPublishedPlatformsForRelease = (releaseUrl: string): Set<string> => {
  return getPublishedPlatforms(LAST_RELEASE_FILE, releaseUrl);
};

export const markReleasePublishedOn = (releaseUrl: string, platform: string) => {
  markPlatformPublished(LAST_RELEASE_FILE, releaseUrl, platform);
};
