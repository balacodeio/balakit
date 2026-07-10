---
purpose: "Curated Fal.ai endpoint registry organized by capability branch."
note: "Agent loads only the section(s) matching the current task. No hardcoded default — agent must reason through selection."
last_updated: 2026-07-09
---

# Endpoint Models

Agent: read only the section matching your classified capability branch. Perform **intelligent model routing**: pick the model whose `best_for` best matches the user's intent, style, and quality needs. Write a one-sentence justification in your reasoning trace.

## Image Models (Text-to-Image)

| Key | Endpoint ID (fal_id) | best_for | cost_tier | speed | notes |
|-----|---------------------|----------|-----------|-------|-------|
| seedream-v5-pro | `bytedance/seedream/v5/pro/text-to-image` | Photorealistic, 14-language text rendering, dense layouts | moderate | medium | ByteDance flagship. Natural-language prompts |
| seedream-v5-lite | `bytedance/seedream/v5/lite/text-to-image` | Fast iteration drafts, testing prompts | cheap | fast | Cheaper variant of Seedream Pro |
| qwen-image | `fal-ai/qwen-image` | Complex text rendering (Chinese, Arabic), precise edits | moderate | medium | Alibaba Qwen. Strong for text-heavy images |
| nano-banana-pro | `fal-ai/nano-banana-pro` | Photorealistic and stylized fallback | moderate | medium | Text-to-image ONLY, ignores image_urls |
| flux-2-klein | `fal-ai/flux-2/klein/9b` | Open-weights photorealism, strong prompt adherence | moderate | medium | Black Forest Labs FLUX.2 Klein 9B |
| flux-2-pro | `fal-ai/flux-2-pro` | Premium quality, best prompt adherence | premium | medium | Black Forest Labs top tier |
| flux-2-turbo | `fal-ai/flux-2/turbo` | Fastest FLUX iteration | moderate | fast | Good for rapid prototyping |
| recraft-v3 | `fal-ai/recraft-v3` | Illustration, vector-like, brand styles | moderate | medium | Good for marketing graphics |
| ideogram-v3 | `fal-ai/ideogram/v3` | Strong text rendering, logos, typography | moderate | medium | Good for text-heavy designs |

## Image Edit Models (Image-to-Image)

| Key | Endpoint ID (fal_id) | best_for | cost_tier | notes |
|-----|---------------------|----------|-----------|-------|
| seedream-v5-pro-edit | `bytedance/seedream/v5/pro/edit` | Edit existing images: inpainting, style transfer | moderate | Accepts `image_url` |
| nano-banana-pro-edit | `fal-ai/nano-banana-pro/edit` | Edit with reference image preservation | moderate | Honors `image_urls` for identity/composition |
| flux-2-pro-edit | `fal-ai/flux-2-pro/edit` | Premium-quality edits with FLUX.2 | premium | Best quality edits |

## Video Models (Image-to-Video)

| Key | Endpoint ID (fal_id) | best_for | cost_tier | speed | notes |
|-----|---------------------|----------|-----------|-------|-------|
| seedance-2-pro | `bytedance/seedance-2.0/image-to-video` | Cinematic motion, synced audio, start/end frames | moderate | medium | ByteDance flagship video |
| seedance-2-fast | `bytedance/seedance-2.0/fast/image-to-video` | Fast iteration drafts | cheap | fast | Cheaper, faster Seedance |
| kling-v3-pro | `fal-ai/kling-video/v3/pro/image-to-video` | Cinematic visuals, fluid motion, native audio | premium | medium | Kuaishou — strong quality |
| kling-v3-4k | `fal-ai/kling-video/v3/4k/image-to-video` | Native 4K video output | premium | slow | Only when 4K delivery required |
| minimax-hailuo-video | `fal-ai/minimax/hailuo-02/standard/image-to-video` | Character animation, motion coherence | moderate | medium | MiniMax — good for characters |

## Upscale Models

| Key | Endpoint ID (fal_id) | best_for | cost_tier | notes |
|-----|---------------------|----------|-----------|-------|
| topaz-image | `fal-ai/topaz/upscale/image` | Sharpen + upscale photos | cheap | Topaz Standard V2. Aspect-preserving |
| topaz-video | `fal-ai/topaz/upscale/video` | Sharpen + upscale video footage | variable | Proteus model. Pricing by resolution tier |