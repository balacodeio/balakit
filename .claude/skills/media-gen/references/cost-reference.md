---
purpose: "Pricing reference for cost-capability trade-off reasoning."
note: "Agent should cross-reference selected model with this table before quoting costs. Video costs MUST be quoted before execution."
last_updated: 2026-07-09
---

# Cost Reference

## Image Generation

All image models are charged **per image**, independent of resolution (up to model limits). Typical cost range: **$0.02–$0.10 per image**.

| Cost Tier | Typical Price | Models |
|-----------|--------------|--------|
| cheap | ~$0.02/image | seedream-v5-lite, seedance-2-fast (video) |
| moderate | ~$0.04–$0.06/image | seedream-v5-pro, qwen-image, nano-banana-pro, flux-2-klein |
| premium | ~$0.08–$0.10/image | flux-2-pro, kling-v3-pro (separate pricing) |

**Rule**: Images are cheap. Run image gen autonomously after model confirmation. No need to pre-quote per-image cost unless user asks.

## Video Generation

Video models bill **per second of output**. **MUST quote cost before running.**

| Model | Price/second | Price for 5s | Price for 10s |
|-------|-------------|--------------|---------------|
| seedance-2-pro | Varies by queue | ~$0.40–$0.60 | ~$0.80–$1.20 |
| seedance-2-fast | Cheaper than Pro | ~$0.20–$0.30 | ~$0.40–$0.60 |
| kling-v3-pro | $0.168/s (audio on) / $0.112/s (audio off) | ~$0.56–$0.84 | ~$1.12–$1.68 |
| kling-v3-4k | $0.42/s | $2.10 | $4.20 |
| minimax-hailuo-video | Varies | ~$0.30–$0.50 | ~$0.60–$1.00 |

**Formula to use:**
```python
{model_name} = ${price_per_second}/s × {duration}s × {count} videos = ${total}
```

**Duration defaults**: 5s. Never propose 10s first. Only escalate if user asks after seeing a 5s draft.

## Video Upscale

Topaz bills per second of output, by resolution tier:

| Output Resolution | Price/second | Notes |
|------------------|-------------|-------|
| ≤720p | ~$0.01/s | Cheap tier |
| 720p→1080p | ~$0.02/s | Default target |
| >1080p | ~$0.08/s | Premium tier |
| **60fps output** | **2× the tier price** | Downconvert source to 30fps with `--fps 30` to stay on base tier |

## Image Upscale

Cheap — per-image, not per-second. Run autonomously after confirmation. ~$0.02–$0.05 per image.

## Notes

- Prices are estimates. Verify current pricing at https://fal.ai/pricing for exact figures.
- Fal queues can cause variable latency. Images <30s, videos 1–3 min.
- If `price_last_verified` in model registry >30 days old, fetch current pricing from fal.ai before quoting.