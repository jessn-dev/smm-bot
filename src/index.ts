import { getConfig } from './config';
import { logger } from './utils/logger';
import { generatePostContent, SourceType } from './services/aiService';
import { postToFacebook } from './services/facebookService';
import { postToLinkedIn } from './services/linkedinService';
import { getLatestRssPost, hasPostBeenPublished, markPostAsPublished } from './services/rssService';
import { getLatestReleaseEvent, hasReleaseBeenPublished, markReleaseAsPublished } from './services/githubService';

const publishContent = async (content: string, config: any, linkUrl?: string) => {
  if (process.env.DRY_RUN === 'true') {
    logger.info(`\n\n====== [DRY RUN MODE] GENERATED SOCIAL MEDIA POST ======\n\n${content}\n\n========================================================\n`);
    return 1; // Return fake success to indicate the workflow succeeded
  }

  let successCount = 0;

  if (config.facebookPageId && config.facebookAccessToken) {
    const fbSuccess = await postToFacebook(content, config.facebookPageId, config.facebookAccessToken, linkUrl);
    if (fbSuccess) successCount++;
  } else {
    logger.info("Skipping Facebook: Credentials not configured.");
  }

  // Temporarily paused for testing
  /*
  if (config.linkedinUserId && config.linkedinAccessToken) {
    const liProfileSuccess = await postToLinkedIn(content, `urn:li:person:${config.linkedinUserId}`, config.linkedinAccessToken);
    if (liProfileSuccess) successCount++;
  } else {
    logger.info("Skipping LinkedIn Profile: Credentials not configured.");
  }
  */

  return successCount;
};

const pollBlogRss = async () => {
  logger.info("Polling Auto-Blogger RSS feed...");
  const config = getConfig();
  const latestPost = await getLatestRssPost();
  
  if (!latestPost) {
    logger.warn("No RSS items found or feed unreachable.");
    return;
  }

  if (hasPostBeenPublished(latestPost.link)) {
    logger.info(`Blog post already published: ${latestPost.title}`);
    return;
  }

  logger.info(`Found NEW blog post: ${latestPost.title}`);
  const prompt = `Write a social media post promoting my new blog article titled: "${latestPost.title}". Here is the link to append at the end: ${latestPost.link}`;
  
  const content = await generatePostContent('blog', prompt, config.geminiApiKey, config.groqApiKey);
  if (!content) return;

  const platformsCount = await publishContent(content, config, latestPost.link);
  
  if (platformsCount > 0) {
    markPostAsPublished(latestPost.link);
    logger.info(`Successfully marked blog post as published: ${latestPost.title}`);
  }
};

const pollGithubReleases = async () => {
  logger.info("Polling GitHub for new Release Events...");
  const config = getConfig();
  const latestRelease = await getLatestReleaseEvent();
  
  if (!latestRelease) {
    logger.info("No recent GitHub releases found.");
    return;
  }

  if (hasReleaseBeenPublished(latestRelease.htmlUrl)) {
    logger.info(`GitHub release already published: ${latestRelease.tagName} for ${latestRelease.repoName}`);
    return;
  }

  logger.info(`Found NEW GitHub release: ${latestRelease.repoName} ${latestRelease.tagName}`);
  
  // Semantic check: if it's 1.0.0, 0.1.0, 0.0.1, it's considered "new". Otherwise, it's an "update".
  // A simple regex to catch v1.0.0 or 1.0.0
  const isFirstRelease = /^v?(1\.0\.0|0\.\d+\.\d+)$/.test(latestRelease.tagName);
  const sourceType: SourceType = isFirstRelease ? 'github_new' : 'github_update';
  
  const prompt = `Write a social media post about this GitHub release. 
Repository: ${latestRelease.repoName}
Version: ${latestRelease.tagName}
Release Notes:
${latestRelease.body}

Link to append at the end: ${latestRelease.htmlUrl}`;
  
  const content = await generatePostContent(sourceType, prompt, config.geminiApiKey, config.groqApiKey);
  if (!content) return;

  const platformsCount = await publishContent(content, config, latestRelease.htmlUrl);
  
  if (platformsCount > 0) {
    markReleaseAsPublished(latestRelease.htmlUrl);
    logger.info(`Successfully marked GitHub release as published: ${latestRelease.tagName}`);
  }
};

const run = async () => {
  logger.info("Starting Serverless SMM-Bot Run...");
  
  try {
    await pollBlogRss();
    await pollGithubReleases();
    logger.info("Serverless run completed successfully.");
    process.exit(0);
  } catch (error) {
    logger.error(`Critical error during execution: ${(error as Error).message}`);
    process.exit(1);
  }
};

// Start the script
run();
