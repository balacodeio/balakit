# AI Content Automation

## The Problem: Generic "AI Slop"

Most AI-generated content is bland, generic, and untrustworthy. It lacks brand voice, original data, and real-world experience.

**The solution:** Dynamic brand persona injection + competitor reverse-engineering + strict on-page enforcement.

## The AI Content Workflow

### Step 1: Dynamic Brand Persona Injection

Before generating content, inject specific business data into the AI prompt.

**Include in every prompt:**
- Past writing samples (to match tone).
- Humor guidelines (e.g., "dad jokes," "sarcastic but helpful").
- Company statistics and anecdotes.
- Brand voice attributes (formal, casual, technical, playful).
- Audience personas (who are we writing for?).

**Why it works:**
Generic prompts produce generic output. Specific prompts produce specific, trustworthy content.

**Example:**
```
Brand Voice: "We are a no-BS technical blog. We use analogies.
We cite sources. We never hype. Our founder is a former Google engineer.
Tone: knowledgeable friend, not sales rep."
```

### Step 2: Competitor Structure Reverse-Engineering

Before writing, analyze the top 3 ranking competitors.

**Scrape and calculate:**
- Average word count of top 3.
- Number of H2 tags per article.
- Image frequency (images per 1,000 words).
- Internal link density.
- Content format (listicle, guide, comparison, tutorial).
- Schema markup used.

**Why it works:**
- You don't guess what structure wins. You know.
- You match or exceed the winning formula.
- You identify gaps (what they missed that you can cover).

**Tools:**
- Surfer SEO
- Clearscope
- Manual analysis with browser dev tools

### Step 3: Strict On-Page Enforcement

The AI must follow a strict checklist for every article.

**The On-Page Checklist:**

| Element | Requirement | Why |
|---------|-------------|-----|
| **H1 Tag** | Exactly one per page | SEO best practice |
| **Primary Keyword** | In first 100 words | Early relevance signal |
| **H2 Tags** | 4-8 minimum | Structure for skimming and AI extraction |
| **Questions** | 4-8 naturally woven in | Triggers "People Also Ask" |
| **Internal Links** | 3-5 per 1,000 words | Topic clustering and PageRank flow |
| **External Links** | 2-3 to authoritative sources | E-E-A-T and credibility |
| **Images** | 1 per 300-500 words | Engagement and visual breaks |
| **Alt Text** | Descriptive, keyword-rich | Accessibility and image SEO |
| **Meta Title** | 50-60 characters, keyword first | CTR optimization |
| **Meta Description** | 150-160 characters, CTA included | CTR optimization |
| **Schema Markup** | Article or BlogPosting JSON-LD | Rich results eligibility |
| **Table of Contents** | For articles > 1,500 words | UX and jump links |
| **FAQ Section** | 3-5 questions at bottom | Featured snippet opportunity |
| **CTA** | 1-2 per article | Conversion opportunity |

### Step 4: Quality Control

**Before publishing, verify:**
- [ ] No hallucinated facts. Every statistic cited.
- [ ] No generic fluff. Every sentence adds value.
- [ ] Brand voice consistent. Read aloud. Does it sound like us?
- [ ] Competitor gaps covered. What did they miss?
- [ ] On-page checklist complete. Every item ticked.
- [ ] Plagiarism check passed. Original content only.
- [ ] Grammar and readability score: Flesch > 60 (readable).

## Automation Tools & Platforms

| Tool | Use Case |
|------|----------|
| **n8n / Make.com** | Workflow automation. Connect scrapers → AI → CMS. |
| **Claude Code / Cursor** | Custom content generation scripts. |
| **Surfer SEO / Clearscope** | Competitor analysis and content optimization. |
| **Copyscape / Grammarly** | Plagiarism and grammar checks. |
| **Hemingway Editor** | Readability optimization. |
| **PageSpeed Insights** | Performance check before publishing. |

## The Automation Pipeline

```
1. Keyword Research → Identify target keyword and intent.
   ↓
2. Competitor Analysis → Scrape top 3. Extract structure.
   ↓
3. Brief Generation → Create detailed content brief with outline.
   ↓
4. Brand Persona Injection → Load voice, tone, data into prompt.
   ↓
5. AI Draft Generation → Generate first draft with strict checklist.
   ↓
6. Quality Review → Fact-check, voice-check, on-page-check.
   ↓
7. Human Edit → Subject matter expert review.
   ↓
8. Publishing → Upload to CMS with schema, images, links.
   ↓
9. Indexing → Submit to Google + IndexNow for Bing.
```

## Avoiding "AI Slop"

**What makes content "slop":**
- Generic advice anyone could write.
- No original data or examples.
- No brand voice. Reads like a Wikipedia article.
- Hallucinated statistics.
- Keyword stuffing.
- No real-world experience.

**How to differentiate:**
1. **Original data:** Surveys, case studies, proprietary analysis.
2. **First-hand experience:** "We tested this. Here's what happened."
3. **Strong brand voice:** Inject personality into every paragraph.
4. **Expert review:** Have a human expert verify accuracy.
5. **Specific examples:** Not "many companies" but "Acme Corp increased revenue by 23%."
6. **Visuals:** Original charts, screenshots, diagrams.

## Content Automation Checklist

- [ ] Brand persona documented with writing samples and voice guidelines.
- [ ] Competitor analysis run before every article.
- [ ] On-page checklist enforced for every piece.
- [ ] Fact-checking process in place. No hallucinated data.
- [ ] Subject matter expert reviews every article.
- [ ] Plagiarism check passed. 100% original.
- [ ] Schema markup added before publishing.
- [ ] Images optimized (AVIF/WebP, alt text, lazy loading).
- [ ] Internal links to 3-5 relevant pages included.
- [ ] FAQ section added for snippet opportunities.
- [ ] URL submitted to Google and Bing after publishing.
- [ ] Content updated every 6-12 months for freshness.
