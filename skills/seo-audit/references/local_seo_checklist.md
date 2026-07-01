# Local SEO Checklist

Depth reference for `seo-audit` Phase 2 (Audit). Expanded checks for
local-business and public-profile pages. Pull when the audit surface is a
local-business or public-profile page.

## LocalBusiness JSON-LD — required fields

Validate with Google's [Rich Results Test](https://search.google.com/test/rich-results).

```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "[Business Name]",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "[street]",
    "addressLocality": "[city]",
    "addressRegion": "[state/region]",
    "postalCode": "[zip]",
    "addressCountry": "[ISO 3166-1 alpha-2]"
  },
  "geo": { "@type": "GeoCoordinates", "latitude": ..., "longitude": ... },
  "telephone": "+1 ...",
  "url": "https://...",
  "image": "https://.../logo.png",
  "priceRange": "$$",
  "openingHoursSpecification": [...],
  "sameAs": ["https://yelp.com/...", "https://facebook.com/..."]
}
```

## Common LocalBusiness schema mistakes

- Missing `address` or `geo` — breaks the local ranking signal.
- `image` pointing to a broken URL or a generic stock photo — use the real
  business logo or storefront.
- `openingHoursSpecification` with no `dayOfWeek` — Google ignores it.
- No `sameAs` links to real profiles (Yelp, FB, Google Business) — weakens the
  entity signal.
- Schema drift: the JSON-LD says "Italian restaurant" but the rendered page
  says "pizzeria" — pick one and align both.

## Title tag format for local-business public profiles

`[Business Name] in [City] | [Value Prop]`

- ✅ `Mario's Plumbing in Austin | 24/7 Emergency Plumber`
- ❌ `Mario's Plumbing | Powered by Yappi.ai` — the platform brand does not
  help the business rank; lead with the business + city + value prop.

## Meta description

- 120-160 characters (Google truncates around 160 on mobile).
- Lead with the value prop, end with a CTA verb ("Book now", "Call today",
  "Get a quote").
- Include the city if it fits naturally — reinforces the local signal.

## Bing considerations

- Bing still reads meta keywords (Google ignores them). If you set them, keep
  them honest — do not stuff.
- Bing Webmaster Tools has its own Rich Results test; validate there too if
  Bing traffic matters for the niche.
- Submit URLs via IndexNow (Bing + Yandex) — see everything-seo for the
  IndexNow integration.

## robots.txt for local-business sites

- Allow retrieval bots (OAI-SearchBot, ChatGPT-User, AppleBot, PerplexityBot)
  so AI search engines can include the business in cited answers.
- Block training scrapers (GPTBot, ClaudeBot, Bytespider) if you do not want
  the content used for model training — this is a business decision, not an
  SEO rule.
- Keep `Googlebot` fully allowed.
