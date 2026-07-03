import { getConfig, AppConfig } from './config';
import { logger } from './utils/logger';
import { generatePostContent, classifyRelease, SourceType, Platform } from './services/aiService';
import { postToFacebook } from './services/facebookService';
import { postToLinkedIn } from './services/linkedinService';
import { getRssPosts, getPublishedPlatformsForPost, markPostPublishedOn } from './services/rssService';
import { getLatestReleases, getPublishedPlatformsForRelease, markReleasePublishedOn } from './services/githubService';

type Mode = 'blog' | 'github' | 'all';

const PLATFORMS: Platform[] = ['facebook', 'linkedin'];

const isDryRun = () => process.env.DRY_RUN === 'true';

const isPlatformConfigured = (platform: Platform, config: AppConfig): boolean => {
  return platform === 'facebook'
    ? Boolean(config.facebookPageId && config.facebookAccessToken)
    : Boolean(config.linkedinUserId && config.linkedinAccessToken);
};

const postToPlatform = async (platform: Platform, content: string, config: AppConfig, linkUrl?: string, linkTitle?: string): Promise<boolean> => {
  return platform === 'facebook'
    ? postToFacebook(content, config.facebookPageId, config.facebookAccessToken, linkUrl)
    : postToLinkedIn(content, `urn:li:person:${config.linkedinUserId}`, config.linkedinAccessToken, linkUrl, linkTitle);
};

/**
 * Publish one item to every platform it hasn't reached yet. State is tracked
 * per platform, so a platform that failed last run is retried while a platform
 * that already succeeded is skipped. Content is only generated for platforms
 * that actually need it.
 */
const processItem = async (
  sourceType: SourceType,
  prompt: string,
  linkUrl: string,
  linkTitle: string,
  published: Set<string>,
  config: AppConfig,
  mark: (platform: Platform) => void
): Promise<void> => {
  for (const platform of PLATFORMS) {
    if (published.has(platform)) {
      logger.info(`Skipping ${platform}: already published for this item.`);
      continue;
    }
    if (!isPlatformConfigured(platform, config)) {
      logger.info(`Skipping ${platform}: credentials not configured.`);
      continue;
    }

    const content = await generatePostContent(sourceType, platform, prompt, config.geminiApiKey, config.groqApiKey);
    if (!content) {
      logger.warn(`No content generated for ${platform}; will retry next run.`);
      continue;
    }

    if (isDryRun()) {
      logger.info(`\n\n====== [DRY RUN MODE] GENERATED ${platform.toUpperCase()} POST ======\n\n${content}\n\n========================================================\n`);
      continue; // Never mark state in a dry run.
    }

    const ok = await postToPlatform(platform, content, config, linkUrl, linkTitle);
    if (ok) {
      mark(platform);
      logger.info(`Published to ${platform}.`);
    }
  }
};

const pollBlogRss = async (config: AppConfig) => {
  logger.info("Polling Auto-Blogger RSS feed...");
  const posts = await getRssPosts();

  if (posts.length === 0) {
    logger.warn("No RSS items found or feed unreachable.");
    return;
  }

  // Only consider the newest few items. The feed carries full history, so
  // looping every item would backfill the entire blog on first run.
  const RECENT_LIMIT = 3;
  const pending = posts
    .slice(0, RECENT_LIMIT)
    .map(post => ({ post, published: getPublishedPlatformsForPost(post.id) }))
    .filter(({ published }) => !PLATFORMS.every(p => published.has(p)))
    .reverse(); // oldest of the recent set first, so feed order is preserved

  if (pending.length === 0) {
    logger.info("No recent blog posts pending publication.");
    return;
  }

  for (const { post, published } of pending) {
    logger.info(`Processing blog post: ${post.title}`);
    const prompt = `Write a social media post promoting my new blog article titled: "${post.title}". Here is the link to append at the end: ${post.link}`;
    await processItem('blog', prompt, post.link, post.title, published, config, platform => markPostPublishedOn(post.id, platform));
  }
};

const pollGithubReleases = async (config: AppConfig) => {
  logger.info("Polling GitHub for new releases...");

  if (config.githubTargetRepos.length === 0) {
    logger.warn("No TARGET_REPOS configured. Skipping GitHub releases.");
    return;
  }

  const releases = await getLatestReleases(config.githubTargetRepos, config.githubToken);
  const pending = releases
    .map(release => ({ release, published: getPublishedPlatformsForRelease(release.htmlUrl) }))
    .filter(({ published }) => !PLATFORMS.every(p => published.has(p)));

  if (pending.length === 0) {
    logger.info("No GitHub releases pending publication.");
    return;
  }

  for (const { release, published } of pending) {
    const sourceType = classifyRelease(release.tagName, release.isFirstRelease);
    logger.info(`Processing GitHub release: ${release.repoName} ${release.tagName} (${sourceType})`);

    const prompt = `Write a social media post about this GitHub release.
Repository: ${release.repoName}
Version: ${release.tagName}
Release Notes:
${release.body}

Link to append at the end: ${release.htmlUrl}`;

    const releaseTitle = `${release.repoName} ${release.tagName}`;
    await processItem(sourceType, prompt, release.htmlUrl, releaseTitle, published, config, platform => markReleasePublishedOn(release.htmlUrl, platform));
  }
};

const resolveMode = (): Mode => {
  const mode = (process.env.RUN_MODE || 'all').toLowerCase();
  if (mode === 'blog' || mode === 'github') return mode;
  return 'all';
};

const run = async () => {
  const mode = resolveMode();
  logger.info(`Starting Serverless SMM-Bot Run (mode: ${mode})...`);
  const config = getConfig();

  try {
    if (mode === 'blog' || mode === 'all') await pollBlogRss(config);
    if (mode === 'github' || mode === 'all') await pollGithubReleases(config);
    logger.info("Serverless run completed successfully.");
    process.exit(0);
  } catch (error) {
    logger.error(`Critical error during execution: ${(error as Error).message}`);
    process.exit(1);
  }
};

// Start the script
run();
