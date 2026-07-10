---
purpose: "Pricing reference for cost-capability trade-off reasoning."
note: "Agent should cross-reference selected model with this table before quoting costs. Video costs MUST be quoted before execution. Image costs are negligible — run both models freely."
last_updated: 2026-07-10
---

# Cost Reference

## Image Generation — Billing Units & Live Tracking

FAL bills in **billable units**. The exact number is returned in the `x-fal-billable-units` response header. 1 unit = $0.15 USD.

### Verified Per-Image Costs (2026-07-10)

| Model Endpoint | Billable Units | Cost/Image | Input Field | Notes |
|----------------|:-:|:-:|------------|-------|
| `fal-ai/nano-banana-pro/edit` | 1.0 unit | **$0.15** | `image_urls` (array) | I2I with reference preservation |
| `ideogram/v4/image-to-image` | ~0.88 units | **~$0.13** | `image_url` (string) | I2I remix. Verified ✓ |
| `fal-ai/nano-banana` (T2I) | — | **~$0.0398** | None | Text-to-image only |
| `fal-ai/flux-2/klein/9b` | — | **~$0.04** | None | Speed drafts |

### Live Cost Tracking via API

```bash
# Check billable units from response headers
curl -s -D - -o /dev/null \\
  "https://fal.run/fal-ai/nano-banana-pro/edit" \\
  -H "Authorization: Key $FAL_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"image_urls": ["..."], "prompt": "..."}' \\
  | grep -i x-fal-billable
```

```python
# Via fal_client
import httpx, os
resp = httpx.post('https://fal.run/{endpoint}', 
    json={...},
    headers={'Authorization': f'Key {os.environ["FAL_KEY"]}'})
billable = resp.headers.get('x-fal-billable-units', '0')
cost = float(billable) * 0.15
print(f'Cost: ${cost:.2f}')
```

### "Dual-Model" Cost Summary

For Instagram ad creative (3 concepts × 2 models):
| Item | Images | Cost |
|------|:------:|:----:|
| Nano Banana Pro Edit (3 concepts) | 3 | $0.45 |
| Ideogram v4 I2I (3 concepts) | 3 | $0.40 |
| **Total per product** | **6** | **~$0.85** |

Both models together cost less than a dollar per product. **Run them both, every time.**

## Traditional Pricing Table (for reference)

All image models are charged **per image**, independent of resolution (up to model limits). Typical cost range: **$0.02–$0.15 per image**.

| Cost Tier | Typical Price | Models |
|-----------|--------------|--------|
| cheap | ~$0.02/image | seedream-v5-lite, seedance-2-fast (video) |
| moderate | ~$0.04–$0.15/image | seedream-v5-pro, qwen-image, nano-banana-pro, nano-banana-pro-edit, flux-2-klein |
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
```
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