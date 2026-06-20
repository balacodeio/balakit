---
name: everything-seo
description: "Expert SEO advisor for modern search optimization. Use for: technical audits, on-page SEO, semantic search, keyword intent, E-E-A-T, digital PR, link building, CRO, content automation, Bing vs Google, schema markup, and GEO. Triggers: SEO, technical SEO, link building, keyword research, content, E-E-A-T, digital PR, CRO, Bing SEO."
version: "1.1.0"
author: "Ali Farahat"
derived_from: "NotebookLM"
tags: ["SEO", "technical-SEO", "on-page-SEO", "link-building", "digital-PR", "CRO", "content-automation", "E-E-A-T", "Core-Web-Vitals", "GEO", "RAG-optimization"]
when_to_use: |
  - User asks about SEO, search optimization, or ranking improvement
  - User needs technical SEO audit, crawlability, or indexing help
  - User asks about on-page SEO, content optimization, or semantic SEO
  - User needs keyword research, intent mapping, or topical authority
  - User asks about link building, digital PR, or backlink strategies
  - User wants to improve E-E-A-T signals or site trustworthiness
  - User asks about Core Web Vitals, page speed, or performance
  - User needs schema markup, structured data, or rich results
  - User asks about CRO and SEO integration or A/B testing
  - User wants Bing SEO optimization or Google vs Bing differences
  - User asks about AI content automation or Generative Engine Optimization (GEO)
  - User mentions SEO penalties, SpamBrain, or algorithm updates
  - Do NOT use for: paid search (PPC), social media marketing, or general web design
---

# Everything SEO

A comprehensive SEO playbook covering modern search optimization for 2026: technical audits, semantic search, AI-driven content, digital PR, CRO integration, and multi-engine optimization.

## Core Philosophy

**SEO is Data Architecture.** Your website isn't just a website—it's a structured data source for the decentralized web and autonomous AI agents. Technical SEO is the foundation. Content is the signal. Links are the votes.

**Search Engines Think in Entities.** Modern algorithms use semantic evaluation and vector-space modeling. They don't match keywords—they match concepts, intent, and topical authority.

**AI-First Optimization (GEO).** LLMs and generative search (AI Overviews, ChatGPT search, Perplexity) require a new discipline: Generative Engine Optimization (GEO). Structure content for machines to extract, verify, and cite.

## How to Use This Skill

When the user asks an SEO question, follow this process:

1. **Identify the SEO layer:** Technical? On-page? Off-page? Content? CRO? Multi-engine?
2. **Load the relevant reference file** (see Reference Index below).
3. **Synthesize actionable advice** with specific tools, metrics, and thresholds.
4. **Provide concrete examples:** Show exact code snippets, tool names, and target values.
5. **Set boundaries:** For PPC, social media, or general web design questions, redirect to the appropriate skill.

## Reference Index

Load these reference files on demand based on the user's question:

| Reference File | When to Load |
|---|---|
| `references/technical_seo.md` | Technical audits, crawlability, indexing, Core Web Vitals, schema markup, JavaScript rendering, robots.txt, hreflang |
| `references/semantic_intent.md` | Keyword intent mapping, topical authority, E-E-A-T, semantic SEO, GEO, AI Overviews, content clusters |
| `references/link_building.md` | Digital PR, authority nodes, journalist sourcing, link reclamation, penalty avoidance, SpamBrain |
| `references/cro_integration.md` | SEO + CRO alignment, A/B testing without SEO damage, conversion elements, unified KPIs |
| `references/bing_google.md` | Bing vs Google optimization, exact-match keywords, social signals, IndexNow, algorithm differences |
| `references/content_automation.md` | AI content workflows, brand persona injection, competitor reverse-engineering, on-page enforcement |

## Quick-Reference Frameworks

### The 5-Pillar Technical SEO Audit
1. **Crawlability & Bot Governance:** Configure `robots.txt` to allow retrieval bots (e.g., `OAI-SearchBot`, `ChatGPT-User`) while blocking training scrapers (e.g., `GPTBot`, `Google-Extended`).
2. **Indexing & Architecture (The Dec 2025 Rendering Shift):** Google excludes pages returning non-200 HTTP status codes (like 4xx or 5xx) from its JS rendering queue entirely. CSR causes 3-7 day delays. Use **Incremental Static Regeneration (ISR)** as the 2026 Gold Standard.
3. **Performance (Core Web Vitals):** Target holistic **INP < 200ms** (Interaction to Next Paint) using `scheduler.yield()` to pause long JS tasks. Target **LCP < 2.5s** using `fetchpriority="high"` and AVIF. CLS < 0.1.
4. **Structured Data (Schema):** Validate JSON-LD with Google's Rich Results Test. Combat **Schema Drift** (mismatch between schema and rendered DOM) by implementing automated Cypress/Puppeteer testing to fail builds on mismatch. Use `sameAs` and `ProfilePage`.
5. **JavaScript & Rendering:** Prefer ISR/SSR over CSR. CSR is a major indexing liability for PDPs and category pages.

### The 4 Pillars of Intent Mapping
1. **Predictive Awareness (Informational):** Build glossary hubs and topic clusters. Establish topical authority. Prevent **intent dilution** by maintaining a high **Intent-to-Entity Proximity Score** ($P_s = \frac{\sum (E_p \cap F_s)}{\sum E_p} \approx 1.0$).
2. **Conversational Investigation (Consideration):** Optimize for AI Overviews and RAG. Use the **BLUF method** (Bottom Line Up Front): direct 40-60 word answers immediately under H2.
3. **Formatting Bias (LLM Extraction):** LLMs select HTML `<table>` formats and definition lists (`<dl>`, `<dt>`, `<dd>`) 82% of the time over plain text for commercial investigation queries.
4. **Tactical Commercial Logic (Decision):** Acknowledge the "Messy Middle" and **Query Attrition**. Embed highly visible lateral links to informational off-ramps directly beneath pricing tiers to keep users in your domain.

### The E-E-A-T Signal Stack
| Signal | What to Do |
|---|---|
| **Experience** | Product photos, personal anecdotes, case studies, specific metrics, screenshots of actual results |
| **Expertise** | Author bios with credentials, technical depth, cited sources, professional affiliations |
| **Authoritativeness** | Backlinks from trusted sites, original research, industry mentions, consistent publishing |
| **Trustworthiness** | HTTPS, clear contact info, accurate content, privacy policy, "Last updated" timestamps |

### The Digital PR Flywheel
1. **Create Authority Nodes:** Original surveys (500+ participants), cost calculators, industry reports.
2. **Platform Sniping:** Respond to Connectively, Qwoted, and Featured.com queries within 1 hour with concise quotes (< 200 words) and specific stats (boosts placement by 60%+).
3. **Earn Editorial Links:** High-DA (70+) media coverage. Avoid reciprocal links, mass guest posts, and exact-match anchor text abuse targeted by SpamBrain AI.
4. **Reclaim Unlinked Mentions:** Monitor with Ahrefs Content Explorer. Converting unlinked brand mentions to active links has a 30%+ success rate.
5. **Compound:** Annual data updates refresh links. Maintain natural anchor text: 40-60% branded, 20-30% generic, < 20% exact-match.

### The SEO + CRO Integration Loop
1. **Align KPIs:** Measure "Revenue influenced by organic traffic" rather than rankings.
2. **Safe A/B Testing:** Use canonical tags pointing to the original URL. Minimize layout shift (flicker) using server-side testing (Convert, VWO) to protect Core Web Vitals.
3. **Commitment-Based CTA Copy:** Swap generic CTAs ("Submit", "Checkout") for personal, commitment-based language ("I'll purchase", "Get Your Free Quote Now") to reduce purchase hesitation.
4. **Proximity of Social Proof:** Move Trustpilot, Yotpo, or Judge.me reviews directly adjacent to CTAs.

### The Bing vs. Google Decision Matrix
| Factor | Google | Bing |
|---|---|---|
| Keywords | Semantic, context-aware | Exact-match, literal |
| Social Signals | Not a direct factor | Direct ranking factor |
| Domain Age | Less weight | Significant; .edu/.gov favored |
| JavaScript | Handles well | Limited; prefers SSR |
| Meta Keywords | Ignored | Still used |
| Indexing | Crawl-based | IndexNow push protocol |

## The 2026 Expert SEO Tool Stack

- **Riff Analytics:** Enterprise tool for tracking brand citation rate and "answer share" inside generative AI engines (ChatGPT, Perplexity, Claude, Gemini).
- **SEOTesting:** Bypasses Google's 1,000-row limit to run time-based, split, and LLM SEO tests using GSC data.
- **Screaming Frog / Sitebulb:** Indispensable desktop and cloud website crawlers for technical audits and rendering diagnostics.
- **Ahrefs / Semrush:** Industry standards for competitive link gap analysis, backlink indexes, and keyword clustering.
- **Convert Experiences / VWO:** Flicker-free, SEO-safe A/B testing and personalization.

## Examples of Good Responses

**User:** "How do I optimize for AI search and AI Overviews?"

**Response:**
1. Use the **BLUF method** (Bottom Line Up Front): Put the core answer in the first 40-60 words immediately following an H2 tag.
2. Structure comparative data with **HTML tables** (`<table>`) and specifications with **definition lists** (`<dl>`). LLMs select these native HTML structures 82% of the time over plain text.
3. Add **"Key Takeaway" boxes** at the top of the page for easy extraction.
4. Use **schema markup** with `sameAs` and `ProfilePage` to link entities to authoritative sources.
5. Validate all JSON-LD in Google's Rich Results Test before publishing.

**User:** "What's the best link building strategy in 2026?"

**Response:**
1. **Avoid:** PBNs, link exchanges, exact-match anchor text spam, paid links without `rel="sponsored"`. SpamBrain AI devalues and penalizes these.
2. **Build Authority Nodes:** Create original surveys (500+ participants), interactive calculators, or industry reports. Journalists link to content that serves as a source they need.
3. **Platform Sniping:** Monitor Connectively, Qwoted, and Featured.com. Respond within 1 hour with a concise quote (< 200 words) and a specific statistic for a 60%+ placement rate.
4. **Reclaim unlinked mentions:** Monitor with Ahrefs Content Explorer. Reach out to publishers to convert existing mentions into active links (30%+ success rate).
5. **Diversify anchor text:** Aim for 40-60% branded, 20-30% generic, and keep exact-match target keywords under 20%.

**User:** "How do I audit my site's technical SEO?"

**Response:**
1. **Crawlability & Bot Governance:** Check `robots.txt`. Allow retrieval bots like `OAI-SearchBot` and `ChatGPT-User`. Block training scrapers like `GPTBot` and `Google-Extended`.
2. **The Dec 2025 Rendering Shift:** Ensure pages do not return non-200 HTTP status codes (like 4xx/5xx) while relying on client-side JS to render content, as Google excludes them from the rendering queue entirely. Use ISR or SSR.
3. **Core Web Vitals:** Target INP < 200ms using `scheduler.yield()` to yield long JS tasks. Target LCP < 2.5s using `fetchpriority="high"` and AVIF formats. CLS < 0.1.
4. **Combating Schema Drift:** Validate JSON-LD with Google's Rich Results Test. Set up automated Cypress/Puppeteer testing to fail builds if JSON-LD data contradicts visible page text.
5. **IndexNow:** Implement IndexNow API (via Cloudflare or direct integration) to instantly push inventory and price updates to Bing and AI search indexes.

## What NOT to Do

- Do NOT recommend black-hat tactics: PBNs, link farms, cloaking, keyword stuffing, or bought links.
- Do NOT suggest exact-match anchor text for all backlinks. Diversify naturally.
- Do NOT ignore Bing. It powers ChatGPT and Copilot search.
- Do NOT recommend CSR for e-commerce or news sites. Use ISR or SSR.
- Do NOT provide PPC or paid search advice. This is an organic SEO skill.
- Do NOT give vague advice like "write quality content." Be specific about structure, schema, and technical execution.

## Agent Compatibility Notes

This skill uses the open SKILL.md standard and works across all compatible agents:
- **Claude Code** (`~/.claude/skills/` or `.claude/skills/`)
- **Codex CLI** (`~/.codex/skills/` or `.codex/skills/`)
- **OpenClaw** (`~/.openclaw/skills/` or `.openclaw/skills/`)
- **Cursor** (`.cursor/skills/`)
- **Gemini CLI** (`~/.gemini/skills/` or `.gemini/skills/`)
- **OpenCode** (`.agents/skills/`)

**Universal fields:** `name`, `description`, `version`, `author`, `tags` — supported by all agents.
**Optional:** `when_to_use` — supported by Claude Code, OpenClaw, Codex CLI, Gemini CLI. Safely ignored by others.

## SEO Mastery Checklist

- [ ] Technical audit complete: crawlability, indexing, CWV, schema, rendering.
- [ ] `robots.txt` distinguishes retrieval bots (`OAI-SearchBot`) from training scrapers (`GPTBot`).
- [ ] Faceted navigation uses canonical/noindex to prevent combinatorial explosion.
- [ ] All unique page templates pass Google's Rich Results Test with zero errors.
- [ ] Cypress/Puppeteer automated tests implemented to prevent Schema Drift.
- [ ] LCP images use `fetchpriority="high"` and AVIF formats.
- [ ] INP < 200ms using `scheduler.yield()`, LCP < 2.5s, CLS < 0.1.
- [ ] IndexNow implemented for instant Bing/AI push notifications.
- [ ] Intent mapping maintains a high Intent-to-Entity Proximity Score ($P_s \approx 1.0$).
- [ ] Content uses BLUF, HTML tables, and definition lists for AI extraction.
- [ ] Commercial pages have visible informational off-ramps to capture loopback queries.
- [ ] E-E-A-T signals demonstrated: bios, credentials, original data, photos.
- [ ] Digital PR campaigns focus on Authority Nodes (surveys, calculators) over guest posts.
- [ ] Sourcing platforms (Qwoted, Connectively) sniped within 60 minutes.
- [ ] Unlinked brand mentions monitored and reclaimed monthly.
- [ ] A/B testing uses canonical tags and flicker-free server-side testing (Convert, VWO).
- [ ] CTAs use personal, commitment-based language and reviews are placed adjacent to CTAs.
- [ ] Shared KPIs track "Revenue influenced by organic traffic" instead of rankings.
- [ ] No manual penalties. Backlink profile is natural and diverse.
