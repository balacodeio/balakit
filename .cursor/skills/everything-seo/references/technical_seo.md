# Technical SEO Audit

## Philosophy

In 2026, technical SEO has shifted from merely ensuring pages are indexed to **managing a data source for the decentralized web and AI agents**. Your site is being consumed by LLMs, retrieval bots, and AI search interfaces.

## The 5-Pillar Technical SEO Audit

### Pillar 1: Crawlability & Bot Governance

Configure `robots.txt` to differentiate between beneficial retrieval bots and training scrapers.

**Allow retrieval bots (power AI search):**
```
User-agent: OAI-SearchBot
Disallow:

User-agent: ChatGPT-User
Disallow:

User-agent: PerplexityBot
Disallow:
```

**Block training scrapers (protect proprietary data):**
```
User-agent: GPTBot
Disallow: /

User-agent: Google-Extended
Disallow: /
```

**Key rules:**
- Always allow `Googlebot` and `Bingbot` for organic search.
- Be intentional about which AI agents can index vs. train on your data.
- Test `robots.txt` with Google's robots.txt Tester and Bing's Webmaster Tools.

### Pillar 2: Indexing & Architecture

**The Combinatorial Explosion Problem (E-commerce):**
Faceted navigation (size + color + brand) generates millions of near-duplicate URLs. Search engines waste crawl budget on low-value pages.

**The Fix Matrix:**

| Filter Count | Action |
|-------------|--------|
| 1 filter (e.g., /shoes?size=10) | **Allow index** — if it has search volume. |
| 2+ filters (e.g., /shoes?size=10&color=red) | **Canonicalize** to parent category or **noindex**. |
| All filters selected | **Noindex** — zero search value. |
| No filters applied | **Index** — canonical to self. |

**Hreflang Integrity (International):**
- Every page must have a **self-referencing hreflang tag**.
- The **return tag rule:** If Page A points to Page B, Page B must point back to Page A.
- Always implement `hreflang="x-default"` for language selectors.
- Missing return tags are the #1 cause of hreflang failure.

**IndexNow (Bing Push Protocol):**
- Submit changed URLs via API instead of waiting for crawls.
- Bing prioritizes IndexNow over sitemap signals.
- Implement if you have frequent content updates (news, e-commerce).

### Pillar 3: Performance (Core Web Vitals)

**The 2026 Standards:**

| Metric | Target | Tool |
|--------|--------|------|
| **LCP** (Largest Contentful Paint) | < 2.5s | PageSpeed Insights |
| **INP** (Interaction to Next Paint) | < 200ms | PageSpeed Insights |
| **CLS** (Cumulative Layout Shift) | < 0.1 | PageSpeed Insights |
| **TTFB** (Time to First Byte) | < 800ms | WebPageTest |

**LCP Optimization:**
- Use `fetchpriority="high"` on hero images.
- Serve images in next-gen formats: AVIF (best), WebP (fallback).
- Preload critical fonts: `<link rel="preload" as="font">`.
- Avoid hero images larger than 200KB.

**INP Optimization:**
- Use **Island Architecture** or **Partial Hydration** (Astro, recent Next.js).
- Only hydrate interactive components (e.g., "Add to Cart"), not the entire page.
- Reduce main-thread JavaScript execution.
- Defer non-critical scripts.

**CLS Prevention:**
- Always set explicit `width` and `height` on images.
- Reserve space for ads and embeds with CSS.
- Avoid injecting content above existing content.

### Pillar 4: Structured Data (Schema Markup)

Schema is the **language of Large Language Models**. It helps AI extract, verify, and cite your content.

**Validation Rules:**
- Run every unique page template through Google's Rich Results Test.
- **Errors (red)** disqualify rich results. Fix before publishing.
- **Warnings (yellow)** may reduce eligibility. Address after errors.
- Schema errors can **double organic CTR** loss (no rich snippets).

**Schema Type Restrictions (2026):**
- **Do NOT** use `FAQPage` schema for editorial content — Google restricts it to government and health domains.
- **Do NOT** use `Review` schema with `ItemList` or for comparison content.
- **Acceptable types:** `Article`, `BlogPosting`, `BreadcrumbList`, `HowTo`, `Product`, `WebPage`.

**Entity Linking (Critical for GEO):**
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Your Brand",
  "sameAs": [
    "https://twitter.com/yourbrand",
    "https://linkedin.com/company/yourbrand",
    "https://crunchbase.com/organization/yourbrand"
  ]
}
```

**ProfilePage Schema:**
Link authors to authoritative entities using `ProfilePage` and `sameAs`.

### Pillar 5: JavaScript & Rendering

**Rendering Architecture Decision Tree:**

| Architecture | Use Case | SEO Risk |
|-------------|----------|----------|
| **CSR** (Client-Side Rendering) | SPAs, dashboards | **HIGH** — 3-7 day indexing delays |
| **SSR** (Server-Side Rendering) | Dynamic content | **LOW** — but TTFB may suffer under load |
| **ISR** (Incremental Static Regeneration) | E-commerce, news | **GOLD STANDARD** — static speed + dynamic freshness |
| **SSG** (Static Site Generation) | Blogs, marketing sites | **LOW** — but no real-time updates |

**ISR is the 2026 Gold Standard for E-commerce:**
- Serve pre-rendered HTML instantly.
- Rebuild specific pages in the background when data changes (price, stock).
- Best of both worlds: static speed + dynamic freshness.

**Bing's JavaScript Limitation:**
- Bing cannot process JS as well as Google.
- Critical content must be in static HTML before JS loads.
- Use SSR or SSG for Bing-critical pages.
- Test with Bing's Site Scan tool (free in Bing Webmaster Tools).

## Technical SEO Mistakes to Avoid

1. **Blocking all AI bots** in `robots.txt` — you lose visibility in ChatGPT, Perplexity, and Copilot.
2. **CSR for product pages** — indexing delays kill time-sensitive rankings.
3. **Schema drift** — JSON-LD contradicts visible page text. Google penalizes this.
4. **Ignoring Bing** — Bing powers ChatGPT and Copilot. It's not optional.
5. **Missing self-referencing hreflang** — breaks entire international clusters.
6. **No fetchpriority on LCP images** — wastes load time budget.
7. **Large JavaScript bundles** — hurts INP and user experience.

## Technical SEO Checklist

- [ ] `robots.txt` allows Googlebot, Bingbot, and retrieval bots. Blocks training scrapers.
- [ ] Sitemap is valid, under 50MB, and includes `lastmod` dates.
- [ ] Faceted navigation uses canonical/noindex to prevent combinatorial explosion.
- [ ] Hreflang tags are self-referencing and have return tags.
- [ ] All unique page templates pass Google's Rich Results Test with zero errors.
- [ ] Schema includes `sameAs` and `ProfilePage` for entity linking.
- [ ] LCP images use `fetchpriority="high"` and AVIF/WebP formats.
- [ ] INP < 200ms, LCP < 2.5s, CLS < 0.1.
- [ ] Critical content is visible in static HTML (not hidden behind JS).
- [ ] ISR or SSR used for e-commerce and frequently updated pages.
- [ ] IndexNow implemented for Bing push notifications.
- [ ] Bing Site Scan run monthly. No broken links, duplicate titles, or canonical errors.
