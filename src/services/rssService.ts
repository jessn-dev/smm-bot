import { XMLParser } from 'fast-xml-parser';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

export interface RssPost {
  title: string;
  link: string;
  pubDate: string;
}

const LAST_POST_FILE = path.join(process.cwd(), '.last_post_id');

export const getLatestRssPost = async (): Promise<RssPost | null> => {
  try {
    const res = await fetch('https://jessn-dev.github.io/engineering-blog/rss.xml');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xmlData = await res.text();
    
    const parser = new XMLParser();
    const jsonObj = parser.parse(xmlData);
    
    const items = jsonObj.rss?.channel?.item;
    if (!items) return null;
    
    const latestItem = Array.isArray(items) ? items[0] : items;
    
    return {
      title: latestItem.title,
      link: latestItem.link,
      pubDate: latestItem.pubDate
    };
  } catch (error) {
    logger.error(`Error fetching RSS: ${(error as Error).message}`);
    return null;
  }
};

export const hasPostBeenPublished = (link: string): boolean => {
  if (!fs.existsSync(LAST_POST_FILE)) return false;
  const lastLink = fs.readFileSync(LAST_POST_FILE, 'utf-8').trim();
  return lastLink === link;
};

export const markPostAsPublished = (link: string) => {
  fs.writeFileSync(LAST_POST_FILE, link, 'utf-8');
};
