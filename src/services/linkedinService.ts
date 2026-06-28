import { logger } from '../utils/logger';

export const postToLinkedIn = async (message: string, authorUrn: string, accessToken: string): Promise<boolean> => {
  if (!authorUrn || !accessToken) {
    logger.warn('LinkedIn credentials missing. Skipping LinkedIn post.');
    return false;
  }

  try {
    logger.info('Posting to LinkedIn Profile...');
    const url = 'https://api.linkedin.com/v2/ugcPosts';
    
    const payload = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: message
          },
          shareMediaCategory: 'NONE'
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
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
