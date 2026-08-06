"""
Model-agnostic Fal.ai media generator. The agent performs intent-matched
execution by selecting the endpoint and passing it directly. No hardcoded
model defaults in this script — the agent reasons about which model to use.

Usage:
  python generate.py image --endpoint <fal_id> --prompt "..." --title "slug"
  python generate.py video --endpoint <fal_id> --image <path> --prompt "..." --title "slug" --folder <folder>
  python generate.py upscale --endpoint <fal_id> --input <path>
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

try:
    import fal_client
except ImportError:
    sys.stderr.write("ERROR: fal_client not installed. Run: pip install fal-client\n")
    sys.exit(2)


def find_skill_root() -> Path:
    return Path(__file__).resolve().parent.parent


def load_config():
    root = find_skill_root()
    config_path = root / "config.json"
    config = json.loads(config_path.read_text(encoding="utf-8"))
    return config


def slugify(text: str) -> str:
    s = re.sub(r"[^\w\s-]", "", text.lower())
    s = re.sub(r"[-\s]+", "-", s).strip("-")
    return s[:50] or "untitled"


def expand_path(p: str) -> Path:
    return Path(os.path.expanduser(os.path.expandvars(p)))


def get_or_make_folder(output_dir: Path, working_title: str) -> Path:
    date = time.strftime("%Y-%m-%d")
    folder = output_dir / f"{date}-{slugify(working_title)}"
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def next_index(folder: Path, kind: str, ext: str) -> int:
    pat = re.compile(rf"^{kind}-(\d+)\.{ext}$")
    used = []
    for f in folder.iterdir():
        m = pat.match(f.name)
        if m:
            used.append(int(m.group(1)))
    return (max(used) + 1) if used else 1


def download(url: str, dest: Path) -> None:
    urllib.request.urlretrieve(url, dest)


def deep_get(obj, dotted: str):
    cur = obj
    for part in dotted.split("."):
        m = re.match(r"^(\w+)\[(\d+)\]$", part)
        if m:
            cur = cur[m.group(1)][int(m.group(2))]
        else:
            cur = cur[part]
    return cur


def require_fal_key() -> None:
    if not os.environ.get("FAL_KEY"):
        sys.stderr.write("ERROR: FAL_KEY not set.\n")
        sys.exit(3)


def write_prompt_md(folder: Path, payload: dict) -> None:
    md = folder / "prompt.md"
    if not md.exists():
        md.write_text(
            f"# {payload.get('working_title', folder.name)}\n\n"
            f"**Created:** {time.strftime('%Y-%m-%d %H:%M:%S')}\n\n",
            encoding="utf-8",
        )
    with md.open("a", encoding="utf-8") as f:
        kind = payload["kind"]
        f.write(f"\n## {kind.title()} generation\n\n")
        f.write(f"- **Endpoint:** `{payload['endpoint']}`\n")
        f.write(f"- **File:** `{payload['filename']}`\n")
        for k, v in payload.get("args", {}).items():
            f.write(f"- **{k}:** {v}\n")
        f.write(f"\n### {kind.title()} prompt\n\n{payload['prompt']}\n")


# ── Auto-detect output path from Fal API result ──────────────────────────
# Most image endpoints return {images: [{url: ...}]} or {image: {url: ...}}.
# Most video endpoints return {video: {url: ...}}.
# We try common patterns in priority order.

OUTPUT_PATH_PATTERNS = [
    "images[0].url",
    "image.url",
    "image_url",
    "video.url",
    "video_url",
]


def resolve_output_urls(result: dict) -> list[str]:
    """Return one or more HTTP URLs from a Fal result."""
    urls: list[str] = []

    images = result.get("images")
    if isinstance(images, list):
        for item in images:
            if isinstance(item, dict):
                url = item.get("url")
                if isinstance(url, str) and url.startswith("http"):
                    urls.append(url)
            elif isinstance(item, str) and item.startswith("http"):
                urls.append(item)

    if urls:
        return urls

    for pattern in OUTPUT_PATH_PATTERNS:
        try:
            value = deep_get(result, pattern)
        except (KeyError, IndexError, TypeError):
            continue
        if isinstance(value, str) and value.startswith("http"):
            return [value]

    for val in result.values():
        if isinstance(val, str) and val.startswith("http"):
            return [val]
        if isinstance(val, dict):
            for nested in val.values():
                if isinstance(nested, str) and nested.startswith("http"):
                    return [nested]

    raise ValueError(
        f"Could not resolve output URL from Fal result. "
        f"Raw: {json.dumps(result, default=str)[:1000]}"
    )


# ── Commands ─────────────────────────────────────────────────────────────

def cmd_image(args) -> None:
    require_fal_key()
    config = load_config()
    output_dir = expand_path(config.get("output_dir", "~/Documents/Media Gen"))

    endpoint = args.endpoint
    call_args = {}
    call_args["prompt"] = args.prompt
    if args.size:
        call_args["image_size"] = args.size
    if args.aspect_ratio:
        call_args["aspect_ratio"] = args.aspect_ratio
    if args.num_images:
        call_args["num_images"] = args.num_images
    if args.negative_prompt:
        call_args["negative_prompt"] = args.negative_prompt
    if args.strength is not None:
        call_args["strength"] = args.strength

    # Upload reference image if provided
    if args.input_image:
        ip = expand_path(args.input_image[0])
        if not ip.is_file():
            sys.stderr.write(f"ERROR: input image not found: {ip}\n")
            sys.exit(5)
        sys.stderr.write(f"[media-gen] Uploading reference: {ip.name}\n")
        sys.stderr.flush()
        call_args["image_url"] = fal_client.upload_file(str(ip))

    folder = get_or_make_folder(output_dir, args.title)

    sys.stderr.write(f"[media-gen] Generating image via {endpoint}...\n")
    sys.stderr.flush()

    result = fal_client.subscribe(endpoint, arguments=call_args, with_logs=False)
    urls = resolve_output_urls(result)

    saved_paths: list[str] = []
    fal_urls: list[str] = []
    for url in urls:
        idx = next_index(folder, "image", "png")
        filename = f"image-{idx:02d}.png"
        out_path = folder / filename
        download(url, out_path)
        saved_paths.append(str(out_path))
        fal_urls.append(url)

        write_prompt_md(folder, {
            "kind": "image",
            "endpoint": endpoint,
            "filename": filename,
            "prompt": args.prompt,
            "working_title": args.title,
            "args": {k: v for k, v in call_args.items() if k != "prompt"},
        })

    print(json.dumps({
        "image_path": saved_paths[0],
        "image_paths": saved_paths,
        "folder": str(folder),
        "endpoint": endpoint,
        "fal_url": fal_urls[0],
        "fal_urls": fal_urls,
    }))


def cmd_video(args) -> None:
    require_fal_key()
    config = load_config()
    output_dir = expand_path(config.get("output_dir", "~/Documents/Media Gen"))

    endpoint = args.endpoint

    folder = expand_path(args.folder) if args.folder else get_or_make_folder(output_dir, args.title)
    if not folder.is_dir():
        sys.stderr.write(f"ERROR: folder does not exist: {folder}\n")
        sys.exit(5)

    image_path = expand_path(args.image)
    if not image_path.is_file():
        sys.stderr.write(f"ERROR: image not found: {image_path}\n")
        sys.exit(5)

    sys.stderr.write("[media-gen] Uploading image to Fal...\n")
    sys.stderr.flush()
    image_url = fal_client.upload_file(str(image_path))

    call_args = {"image_url": image_url, "prompt": args.prompt}
    if args.duration is not None:
        call_args["duration"] = args.duration

    idx = next_index(folder, "video", "mp4")
    filename = f"video-{idx:02d}.mp4"
    out_path = folder / filename

    sys.stderr.write(f"[media-gen] Generating video via {endpoint} (1-3 min)...\n")
    sys.stderr.flush()

    result = fal_client.subscribe(endpoint, arguments=call_args, with_logs=False)
    url = resolve_output_urls(result)[0]
    download(url, out_path)

    write_prompt_md(folder, {
        "kind": "video",
        "endpoint": endpoint,
        "filename": filename,
        "prompt": args.prompt,
        "working_title": args.title,
        "args": {k: v for k, v in call_args.items() if k not in ("prompt", "image_url")},
    })

    print(json.dumps({
        "video_path": str(out_path),
        "folder": str(folder),
        "endpoint": endpoint,
        "fal_url": url,
    }))


IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".tif"}
VIDEO_EXTS = {".mp4", ".mov", ".mkv", ".webm", ".avi", ".m4v"}


def _ffprobe_stream(path: Path) -> dict:
    if not shutil.which("ffprobe"):
        return {}
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "v:0",
             "-show_entries", "stream=width,height,r_frame_rate",
             "-of", "json", str(path)],
            capture_output=True, text=True, check=True,
        ).stdout
        st = json.loads(out)["streams"][0]
        fps = None
        rate = st.get("r_frame_rate", "")
        if "/" in rate:
            num, den = rate.split("/")
            if float(den) != 0:
                fps = float(num) / float(den)
        return {"width": int(st["width"]), "height": int(st["height"]), "fps": fps}
    except Exception:
        return {}


def _transcode_fps(src: Path, target_fps: int, work_dir: Path) -> Path:
    if not shutil.which("ffmpeg"):
        sys.stderr.write("[media-gen] ffmpeg not found; skipping fps change.\n")
        return src
    dst = work_dir / f"_fps{target_fps}-{src.stem}.mp4"
    sys.stderr.write(f"[media-gen] Pre-converting to {target_fps}fps...\n")
    sys.stderr.flush()
    cmd = [
        "ffmpeg", "-y", "-i", str(src), "-r", str(target_fps),
        "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        "-pix_fmt", "yuv420p",
    ]
    if shutil.which("ffprobe"):
        probe = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "a:0",
             "-show_entries", "stream=index", "-of", "csv=p=0", str(src)],
            capture_output=True, text=True,
        )
        if probe.returncode == 0 and probe.stdout.strip():
            cmd.extend(["-c:a", "copy"])
        else:
            cmd.append("-an")
    else:
        cmd.append("-an")
    cmd.append(str(dst))
    try:
        subprocess.run(cmd, capture_output=True, check=True)
    except subprocess.CalledProcessError as exc:
        sys.stderr.write(
            "[media-gen] ffmpeg transcode failed; continuing with original file.\n"
        )
        if exc.stderr:
            sys.stderr.write(exc.stderr.decode("utf-8", errors="replace")[:500] + "\n")
        return src
    return dst


def cmd_upscale(args) -> None:
    require_fal_key()
    config = load_config()
    output_dir = expand_path(config.get("output_dir", "~/Documents/Media Gen"))

    endpoint = args.endpoint
    in_path = expand_path(args.input)
    if not in_path.is_file():
        sys.stderr.write(f"ERROR: input file not found: {in_path}\n")
        sys.exit(5)

    ext = in_path.suffix.lower()
    is_video = ext in VIDEO_EXTS or (args.type == "video")
    if args.type == "image":
        is_video = False

    probe = _ffprobe_stream(in_path)
    if args.factor is not None:
        factor = float(args.factor)
    elif probe.get("height"):
        factor = round(args.target_height / probe["height"], 4)
        if factor < 1.0:
            sys.stderr.write(
                "ERROR: --target-height is below the source height. "
                "Topaz upscale cannot downscale; pass an explicit --factor below 1.0 "
                "only if the endpoint supports it.\n"
            )
            sys.exit(6)
    else:
        sys.stderr.write(
            "ERROR: couldn't read source height and no --factor given.\n"
            "  Pass --factor (e.g. 2) or install ffmpeg.\n"
        )
        sys.exit(6)
    factor = max(1.0, min(factor, 8.0))

    upload_path = in_path
    work_title = args.title or slugify(in_path.stem)
    folder = get_or_make_folder(output_dir, work_title)

    if is_video and args.fps is not None and probe.get("fps"):
        if abs(probe["fps"] - args.fps) > 0.5:
            upload_path = _transcode_fps(in_path, args.fps, folder)

    src_dims = f'{probe.get("width","?")}x{probe.get("height","?")}'
    out_h = int(round(probe["height"] * factor)) if probe.get("height") else None
    out_w = int(round(probe["width"] * factor)) if probe.get("width") else None

    sys.stderr.write(
        f"[media-gen] Upscaling {src_dims} by {factor}x"
        + (f" -> ~{out_w}x{out_h}" if out_w else "")
        + f" via {endpoint}...\n"
    )
    sys.stderr.flush()

    src_url = fal_client.upload_file(str(upload_path))
    call_args = {"upscale_factor": factor}
    if is_video:
        call_args["video_url"] = src_url
    else:
        call_args["image_url"] = src_url

    result = fal_client.subscribe(endpoint, arguments=call_args, with_logs=False)
    url = resolve_output_urls(result)[0]

    out_ext = "mp4" if is_video else "png"
    idx = next_index(folder, "upscaled", out_ext)
    filename = f"upscaled-{idx:02d}.{out_ext}"
    out_path = folder / filename
    download(url, out_path)

    if upload_path != in_path:
        try:
            upload_path.unlink()
        except Exception:
            pass

    write_prompt_md(folder, {
        "kind": "upscale",
        "endpoint": endpoint,
        "filename": filename,
        "prompt": f"Upscale of {in_path.name} (source {src_dims}, factor {factor}x)",
        "working_title": work_title,
        "args": {k: v for k, v in call_args.items() if k not in ("video_url", "image_url")},
    })

    print(json.dumps({
        "upscaled_path": str(out_path),
        "folder": str(folder),
        "endpoint": endpoint,
        "factor": factor,
        "source_dims": src_dims,
        "fal_url": url,
    }))


# ── CLI parser ──────────────────────────────────────────────────────────

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="media-gen")
    sub = p.add_subparsers(dest="cmd", required=True)

    # Image
    pi = sub.add_parser("image", help="Generate an image from a prompt")
    pi.add_argument("--endpoint", required=True, help="Fal.ai endpoint ID")
    pi.add_argument("--prompt", required=True)
    pi.add_argument("--title", required=True, help="Working title slug")
    pi.add_argument("--aspect-ratio", dest="aspect_ratio", default=None)
    pi.add_argument("--size", default=None, help="e.g. '1024x1024'")
    pi.add_argument("--num-images", dest="num_images", type=int, default=1)
    pi.add_argument("--negative-prompt", dest="negative_prompt", default=None)
    pi.add_argument("--strength", type=float, default=None,
                    help="Image-to-image strength when supported by the endpoint")
    pi.add_argument("--input-image", dest="input_image", action="append", default=None)
    pi.set_defaults(func=cmd_image)

    # Video
    pv = sub.add_parser("video", help="Animate an image into video")
    pv.add_argument("--endpoint", required=True, help="Fal.ai endpoint ID")
    pv.add_argument("--image", required=True, help="Path to source image")
    pv.add_argument("--prompt", required=True, help="Motion prompt")
    pv.add_argument("--title", required=True)
    pv.add_argument("--folder", default=None, help="Existing generation folder")
    pv.add_argument("--duration", type=int, default=None)
    pv.set_defaults(func=cmd_video)

    # Upscale
    pu = sub.add_parser("upscale", help="Upscale video/image (aspect-preserving)")
    pu.add_argument("--endpoint", required=True, help="Fal.ai endpoint ID")
    pu.add_argument("--input", required=True, help="Path to source file")
    pu.add_argument("--target-height", dest="target_height", type=int, default=1080)
    pu.add_argument("--factor", type=float, default=None)
    pu.add_argument("--fps", type=int, default=None)
    pu.add_argument("--type", choices=["video", "image"], default=None)
    pu.add_argument("--title", default=None)
    pu.set_defaults(func=cmd_upscale)

    return p


if __name__ == "__main__":
    args = build_parser().parse_args()
    args.func(args)