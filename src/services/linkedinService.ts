import { logger } from '../utils/logger';

export const postToLinkedIn = async (message: string, authorUrn: string, accessToken: string): Promise<boolean> => {
  if (!authorUrn || !accessToken) {
    logger.warn('LinkedIn credentials missing. Skipping LinkedIn post.');
    return false;
  }

  try {
    const isCompany = authorUrn.includes('organization');
    logger.info(`Posting to LinkedIn ${isCompany ? 'Company Page' : 'Profile'}...`);
    const url = 'https://api.linkedin.com/rest/posts';
    
    const payload = {
      author: authorUrn,
      commentary: message,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: []
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'LinkedIn-Version': '202605',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`HTTP Error ${res.status}: ${errorText}`);
    }

    logger.info('Successfully posted to LinkedIn!');
    return true;
  } catch (error: unknown) {
    const err = error as Error;
    logger.error(`Failed to post to LinkedIn: ${err.message}`);
    return false;
  }
};
