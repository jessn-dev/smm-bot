import { generatePostContent } from './services/aiService';
import { getConfig } from './config';
import { logger } from './utils/logger';

const runTest = async () => {
  const config = getConfig();
  
  const mockNewRelease = `Repository: sprout
Version: v1.0.0
Release Notes:
Initial release of Sprout! A lightning-fast CLI tool built in Go to instantly scaffold Spring Boot microservices with pre-configured Docker, Postgres, and JaCoCo coverage. 

Link to append at the end: https://github.com/jessn-dev/sprout/releases/tag/v1.0.0`;

  const mockUpdateRelease = `Repository: jobDork
Version: v2.1.0
Release Notes:
Major update! 
- Added asynchronous scraping support.
- Bypasses Cloudflare on LinkedIn jobs.
- Now exports directly to SQLite instead of just CSV.

Link to append at the end: https://github.com/jessn-dev/jobDork/releases/tag/v2.1.0`;

  logger.info("=== TESTING GITHUB NEW PROJECT PERSONA ===");
  const newPost = await generatePostContent('github_new', 'facebook', mockNewRelease, config.geminiApiKey, config.groqApiKey);
  console.log(`\n${newPost}\n`);

  logger.info("=== TESTING GITHUB UPDATE PERSONA ===");
  const updatePost = await generatePostContent('github_update', 'facebook', mockUpdateRelease, config.geminiApiKey, config.groqApiKey);
  console.log(`\n${updatePost}\n`);
};

runTest();
