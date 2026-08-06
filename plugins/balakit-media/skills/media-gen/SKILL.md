---
name: media-gen
description: >-
  AI media generation via Fal.ai: images, video, upscale, edits.
  Produces Instagram ad creative using a dual-model pipeline —
  runs Nano Banana Pro Edit AND Ideogram v4 Image-to-Image side-by-side
  for every concept, giving the user two takes per brief at negligible cost
  (~$0.28/concept). Always uses image-to-image when a reference image is
  provided, preserving product identity. Crafts photography-grade prompts
  using camera/lens/lighting terminology. Sends 1 image per message
  (Telegram delivery limitation).
  Use whenever the user says "generate an image", "create a photo",
  "make a video", "upscale this", "turn this into a video".
user-invocable: false
disable-model-invocation: false
version: "3.0.0"
author: "Balacode"
tags: [image-generation, video-generation, fal-ai, media, dual-model, social-media-ads, prompt-craft, photography, instagram-ads]
when_to_use: |
  USE WHEN:
  - User asks to generate, create, make, render, or produce an image/photo/picture.
  - User wants to animate an image into a video, or generate video from an image.
  - User wants to upscale, enhance, or sharpen an image or video.
  - User wants to edit an image (inpaint, outpaint, style transfer, re-style).
  - User mentions Fal.ai, or any specific image/video model by name.

  DO NOT USE WHEN:
  - User needs text-to-video from scratch with no seed image (use a video-first workflow).
  - User needs real-time video processing (Fal latency too high).
  - User wants audio/music generation (different domain).
---

# Media Generation (Fal.ai) — v3.0

**Black Forest Labs FLUX Prompting Guide Reference:**
The official FLUX prompting guide is at https://docs.bfl.ml/guides/prompting_summary.md
All photography terminology below is sourced from BFL's official Prompt Reference (https://docs.bfl.ml/guides/prompting_unified_reference.md)

**Key principle from BFL:** *"Prompt the model as if describing a real photograph: specify lens, lighting, framing, and texture details for maximum realism."*

**How FLUX reads prompts:** Write in prose, not keyword lists — describe scenes like a novelist. Lighting descriptions have the highest single impact on output quality.

---

## Setup

```bash
# Prerequisites
export FAL_KEY="your-key-here"   # On Windows: setx FAL_KEY "key" (restart terminal)
pip install fal-client

# CRITICAL: fal-client >= 1.0.0 required for CDN upload (image-to-image)
# Old v0.13.1 broke CDN auth. Upgrade: pip install --upgrade fal-client
```

**CRITICAL: FAL_KEY must use shell expansion, not the literal string.**
Hardcoding the key string (`FAL_KEY="07138a1e-..."`) returns 401 even when the shell-expanded version (`FAL_KEY="$FAL_KEY"`) works. The env var may contain escape characters or may have been rotated since you read it.
  ✅ `FAL_KEY="$FAL_KEY" python scripts/generate.py ...`
  ❌ `FAL_KEY="07138a1e-..." python scripts/generate.py ...`

(Run in foreground, not background, to avoid env-var drop issues)

### Direct Python API (fal_client v1.0.0)

You can bypass `generate.py` and call FAL directly with synchronous API — useful for quick scripts or when you need precise control over parameters:

```python
import fal_client

# Upload a reference image to FAL CDN (SYNCHRONOUS in v1.0.0, do NOT await)
image_url = fal_client.upload_file('C:/Users/ali/product_primary.png')

# Image-to-image with Nano Banana Pro Edit
result = fal_client.run('fal-ai/nano-banana-pro/edit', arguments={
    'image_urls': [image_url],        # REQUIRED: ARRAY, not a single string
    'prompt': 'Your photography-grade prompt...',
    'strength': 0.85                   # 0.70-0.90 range; higher = more original image preserved
})

# Result shape: {'images': [{'url': '...', ...}], 'description': 'model reasoning'}
output_url = result['images'][0]['url']
```

**Key gotchas with direct API:**
- `image_urls` is ALWAYS an array: `[url]` even for a single image. Using `'image_url': url` (string, not array) returns HTTP 422.
- `upload_file` is synchronous — do NOT `await` it. It returns the URL string directly.
- Must use the host filesystem path — on Windows: `C:/Users/<user>/file.png`, NOT `/tmp/file.png`
- Result dict has `images[].url` (not `image.url`). The `description` field holds the model's reasoning.

---

## Model Selection — Dual-Mode Generation

**NEW DEFAULT: Generate 1 image per model per concept** — Always run both Nano Banana Pro Edit AND Ideogram v4 Image-to-Image side-by-side for each creative concept. This gives the user two takes to choose from at negligible cost difference ($0.15 vs $0.13).

### Endpoint Reference

| Model | Endpoint | Best For | Cost | Input Field Key |
|-------|----------|----------|------|-----------------|
| **Nano Banana Pro Edit** | `fal-ai/nano-banana-pro/edit` | Image-to-image with reference preservation. Strong creative interpretation while keeping product identity | **1 unit = $0.15/image** | `image_urls` (ARRAY) |
| **Ideogram v4 I2I** | `ideogram/v4/image-to-image` | Image-to-image with structured JSON prompting. Crisper text, cleaner commercial look, slightly cheaper | **0.88 units ≈ $0.13/image** | `image_url` (string) |
| **Nano Banana (T2I)** | `fal-ai/nano-banana` | Text-to-image only. Use for rough drafts without reference | **~$0.0398/image** | None |
| **FLUX.2 Klein 9B** | `fal-ai/flux-2/klein/9b` | Speed drafts, quick iterations | **~$0.04/image** | None |

**Cost difference is negligible** — Nano Banana Pro is $0.02 more per image than Ideogram. Generate both freely.

### Live Cost Tracking

The FAL API response includes the `x-fal-billable-units` header. Track actual spend:

```python
# Check billable units from response headers
billable = resp.headers.get('x-fal-billable-units', 'N/A')
# 1 unit = $0.15 USD
cost = float(billable) * 0.15
```

### Ideogram v4 I2I — INPUT FORMAT (VERIFIED ✓)

Endpoint: `ideogram/v4/image-to-image`
**This endpoint is PRODUCTION-VERIFIED** (tested 2026-07-10 with Vanilla Pink Salt product).

```python
result = fal_client.run('ideogram/v4/image-to-image', arguments={
    'image_url': 'https://...product.png',       # string, NOT array
    'prompt': 'Your prompt describing the scene...',
    'strength': 0.7,                               # 0.0-1.0; 0.7 preserves product well
    'style_type': 'AUTO',                          # AUTO, PHOTO, ILLUSTRATION, etc.
    'aspect_ratio': 'ASPECT_4_3',                  # ASPECT_4_3, ASPECT_16_9, ASPECT_1_1
    'seed': 42                                     # optional, for reproducibility
})

# Returns: {'images': [{'url': '...'}], 'timings': {'inference': 1.15}, 'seed': 42, 'has_nsfw_concepts': [False], 'prompt': '{...json...}'}
```

**Differences from Nano Banana Pro Edit:**
- `image_url` is a **string** (NOT array like Nano Banana's `image_urls`)
- Lower `strength` works well (0.65-0.75 range). Going above 0.8 may cause artifacts.
- Returns `timings` and `seed` fields
- Returns a structured JSON `prompt` showing the model's deconstructed understanding
- Response is JPEG (not PNG)
- Aspect ratio via `aspect_ratio` parameter (not `image_size`)

### Workflow: Dual-Model Parallel Generation

When generating Instagram ad creative or any product imagery:

```
For EACH creative concept:
  1. Run Nano Banana Pro Edit (1 image)
  2. Run Ideogram v4 I2I (1 image)
  3. Deliver each image in its OWN message (1 image per message — Telegram limitation)
```

**Example output pattern (3 concepts = 6 messages):**
- Msg 1: Nano Banana — Concept A
- Msg 2: Ideogram v4 — Concept A
- Msg 3: Nano Banana — Concept B
- Msg 4: Ideogram v4 — Concept B
- Msg 5: Nano Banana — Concept C
- Msg 6: Ideogram v4 — Concept C

### Decision Rules

When a reference/product image is PROvided:
- **ALWAYS use both models** — Nano Banana Pro Edit + Ideogram v4 I2I
- **ALWAYS use image-to-image** — preserves product shape, texture, and identity
- Never fall back to text-to-image when a reference exists

When NO reference image is provided:
- **Default to Ideogram v4** (text-to-image) for clean commercial quality
- Supplement with Nano Banana T2I for creative variety if desired

---

## Prompt Craft: Photography Language for Photorealism

FLUX.2 excels at generating photorealistic images. Prompt it as if describing a real photograph. The prompt reference below is adapted from BFL's official documentation.

### Camera & Lens Terminology

| Term | Effect | When to Use |
|------|--------|-------------|
| **f/1.4 – f/2.8** | Blurry background (shallow depth of field) | Product hero shots, portraits, macro |
| **f/8 – f/16** | Everything sharp (deep depth of field) | Group shots, landscapes, product detail |
| **24mm** | Wide angle — shows more of the scene | Interior design, environmental shots |
| **35mm** | Natural, documentary-style perspective | Lifestyle, candid, editorial |
| **50mm** | Eye-level, neutral perspective | Standard product, flat lay |
| **85mm** | Portrait-ideal, slight background compression | Beauty, portrait, hero product |
| **135mm+** | Telephoto — strong background compression | Macro detail, compressed product |
| **Macro lens** | Extreme close-up detail | Texture shots, salt crystals, fabric |
| **Anamorphic lens** | Widescreen cinematic look, oval bokeh | Cinematic ads, luxury brand |
| **ISO 100** | Clean image, low noise | Studio product photography |
| **ISO 1600–3200** | Brighter but grainy, film-style look | Vintage, moody, documentary |

### Lighting Terminology

| Term | Effect |
|------|--------|
| **Golden hour** | Warm, soft, flattering — just after sunrise or before sunset |
| **Blue hour** | Cool, moody — just before sunrise or after sunset |
| **Overcast / diffused light** | Flat, even, shadow-free — ideal for product shots |
| **Rembrandt lighting** | Dramatic triangle of light on the subject |
| **Split lighting** | High contrast, half-face illuminated |
| **Chiaroscuro** | Strong light/shadow drama |
| **Backlit / rim light** | Subject glowing at the edges |
| **Soft box / key light** | Studio, controlled, even lighting |
| **Practical lighting** | Light sources visible in scene (lamps, neon, fire) |
| **Harsh direct light** | Strong shadows, high contrast |

### Composition & Framing

| Technique | Use Case | Example Phrase |
|-----------|----------|----------------|
| **Rule of thirds** | Natural, balanced framing | "composed using rule of thirds" |
| **Leading lines** | Guide the eye through the image | "diagonal lines leading to the main subject" |
| **Foreground/background layers** | Add depth and dimension | "strong foreground, blurred background" |
| **Low angle (worm's eye)** | Make subjects powerful | "low angle worm's eye view, dramatic" |
| **High angle (bird's eye)** | Show patterns, flat lay | "bird's eye view, flat lay composition" |
| **Dutch angle** | Tension, psychological unease | "dutch angle, off-kilter" |
| **Symmetrical** | Formal, balanced, architectural | "perfectly symmetrical composition" |
| **Negative space** | Minimal, focused, product | "minimalist, generous negative space" |
| **Shallow depth of field** | Isolate subject from background | "shallow depth of field, bokeh background" |

### Camera & Film References

| Keyword | Effect |
|---------|--------|
| "shot on Kodak Portra 400" | Warm, film-like, natural tones |
| "35mm film" | Classic film grain, authentic |
| "IMAX camera" | Ultra-wide, high fidelity |
| "Sony A7R IV" | Modern digital, high resolution |
| "Hasselblad X2D" | Medium format, luxury look |
| "Canon 5D" | Professional DSLR standard |
| "iPhone 15 Pro" | Modern smartphone photography |

### Style & Aesthetic Keywords

| Category | Keywords |
|----------|----------|
| **Photographic** | "shot on Kodak Portra 400", "35mm film", "Hasselblad X2D", "Sony A7IV" |
| **Cinematic** | "cinematic", "anamorphic lens flare", "teal and orange color grading", "film noir" |
| **Artistic** | "oil painting", "watercolor", "pencil sketch", "impasto texture", "Art Nouveau" |
| **Digital art** | "concept art", "matte painting", "octane render", "unreal engine" |
| **Illustration** | "flat design", "vector illustration", "comic art", "anime style" |
| **Vintage** | "80s vintage photo", "2000s digicam", "VHS aesthetic", "polaroid" |

### FLUX.2 Specifics
- No negative prompts supported
- Excellent typography — use quotation marks for exact text: `label that says "Vanilla Pink Salt"`
- HEX color codes for brand-precise color matching: `"in color #FF5733"`
- JSON structured prompts supported for production workflows
- Add `Style: [style]. Mood: [mood].` at the end for consistent aesthetics
- Reference specific camera models for authentic photorealistic looks

### Product Photography Prompt Template

For product shots, structure your prompt like this:
```
[Camera setup] [Lens/focal length] [Aperture] [ISO] [Lighting] photo of a [product description]
on [surface/background] with [props]. [Composition technique]. [Color palette].
[Mood/aesthetic]. [Brand name].
```

**Example — product macro (from BFL):**
```
Hyper-realistic high-resolution photograph of a hand with nail polish in color #f52a0f,
wearing a glass ring in color #5757cf. The ring is made of translucent glass, wrapping
around the finger twice, with a small white pearl embedded at the center. Shot using a
Sony A7R IV with a 90mm f/2.8 macro lens, ISO 100, shutter 1/250, aperture f/2.8.
```

## High-Conversion Image Prompting (Research-Backed)

> **Full reference:** `references/high-conversion-prompting.md` — Psychology, color theory, composition templates, identity anchor pattern, strength param tables, common failures.

**Core insight:** Every visual element must serve a purpose — grab attention, build desire, or drive action. High-converting images follow a proven psychological sequence:

### The Stop-Scroll Formula

```
ATTENTION (0.2s) → INTEREST (1-2s) → DESIRE (3-5s) → ACTION (click)
```

### Key Psychological Triggers

| Trigger | Application | Prompt Technique |
|---------|-------------|-----------------|
| **Color psychology** | Cream = trust, Mocha = premium, Mauve = luxury | Always specify 2-3 brand colors + background |
| **Sensory cues** | Steam, water droplets, sparkle, texture contrast | `steam rising`, `water droplets glistening`, `crystalline sparkle` |
| **Face-ism effect** | Hands in frame = 35% higher engagement | `hands holding the soap, fingers gently wrapped` |
| **Imperfections** | Air bubbles = handmade = authentic | `tiny air bubbles, handcrafted texture` |
| **Scarcity** | Single product, hero lighting | `one bar of soap, centered, hero lighting` |

### The Identity Anchor Pattern (for I2I)

Every I2I prompt must explicitly answer: **What to CHANGE + What to KEEP**

```
[SCENE: New background, lighting, props]
+ [IDENTITY ANCHOR: Same shape, texture, color, toppings]
```

**Template:**
```
While maintaining the same [rectangular/round] form,
[toppings/details on top], [texture pattern],
and the [color descriptor] of the original product.
```

### Strength Parameters by Concept

| Concept | Nano Banana Pro | Ideogram v4 | 
|---------|----------------|-------------|
| Ingredient Story | **0.70** | **0.65** |
| Spa/Lifestyle | **0.75** | **0.70** |
| Macro Detail | **0.70** | **0.65** |
| Studio Hero | **0.80** | **0.75** |

### Fast-Fail Troubleshooting

| Symptom | Fix |
|---------|-----|
| Color drift | Lower strength + add explicit color + identity anchor |
| Shape changes | Lower strength + add `rectangular/round` + identity anchor |
| Gibberish text | Post-process overlay instead of in-image text |
| AI-looking/waxy | Add `visible air bubbles, natural imperfections, hand-cut edges` |
| Cluttered scene | `clean minimalist composition, generous negative space, limit props to 2-3` |

### Camera Specs by Look

| Look | Lens | Aperture | Prompt Keywords |
|------|------|----------|-----------------|
| Macro detail | 90mm macro | f/2.8 | `ultra detail macro, razor sharp focus` |
| Hero / catalog | 50mm or 85mm | f/5.6-f/8 | `sharp focus throughout, studio product shot` |
| Lifestyle | 35mm or 50mm | f/2.8-f/4 | `shallow depth of field, subject in focus` |
| Flat lay | 35mm or 50mm | f/8-f/11 | `overhead, deep depth of field` |
| Editorial | 85mm | f/2.0-f/2.8 | `creamy bokeh, separated from background` |

---

**This is the DEFAULT workflow for all image generation requests.** When the user asks for images, ads, creatives, or social media content, you MUST complete this Strategy Phase before generating.

### The 3-Concept Framework (Formalized)

For every product, generate exactly 3 concepts, each with a different purpose. This was battle-tested with Vanilla Pink Salt and confirmed by the user:

| # | Concept | Purpose | Shot Type | Best For | Example Use |
|---|---------|---------|-----------|----------|-------------|
| **1** | **Ingredient Story** | Primary ad — sells the craft | Ambient, styled with raw ingredients on rustic surface | **First ad in feed**, brand story | Product on wood with vanilla beans + salt crystals |
| **2** | **Spa/Lifestyle Context** | Carousel — sells the feeling | Lifestyle scene in actual use environment | **Middle carousel**, aspirational | Product on marble counter with candle + towel |
| **3** | **Macro Texture** | Carousel end — sells the quality | Extreme close-up, shallow depth of field | **End carousel**, detail shot | Salt crystals, swirls, moisture droplets, bokeh |

**User feedback from testing:**
- Concept 1 (Ingredient Story) was the **strongest performer** for both models
- Concept 2 (Spa) can have colour accuracy issues — keep prompts tight with brand colours
- Concept 3 (Macro) was strong for Ideogram v4, very strong for Nano Banana
- The user likes both models — Nano Banana for creative interpretation, Ideogram for structured quality

### Delivery: 1 Image Per Message

**CRITICAL:** Do NOT batch multiple images in a single message. Telegram/WhatsApp platforms may only show the first image. Send each image in its own message:

- ❌ One message with 3 images: "Here are the concepts!"
- ✅ Three separate messages: "Concept 1 — Ingredient Story [image]" → "Concept 2 — Spa [image]" → "Concept 3 — Macro [image]"

Label each message clearly with the model used and concept name so the user can compare easily.

### Step 1: Analyse the Product & Brand
- What's the product? What's the vibe/positioning?
- What colours, textures, and aesthetics are in the source images?
- Who is the target audience? (e.g., spa-goers, natural skincare lovers, luxury self-care)
- **What is the actual use context?** (shower, kitchen, bath, face, hands — NOT a prop pairing)

### Step 2: Define the Ad Set
Plan 2-3 creative directions. Each should serve a different purpose:

| Image | Purpose | Shot Type |
|-------|---------|-----------|
| **Hero/Lifestyle** | Primary ad — sells the vibe | Ambient, styled scene with props |
| **Texture/Macro** | Carousel middle — sells the quality | Extreme close-up, shallow DoF |
| **Clean Product** | Carousel end — sells the product | Studio, clean background, minimal |

### Step 3: Creative Direction — CRITICAL GUARDRAILS

**🚫 NEVER create nonsensical scenes.** A product must be shown in its actual use context. Examples:
- ❌ A soap bar beside a coffee cup — the product is a SOAP, not a beverage. The coffee connection is through ingredients (grounds as exfoliant) and scent, not literal drinking.
- ❌ A candle next to a book — the pairing tells no story about the product.
- ✅ Show the soap in a shower/bath context with steam, or as an ingredient story (coffee grounds, beans on wood).

**For product ads, think like a marketing person, not a photographer:**
- What story does this scene tell about the product?
- Does the prop make sense with the product's actual use?
- Is the connection between product and props metaphorical (good) or forced (bad)?

**Research-backed creative concepts for artisanal/bath products (from NotebookLM):**

| Concept | What it shows | Why it works |
|---------|--------------|-------------|
| **Process / "Making Of"** | Pouring ingredients, slicing loaves, embedding toppings | Satisfying visuals, proves it's handmade |
| **Use Context** | Product in its actual environment (shower, bath, sink) | Customer can imagine using it |
| **Ingredient Call-Out** | Macro shot with labels pointing to key ingredients | Educates, builds trust, sells the "why" |
| **Sensory/ASMR** | Close-up of lather, texture, ingredients | Tactile, shareable, stands out in feed |
| **Before/After** | Problem → product → result | Demonstrates value clearly |

### Step 4: Write Copy Hooks
Before generating, draft 1-2 ad copy hooks per image. Use the product's voice.
- Hook must be product-specific, not generic
- Focus on ingredient benefits (exfoliation, nourishment, energizing)
- For bath/body: target the ingredient psychology — what does each ingredient DO for the user?

### Step 5: Craft Photography-Grade Prompts
For each image, write a prompt using the photography language from the Prompt Craft section above. Include:
- Camera/lens/lights (e.g., "85mm f/2.8, soft diffused studio lighting")
- Surface/background (e.g., "on warm oak wood, cream linen backdrop")
- Props/composition (e.g., "dried vanilla beans, scattered pink salt")
- Mood/aesthetic (e.g., "spa-like organic luxury, warm earthy tones")

---

## Workflow (3-Phase, Agent Must Complete All)

### Phase 1: Intent Analysis & Strategy

1. **Analyse the brief** — What's the output format? (Instagram square, story, carousel, banner)
2. **If a product URL is provided:** Navigate to the page and extract:
   - Product name and description
   - Primary product image(s) at highest resolution
   - Brand colours and aesthetics
   
   **⚠️ Wix / JS-heavy site fallback:** If the browser tool errors out (blank page, WinError), the site is likely a Wix SPA. Do NOT retry the browser — switch to `curl + grep` to extract `wixstatic.com` image URLs from the raw HTML. See `references/wix-product-image-extraction.md` for the full recipe. Download images to `C:/Users/<user>/` not `/tmp/` (fal_client upload_file needs native Windows paths for `os.path.getsize`).
3. **If a reference image is provided (URL or file):** Classify the capability as `image-edit` (image-to-image) to preserve the subject's identity. The reference image becomes the foundation.
4. **Classify into capability branch:**
   - `image` — text-to-image generation (no reference image provided)
   - `image-edit` — image-to-image editing (reference image IS provided — ALWAYS prefer this)
   - `video` — animate an existing image into video
   - `upscale` — sharpen + enlarge an existing image or video
5. **This is an Instagram ad brief** — Default to the full Instagram Ad Creative Strategy (3-Concept Framework, dual-model generation, 1 image per message delivery). Run the strategy before proceeding.
6. **Intelligent model routing** — When an image-to-image reference is provided, ALWAYS use both Nano Banana Pro Edit + Ideogram v4 I2I in parallel. See the Model Selection section above for exact endpoint parameters.
7. **Cost-capability trade-off** — Cross-reference with `references/cost-reference.md`. State the total cost (~$0.85 for a full 3-concept set with both models). Note: costs are negligible, no need to pre-approve image runs.

### Phase 2: Prompt Engineering

1. **Refine the user's description into a photography-grade prompt** using the Prompt Craft terms above.
2. **Structure: Camera → Lens → Aperture → Lighting → Subject → Surface → Props → Composition → Mood**
3. **For image-to-image (reference provided):**
   - The prompt describes what to CHANGE or ADD to the reference image
   - Be explicit about preservation: "while maintaining the same product shape, colors, and texture"
   - Use specific verbs: "place the soap on a marble surface" over "transform the scene"
4. **For text-to-image (no reference):**
   - Full scene description from scratch using photography language
5. **Show the user the refined prompt.** Ask: "Run this, or want to adjust?"

### Phase 3: Execution

**CRITICAL: FAL_KEY must be passed inline.** Background processes lose the env var. Always run in foreground:

```bash
# Image-to-image (with reference image):
FAL_KEY="$FAL_KEY" python scripts/generate.py image \
  --endpoint "fal-ai/nano-banana-pro/edit" \
  --prompt "refined prompt here" \
  --title "slug" \
  --aspect-ratio "1:1" \
  --input-image /path/to/reference.png

# Text-to-image (no reference):
FAL_KEY="$FAL_KEY" python scripts/generate.py image \
  --endpoint "fal-ai/flux-2/klein/9b" \
  --prompt "refined prompt here" \
  --title "slug" \
  --aspect-ratio "1:1"

# For brand-color precision, add HEX: "in color #E8D5C4 and #C27A8A"
```

---

## Commands

Set shorthand: `GEN="FAL_KEY=\"$FAL_KEY\" python scripts/generate.py"`

### Image (text-to-image)
```bash
$GEN image --endpoint "fal-ai/flux-2/klein/9b" --prompt "..." --title "slug" --aspect-ratio "1:1"
```

### Image Edit (image-to-image — preferred when reference image exists)
```bash
$GEN image --endpoint "fal-ai/nano-banana-pro/edit" --prompt "..." --title "edit" --input-image /path/to/reference.png
```

### Video
```bash
$GEN video --endpoint "bytedance/seedance-2.0/image-to-video" --image /path/to/image.png --prompt "motion" --title "slug" --folder /path/gen --duration 5
```

### Upscale
```bash
$GEN upscale --endpoint "fal-ai/topaz/upscale/image" --input /path/to/image.png --factor 2
$GEN upscale --endpoint "fal-ai/topaz/upscale/video" --input /path/to/video.mp4 --target-height 1080 --fps 30
```

---

## Output Structure

```
~/Documents/Media Gen/2026-07-09-japanese-garden/
├── prompt.md            # Full metadata: prompts, model, params, timestamps
├── image-01.png
└── video-01.mp4         # Only if video step ran
```

---

## Cost Quoting (Mandatory for Video)

- **Image gen**: ~$0.02-0.10/image — state cost, run autonomously after confirmation
- **Video gen**: MUST quote cost before running. Formula:
  `{model} = ${price_per_second}/s × {duration}s × {N} videos = ${total}`
  Use `references/cost-reference.md` for current pricing.
  Wait for explicit yes.
- **Video upscale**: Same rule. Topaz bills per tier:
  ≤720p: $0.01/s | ≤1080p: $0.02/s | >1080p: $0.08/s
  Price DOUBLES at 60fps. Use `--fps 30` to halve cost.

---

## Leading Words Reference

| Leading Word | Meaning | When to Use |
|---|---|---|
| **intent-matched execution** | Align tool/model choice exactly with user's stated goal | Before model selection |
| **intelligent model routing** | Evaluate task complexity and route to the right endpoint | During Phase 1 step 3 |
| **cost-capability trade-off** | Explicitly weigh quality/speed/cost before committing | During Phase 1 step 4 |
| **task-complexity triage** | Classify the difficulty of the generation request | Before reading reference files |
| **prompt craft** | Use photography language (lens, aperture, lighting, ISO) | During Phase 2 prompt engineering |

---

## Pitfalls

1. **FAL_KEY must use shell expansion — hardcoding the literal key fails** — Always use `FAL_KEY="$FAL_KEY"` not `FAL_KEY="literal_key_string"`. The shell variable may contain extra characters or the key may be rotated. Shell expansion resolves correctly; hardcoded strings return 401.
2. **fal-client version matters** — CDN upload for image-to-image requires fal-client >= 1.0.0. v0.13.1 breaks `rest.fal.ai/storage/auth/token` with 405. Upgrade: `pip install --upgrade fal-client`
3. **Reference image provided → MUST use image-to-image** — Never use text-to-image when a product URL or reference image is available. The edit endpoints preserve product identity.
4. **Model endpoint not found** — Fal.ai may have renamed/deprecated it. Check fal.ai/models
5. **Response schema changed** — Update `output_path` mapping in references if Fal changes the API
6. **Upload limit** — Fal accepts files up to 10MB. Downscale large images before uploading as references
7. **Rate limits / queue** — Images <30s, videos 1-3 min. Warn user if >5 min
8. **No default model** — Do NOT pick a hardcoded default. Always reason through model selection
9. **Do not auto-animate** — Always ask "Want to turn this into a video?" after image generation
10. **Default duration is 5s** — Never propose 10s as a first option. Only escalate if user asks after seeing the 5s draft
11. **Instagram ads skip strategy** — NEVER skip the Instagram Ad Creative Strategy. Always plan the ad set before generating.
12. **Nonsensical product scenes** — Don't put a soap bar beside a coffee cup or create other pairings that don't make sense. The product must be shown in its actual use context (soap → shower/bath, not coffee drinking). Think like a marketing person: what story does this scene tell about the product?
13. **Nano Banana Pro Edit uses `image_urls` (array), NOT `image_url` (string)** — Passing `image_url: url` as a single string returns HTTP 422. Always use `image_urls: [url]` even for a single reference image.
14. **Wix / JS-heavy product pages break the browser tool** — Do NOT retry the browser. Switch immediately to `curl + grep wixstatic.com`. See `references/wix-product-image-extraction.md`.
15. **fal_client v1.0.0 `upload_file` is synchronous** — On Windows, pass an absolute path like `C:/Users/<user>/file.png`, not `/tmp/file.png`. The function calls `os.path.getsize()` which resolves against the native filesystem, not MSYS. Do NOT `await` it.
17. **`fal_client.run()` is the synchronous replacement for `subscribe()`** — `run_sync` does not exist in v1.0.0. Use `run()` directly without await.
18. **1 image per message** — Telegram and similar platforms may only render the first image in a multi-image message. Always send 1 image per message.
19. **Ideogram v4 I2I uses `image_url` (string), Nano Banana Pro Edit uses `image_urls` (array)** — Mixing these up returns 422. Always double-check the input field name.
20. **Cost data is in `x-fal-billable-units` response header, not the response body** — Use `resp.headers.get('x-fal-billable-units')` to get exact billable units. 1 unit = $0.15 USD.
21. **Both models together cost ~$0.28 per concept** — Run both freely. The total for a full 3-concept ad set (6 images) is ~$0.85.

---

## References

- `references/endpoint-models.md` — Curated model registry by capability (image, video, edit, upscale)
- `references/fal-key-troubleshooting.md` — FAL key formats, endpoint access, recovery steps, CDN fix
- `references/model-input-formats.md` — Which models accept which image input fields (image_url vs image_urls[]), plus `strength` parameter range for I2I
- `references/ad-psychology-guide.md` — Deep psychology: color emotion, subliminal cues, scanning patterns, persuasion, stop-scroll triggers
- `references/high-conversion-prompting.md` — Psychology, color theory, composition, identity anchor, strength tables, troubleshooting
- `references/wix-product-image-extraction.md` — Extracting product images from Wix JS-heavy sites using curl+grep
- `references/cost-reference.md` — Pricing tables for cost-capability trade-off
- `scripts/generate.py` — CLI script (image | video | upscale subcommands)
- `config.json` — Output directory config
- BFL Prompting Guide: https://docs.bfl.ml/guides/prompting_summary.md
- BFL Prompt Reference: https://docs.bfl.ml/guides/prompting_unified_reference.md
- BFL Photorealism Guide: https://docs.bfl.ml/guides/usecases_t2i_photorealistic.md
- Fal.ai model browser: https://fal.ai/models