# Wix Product Page Image Extraction

Wix sites are JS-rendered SPAs. The browser tool cannot render them (blank page / WinError). Use `curl + grep` to extract product images directly from the static HTML.

## Extraction Recipe

```bash
# Step 1: Fetch raw HTML and find all wixstatic image URLs
curl -sL "https://www.terrabath.com/product-page/vanilla-pink-salt" \
  | grep -oP 'src="[^"]*"' | grep wixstatic

# Step 2: Spot the primary product images (skip blurry thumbnails)
# Wix serves images at multiple sizes with progressive quality:
#   /v1/fit/w_480,h_480,q_30/   ← blurry thumbnail (q_30)
#   /v1/fit/w_960,h_960,q_90/   ← high quality (q_90, enc_avif)
# Primary product images are:
#   - First non-blurry wixstatic PNG/JPEG at max resolution
#   - Often have multiple variants of the same asset ID
#   - The q_90, enc_avif variant is the best quality available

# Step 3: Download the best-quality version
# Take the w_960,q_90,enc_avif variant for best resolution-to-file-size ratio
curl -sL "https://static.wixstatic.com/media/164e4d_b71ee637836940b599bd59f938f27118~mv2.png/v1/fit/w_960,h_960,q_90,enc_avif,quality_auto/164e4d_b71ee637836940b599bd59f938f27118~mv2.png" \
  -o "C:/Users/ali/product_primary.png"
```

## Image URL Anatomy (Wix)

```
https://static.wixstatic.com/media/
  {siteId}_{assetId}~mv2.{ext}
  /v1/fit/
  w_{width},h_{height},q_{quality}/
  {filename}
```

- **siteId**: `164e4d` — Terra Bath's Wix site ID
- **assetId**: unique per uploaded image (e.g. `b71ee637836940b599bd59f938f27118`)
- **~mv2**: Wix internal version marker
- **ext**: `png` or `jpg` depending on source format
- **q_30** = thumbnail (low quality, blurry)
- **q_90** = high quality
- **enc_avif** = best compression (preferred)

## Gotchas

- The browser tool (Hermes snapshot / navigation) will NOT work on Wix product pages. Use curl.
- Storyblocks / Wix Stores pages may have slightly different HTML structure. Grep `wixstatic.com/media` broadly first, then filter.
- Wix may embed product descriptions in JSON blobs inside `<script>` tags rather than visible DOM — grep for `"productName"` or component JSON if you need description text.
- On Windows, download to `C:/Users/<user>/` (MSYS `/tmp/` fails in `os.path.getsize` when fal_client tries to read the file).
