# Model Input Format Reference

Different FAL.ai models accept reference images in different API field names. This matters when doing image-to-image generation.

## Reference Image Input Fields

| Model Endpoint | Input Field | Type | Notes |
|----------------|-------------|------|-------|
| `fal-ai/nano-banana-pro/edit` | `image_urls` | Array of strings | Must be array `[url]` not single string. Uses `strength` param (0.70–0.90; 0.85 = good product preservation) |
| `ideogram/v4/image-to-image` | `image_url` | String (singular) | **VERIFIED ✓** (2026-07-10). Uses `strength` (0.65-0.75 ideal), `style_type`, `aspect_ratio`. Returns JPEG. |
| `fal-ai/nano-banana-pro` | None | N/A | Text-to-image only, ignores image input. Does NOT accept image_url or image_urls |
| `fal-ai/flux-2/klein/9b` | None | N/A | Text-to-image only. No edit endpoint available |
| `fal-ai/flux-2-pro` | `image_url` | String | Single URL |
| `fal-ai/flux-2-pro/edit` | `image_url` | String | Single URL |
| `bytedance/seedream/v5/pro/text-to-image` | None | N/A | Text-to-image only |
| `bytedance/seedream/v5/pro/edit` | `image_url` | String | Single URL |
| `fal-ai/ideogram/v3` | None | N/A | Text-to-image only |
| `fal-ai/ideogram/v4` | None | N/A | Text-to-image only |
| `fal-ai/ideogram/remove-background` | `image_url` | String | Single URL |
| `fal-ai/recraft-v3` | `image_url` | String | Single URL |

## Image Size Limits

- **Nano-banana-pro/edit**: max 89,478,400 pixels (roughly 9K resolution)
- **General FAL limit**: files up to 10MB
- Recommended: downscale large images (>10MB) before uploading as references

## File Format Handling

When the user sends an image file directly (not a URL):
1. Save it to `/tmp/` using the `write_file` approach or `terminal` curl download
2. Pass the local path as `--input-image /tmp/filename.jpg`
3. The generate.py script uploads it to FAL CDN via `fal_client.upload_file()`
4. Accepted formats: PNG, JPG, JPEG, WEBP, BMP, TIFF

## Image-to-Image Prompt Pattern

When using a reference image, the prompt describes what to CHANGE or ADD:
- Be explicit about preservation: "while maintaining the same product shape, colors, and texture"
- Use specific verbs: "place the soap on a marble surface" over "transform the scene"
- Don't describe the product from scratch — the reference image provides the subject