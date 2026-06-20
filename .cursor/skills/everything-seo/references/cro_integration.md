# SEO & CRO Integration

## The Core Difference

| SEO | CRO |
|-----|-----|
| **Visibility** — Gets users to your site | **Performance** — Gets users to take action |
| Keyword research, backlinks, crawlability | CTAs, layout, social proof, copy |
| "Can they find you?" | "Will they convert?" |

**SEO without CRO is wasted traffic.**
**CRO without SEO is invisible optimization.**

## The Unified Metrics Framework

Stop siloing metrics. Align teams around shared KPIs.

### Shared KPIs

| Metric | What It Measures | Target |
|--------|-----------------|--------|
| Revenue influenced by organic traffic | SEO's bottom-line impact | Track monthly |
| Bounce rate on key landing pages | Content relevance | < 40% |
| Scroll depth on key pages | Engagement | > 70% |
| Time on site | Content quality | > 3 minutes |
| Page-to-page movement | Navigation quality | > 2 pages per session |
| Conversion rate by acquisition channel | Channel effectiveness | Varies by channel |

**Why this works:**
- Shifts focus from vanity metrics to shared value.
- Teams spend less time justifying work and more time improving outcomes.
- CRO tools centralize data, making alignment easier.

## Safe A/B Testing for SEO

### The Challenge
A/B testing can harm SEO if implemented incorrectly:
- Duplicate content confuses search bots.
- JavaScript delays hide content.
- Layout shifts hurt Core Web Vitals.

### The Safe Strategy

1. **Use Canonical Tags**
   - Point search engines to the original version of the page.
   - `<link rel="canonical" href="https://example.com/original-page">`
   - Prevents duplicate content penalties.

2. **Follow JS Framework Best Practices**
   - Ensure bots see content, not just JS placeholders.
   - Use SSR or ISR for test pages.
   - Avoid hiding content behind client-side rendering.

3. **Minimize Layout Shift**
   - A/B testing tools that inject content can cause CLS.
   - Pre-reserve space for test variants.
   - Target CLS < 0.1 even during tests.

4. **Test Duration**
   - Run tests for a minimum of 2 weeks.
   - Ensure Google has crawled both variants before concluding.
   - Avoid rapid switching (confuses indexing).

## CRO Optimization Elements

### 1. Clarify Value Proposition Above the Fold

**Actions:**
- Add a clear hero CTA (e.g., "Find My Medicine").
- Highlight key incentives in the header: "Free home delivery."
- Use benefit-focused tags: "Fast-acting" or "Clinically tested."

**Tool:** Hotjar (to validate attention and scroll behavior).

### 2. Strengthen Social Proof at Decision Points

**Actions:**
- Display product ratings directly on product pages.
- Place testimonials near the "Place Order" or purchase CTA.
- Add behavioral proof: "Most customers bought this with X."
- Use Trustpilot, G2, or Capterra reviews.

**Why it works:** Social proof is most effective when placed **close to moments of action**.

### 3. Optimize CTA Language for Commitment

**Actions:**
- Replace generic CTAs.
- Use commitment-based phrasing: "I'll add to cart" instead of "Add to Cart."
- Replace "Checkout" with intent-driven language: "I'll purchase."
- Test removing the cart indicator to reduce hesitation.

**Tool:** HubSpot adaptive testing (for small page changes).

### 4. Use Emotional Visuals

**Actions:**
- Test product images vs. lifestyle images.
- Use video near CTAs.
- A/B test image size and placement.

**Tool:** VWO (Visual Website Optimizer) for image A/B testing.

## The SEO + CRO Integration Loop

```
1. SEO brings traffic to the page.
   ↓
2. CRO ensures the page converts.
   ↓
3. Shared metrics reveal what's working.
   ↓
4. SEO optimizes the traffic sources.
   ↓
5. CRO optimizes the landing experience.
   ↓
6. Repeat.
```

## SEO + CRO Mistakes to Avoid

1. **SEO and CRO teams don't talk.** They optimize in silos.
2. **A/B tests without canonical tags.** Duplicate content penalties.
3. **Focusing on vanity metrics.** Rankings without conversions are meaningless.
4. **Ignoring mobile CRO.** 60%+ of traffic is mobile. Test mobile-first.
5. **Testing too many variables at once.** Can't isolate what's working.

## SEO + CRO Checklist

- [ ] SEO and CRO teams share unified KPIs.
- [ ] Revenue influenced by organic traffic is tracked monthly.
- [ ] A/B tests use canonical tags pointing to original pages.
- [ ] CWV scores remain stable during A/B tests.
- [ ] Social proof placed within 1 scroll of purchase CTAs.
- [ ] CTA language tested for commitment-based phrasing.
- [ ] Hero section communicates value proposition in < 3 seconds.
- [ ] Mobile conversion rate tested separately.
- [ ] Scroll depth and bounce rate tracked per landing page.
- [ ] Heatmaps reviewed quarterly for friction points.
