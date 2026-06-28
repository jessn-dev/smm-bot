import { logger } from '../utils/logger';

export const postToFacebook = async (message: string, pageId: string, accessToken: string, linkUrl?: string): Promise<boolean> => {
  if (!pageId || !accessToken) {
    logger.warn('Facebook credentials missing. Skipping Facebook post.');
    return false;
  }

  try {
    logger.info(`Posting to Facebook Page: ${pageId}...`);
    const url = `https://graph.facebook.com/v19.0/${pageId}/feed`;
    
    const params = new URLSearchParams();
    params.append('message', message);
    if (linkUrl) params.append('link', linkUrl);
    params.append('access_token', accessToken);

    const res = await fetch(url, {
      method: 'POST',
      body: params
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || `HTTP Error ${res.status}`);
    }

    logger.info(`Successfully posted to Facebook! Post ID: ${data.id}`);
    return true;
  } catch (error: unknown) {
    const err = error as Error;
    logger.error(`Failed to post to Facebook: ${err.message}`);
    return false;
  }
};
