import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

export interface GithubRelease {
  repoName: string;
  tagName: string;
  body: string;
  htmlUrl: string;
}

const LAST_RELEASE_FILE = path.join(process.cwd(), '.last_github_release_id');

export const getLatestReleaseEvent = async (): Promise<GithubRelease | null> => {
  try {
    const res = await fetch('https://api.github.com/users/jessn-dev/events/public', {
      headers: {
        'User-Agent': 'smm-bot'
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const events = await res.json();
    
    const releaseEvent = events.find((e: any) => e.type === 'ReleaseEvent');
    if (!releaseEvent) return null;
    
    return {
      repoName: releaseEvent.repo.name,
      tagName: releaseEvent.payload.release.tag_name,
      body: releaseEvent.payload.release.body,
      htmlUrl: releaseEvent.payload.release.html_url
    };
  } catch (error) {
    logger.error(`Error fetching GitHub events: ${(error as Error).message}`);
    return null;
  }
};

export const hasReleaseBeenPublished = (releaseUrl: string): boolean => {
  if (!fs.existsSync(LAST_RELEASE_FILE)) return false;
  const lastUrl = fs.readFileSync(LAST_RELEASE_FILE, 'utf-8').trim();
  return lastUrl === releaseUrl;
};

export const markReleaseAsPublished = (releaseUrl: string) => {
  fs.writeFileSync(LAST_RELEASE_FILE, releaseUrl, 'utf-8');
};
