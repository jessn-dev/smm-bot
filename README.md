# 🤖 SMM Bot (Social Media Manager Bot)

[![CI/CD Pipeline](https://github.com/jessn-dev/smm-bot/actions/workflows/poster.yml/badge.svg)](https://github.com/jessn-dev/smm-bot/actions)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D%2020.0.0-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An enterprise-grade, serverless Social Media Automation tool built in Node.js and TypeScript. It uses AI (Gemini/Groq) to automatically generate highly engaging social media posts and cross-posts them to Facebook and LinkedIn.

---

## 🎯 Who is this project for?
This project is designed for **Software Engineers, Open-Source Creators, Founders, and Developer Advocates** who want to maintain an active personal brand and social media presence without sacrificing hours of deep-work time to write and publish content manually.

## 💡 What is this project?
`smm-bot` is a fully automated content generation and publishing pipeline.
When triggered, it:
1. Polls two sources: your **blog RSS feed** (new articles) and **GitHub releases** for the repos you track.
2. Connects to **Google Gemini** or **Groq (Llama3)** to turn each item into an engaging, professional social media post with relevant hashtags and spacing. The system prompt is tuned to strip common AI tells (em dashes, signposting, forced rule-of-three, generic wrap-ups) so posts read like a real developer wrote them.
3. Authenticates securely with the **Meta Graph API** and **LinkedIn UGC API**.
4. Publishes the generated post to your **Facebook Page** and **Personal LinkedIn Profile**.

Publication state is tracked **per item, per platform** in `.last_post_id` and `.last_github_release_id`, so a platform that failed last run is retried while one that already succeeded is skipped. No item is ever posted twice.

## 🚀 Why was this created?
Consistency is the hardest part of building a personal brand in the tech space. This bot was created to completely eliminate the friction of content creation. By leveraging LLMs for copywriting and official APIs for publishing, you can maintain an active presence on multiple platforms effortlessly, allowing you to focus on what you do best: writing code.

## 🛠 How can others leverage this?
You can fork this repository and run it entirely for free using GitHub Actions. 

### Prerequisites
- Node.js v20+
- A Facebook "Creator" or "Business" Page (and Graph API Access Token)
- A LinkedIn account (and LinkedIn Developer UGC Access Token)
- A free Gemini or Groq API Key

### Local Setup
1. **Clone & Install**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/smm-bot.git
   cd smm-bot
   npm ci
   ```
2. **Configure Environment**:
   ```bash
   cp .env.example .env
   ```
   Fill in your API keys in the `.env` file.

3. **Run**:
   ```bash
   npm run build && npm start
   ```

### Configuration / Environment Variables
| Variable | Description |
| :--- | :--- |
| `FACEBOOK_PAGE_ID` | The ID of your Facebook Page. |
| `FACEBOOK_ACCESS_TOKEN` | Graph API Token with `pages_manage_posts` permission. |
| `LINKEDIN_USER_ID` | Your LinkedIn URN ID (e.g., `urn:li:person:XXXXXX`). |
| `LINKEDIN_ACCESS_TOKEN` | LinkedIn OAuth token with `w_member_social` permission. |
| `GEMINI_API_KEY` | *(Optional)* Google Gemini API Key. |
| `GROQ_API_KEY` | *(Optional)* Groq API Key (used as fallback). |
| `TARGET_REPOS` | Comma-separated `owner/repo` list to scan for new GitHub releases. |
| `GITHUB_TOKEN` | Token used to read releases (auto-provided inside GitHub Actions). |

#### Runtime flags
These control a single run and default sensibly for the automated schedule:

| Variable | Values | Default | Description |
| :--- | :--- | :--- | :--- |
| `RUN_MODE` | `all` \| `blog` \| `github` | `all` | Which source(s) to poll this run. |
| `PLATFORMS` | `all` \| `facebook` \| `linkedin` | `all` | Restrict publishing to one platform. Also accepts `facebook,linkedin`. |
| `DRY_RUN` | `true` \| `false` | `false` | Generate posts and log them, but publish nothing and never mark state. |

---

## ⚙️ Automation & Manual Runs

Fork the repo and it runs **entirely free on GitHub Actions** (`.github/workflows/poster.yml`).

**Automated (scheduled):**
- Blog poller: Sun, Tue, Thu, Sat at 13:05 UTC (`RUN_MODE=blog`).
- GitHub release poller: daily at 14:00 UTC (`RUN_MODE=github`).

**Manual (recovery / on-demand):**
When a scheduled run fails or you want to force a post, trigger it by hand from the
**Actions → Social Media Publisher → Run workflow** button (`workflow_dispatch`). Inputs:
- `mode` — `all` / `blog` / `github`
- `platforms` — `all` / `facebook` / `linkedin`
- `dry_run` — preview without publishing

Because state is per-item and per-platform, a manual run safely retries only what
hasn't been published yet — it won't duplicate posts that already went out.

---

## 📝 License
Copyright © 2026.
This project is [MIT](https://opensource.org/licenses/MIT) licensed.
