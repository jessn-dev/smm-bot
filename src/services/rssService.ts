import { XMLParser } from 'fast-xml-parser';
import path from 'path';
import { logger } from '../utils/logger';
import { getPublishedPlatforms, markPlatformPublished } from './stateStore';

export interface RssPost {
  id: string;
  title: string;
  link: string;
  pubDate: string;
}

export const LAST_POST_FILE = path.join(process.cwd(), '.last_post_id');

const toRssPost = (item: any): RssPost => {
  const titleSlug = String(item.title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const dateStr = new Date(item.pubDate).toISOString().split('T')[0];
  return {
    id: `${titleSlug}_${dateStr}`,
    title: item.title,
    link: item.link,
    pubDate: item.pubDate,
  };
};

/**
 * Return every item currently in the feed, newest first. Callers filter
 * against the seen-set so a burst of new posts between runs isn't lost.
 */
export const getRssPosts = async (): Promise<RssPost[]> => {
  try {
    const res = await fetch('https://jessn-dev.github.io/engineering-blog/rss.xml');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xmlData = await res.text();

    const parser = new XMLParser();
    const jsonObj = parser.parse(xmlData);

    const items = jsonObj.rss?.channel?.item;
    if (!items) return [];

    const list = Array.isArray(items) ? items : [items];
    return list.map(toRssPost);
  } catch (error) {
    logger.error(`Error fetching RSS: ${(error as Error).message}`);
    return [];
  }
};

export const getPublishedPlatformsForPost = (id: string): Set<string> => {
  return getPublishedPlatforms(LAST_POST_FILE, id);
};

export const markPostPublishedOn = (id: string, platform: string) => {
  markPlatformPublished(LAST_POST_FILE, id, platform);
};
