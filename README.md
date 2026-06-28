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
1. Takes a simple topic prompt (e.g., "Write about my new open-source project").
2. Connects to **Google Gemini** or **Groq (Llama3)** to expand that prompt into a highly engaging, professional social media post with relevant hashtags and spacing.
3. Authenticates securely with the **Meta Graph API** and **LinkedIn UGC API**.
4. Automatically publishes the generated post to your **Facebook Page** and **Personal LinkedIn Profile**.

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
| `POST_TOPIC` | The prompt for the AI to write about today. |

---

## 📝 License
Copyright © 2026.
This project is [MIT](https://opensource.org/licenses/MIT) licensed.
