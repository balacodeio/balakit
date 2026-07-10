---
name: media-gen
description: >-
  Model-agnostic AI media generation via Fal.ai: images, video, upscale, edits.
  Agent performs intent-matched execution by analyzing the user's request
  against a curated endpoint registry, selecting the optimal Fal.ai endpoint
  via cost-capability trade-off reasoning, then running generate.py.
  Leading words: intent-matched execution, intelligent model routing,
  cost-capability trade-off, task-complexity triage.
  Use whenever the user says "generate an image", "create a photo",
  "make a video", "upscale this", "turn this into a video".
user-invocable: false
disable-model-invocation: false
version: "1.0.0"
author: "Balacode"
tags: ["image-generation", "video-generation", "fal-ai", "media", "model-agnostic", "upscale"]
when_to_use: |
  USE WHEN:
  - User asks to generate, create, make, render, or produce an image/photo/picture.
  - User wants to animate an image into a video, or generate video from an image.
  - User wants to upscale, enhance, or sharpen an image or video.
  - User wants to edit an image (inpaint, outpaint, style transfer, reference).
  - User mentions Fal.ai, or any specific image/video model by name.

  DO NOT USE WHEN:
  - User needs text-to-video from scratch with no seed image (use a video-first workflow).
  - User needs real-time video processing (Fal latency too high).
  - User wants audio/music generation.
---

# Media Generation (Fal.ai)

Model-agnostic AI media pipeline via Fal.ai. The agent performs **intent-matched execution**: it analyzes what the user wants, reasons through the **cost-capability trade-off** of available endpoints, and selects the optimal Fal.ai model before running.

## Setup

```bash
export FAL_KEY="your-key-here"   # or: setx FAL_KEY "key" (Windows)
pip install fal-client
```

Verify: `python scripts/generate.py --help`

## Workflow (2-Phase — Complete Phase 1 Before Phase 2)

### Phase 1: Intent Analysis & Model Selection
Do NOT skip to execution. Complete this phase fully.

1. **Clarify user intent** — What are they making? Subject, style, purpose?
2. **Intent-matched execution** — Classify the request into one capability branch:
   - `image` — text-to-image generation
   - `image-edit` — image-to-image editing (inpaint, style transfer, reference)
   - `video` — animate an existing image into video
   - `upscale` — sharpen + enlarge an existing image or video
3. **Intelligent model routing** — Read the appropriate reference section:
   - Image gen → `references/endpoint-models.md` → `## Image Models`
   - Image edit → `references/endpoint-models.md` → `## Image Edit Models`
   - Video gen → `references/endpoint-models.md` → `## Video Models`
   - Upscale → `references/endpoint-models.md` → `## Upscale Models`
4. **Cost-capability trade-off** — Cross-reference with `references/cost-reference.md`. State:
   - "User wants photorealistic → model X (best_for: photorealism, cost_tier: moderate)"
   - "User wants fast cheap draft → model Y (cost_tier: cheap, speed: fast)"
   - Quote total cost if video (price/sec × duration)
5. **Write a one-sentence model justification** in your reasoning trace
6. **Wait for user confirmation** on the selected model and cost

### Phase 2: Execution

Once confirmed:

```bash
python scripts/generate.py <capability> --endpoint <fal_id> --prompt "..." --title "slug" [other args]
```

Refine the user's casual description into a strong 2-4 sentence prompt before running. Show the user the refined prompt. Ask: "Run this, or want to adjust?"

---

## Commands

Set shorthand: `GEN="python scripts/generate.py"`

### Image
```bash
$GEN image --endpoint "bytedance/seedream/v5/pro/text-to-image" --prompt "..." --title "slug"
$GEN image --endpoint "fal-ai/flux-2/klein/9b" --prompt "..." --title "slug" --aspect-ratio "16:9"
$GEN image --endpoint "fal-ai/qwen-image" --prompt "..." --title "slug" --size "1024x1024"
```

### Image Edit (with reference)
```bash
$GEN image --endpoint "bytedance/seedream/v5/pro/edit" --prompt "..." --title "edit" --input-image /path/to/photo.png
```

### Video
```bash
$GEN video --endpoint "bytedance/seedance-2.0/image-to-video" --image /path/to/image.png --prompt "motion" --title "slug" --folder /path/gen --duration 5
```

### Upscale
```bash
$GEN upscale --endpoint "fal-ai/topaz/upscale/image" --input /path/to/image.png --factor 2
$GEN upscale --endpoint "fal-ai/topaz/upscale/video" --input /path/to/video.mp4 --target-height 1080
```

---

## Leading Words Reference

| Leading Word | Meaning | When to Use |
|---|---|---|
| **intent-matched execution** | Align tool/model choice exactly with user's stated goal | Before model selection |
| **intelligent model routing** | Evaluate task complexity and route to the right endpoint | During Phase 1 step 3 |
| **cost-capability trade-off** | Explicitly weigh quality/speed/cost before committing | During Phase 1 step 4 |
| **task-complexity triage** | Classify the difficulty of the generation request | Before reading reference files |

---

## Cost Rules

- **Image gen**: ~$0.02–$0.10/image — state cost, run after confirmation
- **Video gen**: MUST quote cost before running. Formula: `{model} = ${price_per_second}/s × {duration}s × {count} = ${total}`. Wait for explicit yes.
- **Video upscale**: Same rule. Topaz bills per tier: ≤720p $0.01/s, ≤1080p $0.02/s, >1080p $0.08/s. Price DOUBLES at 60fps.
- **Default duration**: 5s. Never propose 10s first. Only escalate if user asks after seeing 5s draft.

---

## Pitfalls

1. **FAL_KEY not set** — Must be set as environment variable
2. **Model endpoint not found** — Fal may have renamed/deprecated it. Check fal.ai/models
3. **Upload limit** — 10MB. Downscale large images before uploading as references
4. **Rate limits** — Images <30s, videos 1–3 min. Warn user if >5 min
5. **No default model** — Do NOT pick a hardcoded default. Always reason through model selection
6. **Do not auto-animate** — Always ask "Want to turn this into a video?" after image gen
7. **Default duration is 5s** — Never propose 10s as a first option

---

## Output Structure

```
~/Documents/Media Gen/2026-07-09-japanese-garden/
├── prompt.md            # Full metadata: prompts, endpoint, params, timestamps
├── image-01.png
└── video-01.mp4         # Only if video step ran
```

---

## References

- `references/endpoint-models.md` — Curated endpoint registry by capability (image, video, edit, upscale)
- `references/cost-reference.md` — Pricing tables for cost-capability trade-off
- `scripts/generate.py` — CLI script (image | video | upscale subcommands)
- Fal.ai model browser: https://fal.ai/models