# NotebookLM MCP Tools Reference

Depth reference for `nlm-skill`. Pulled when the user prefers the MCP server
over the CLI, or when both are available and the user picked MCP. The CLI
equivalents are noted inline.

The MCP server `user-notebooklm-mcp` exposes these tools. All delete/generation
tools require `confirm=True`.

## Authentication

- `mcp__notebooklm-mcp__refresh_auth()` — reload tokens after running `nlm login` on the CLI.
- `mcp__notebooklm-mcp__save_auth_tokens(cookies="<cookie_header>")` — manual fallback: extract cookies from Chrome DevTools and save.

## Server info

- `mcp__notebooklm-mcp__server_info()` — returns `version`, `latest_version`, `update_available`, `update_command`.

## Notebook management

Use `notebook_list`, `notebook_create`, `notebook_get`, `notebook_describe`,
`notebook_query`, `notebook_rename`, `notebook_delete`. All accept
`notebook_id`. Delete requires `confirm=True`.

CLI equivalent: `nlm notebook list|create|get|describe|query|rename|delete`.

## Source management

Use `source_add` with these `source_type` values:
- `url` — web page or YouTube URL (`url` param)
- `text` — pasted content (`text` + `title` params)
- `file` — local file upload (`file_path` param). Supported extensions: PDF,
  TXT, MD, DOCX, CSV, EPUB, MP3, M4A, WAV, AAC, OGG, OPUS, MP4, JPG, JPEG, PNG,
  GIF, WEBP. Image-bearing sources feed Studio video generation's visual-crop
  pipeline — charts, photos, diagrams may be extracted as on-screen aids.
- `drive` — Google Drive doc (`document_id` + `doc_type` params)

Other tools: `source_list_drive`, `source_describe`, `source_get_content`,
`source_rename`, `source_sync_drive` (requires `confirm=True`), `source_delete`
(requires `confirm=True`).

CLI equivalent: `nlm source add|list|get|describe|content|sync|delete`.

## Research

Use `research_start` with:
- `source`: `web` or `drive`
- `mode`: `fast` (~30s) or `deep` (~5min, web only)

Workflow: `research_start` → poll `research_status` → `research_import`.

CLI equivalent: `nlm research start|status|import`.

## Content generation (Studio) — unified creation

Use `studio_create` with `artifact_type` and type-specific options. All
require `confirm=True`.

| artifact_type | Key Options |
|---|---|
| `audio` | `audio_format`: deep_dive/brief/critique/debate, `audio_length`: short/default/long |
| `video` | `video_format`: explainer/brief, `visual_style`: auto_select/classic/whiteboard/kawaii/anime/watercolor/retro_print/heritage/paper_craft |
| `report` | `report_format`: Briefing Doc/Study Guide/Blog Post/Create Your Own, `custom_prompt` |
| `quiz` | `question_count`, `difficulty`: easy/medium/hard |
| `flashcards` | `difficulty`: easy/medium/hard |
| `mind_map` | `title` |
| `slide_deck` | `slide_format`: detailed_deck/presenter_slides, `slide_length`: short/default |
| `infographic` | `orientation`: landscape/portrait/square, `detail_level`: concise/standard/detailed, `infographic_style`: auto_select/sketch_note/professional/bento_grid/editorial/instructional/bricks/clay/anime/kawaii/scientific |
| `data_table` | `description` (REQUIRED) |

Common options: `source_ids`, `language` (BCP-47 code), `focus_prompt`.

CLI equivalent: `nlm audio|video|report|quiz|flashcards|mindmap|slides|infographic|data-table create`.

## Studio (artifact management)

- `studio_status` — check progress (or use `action="rename"` with `artifact_id` + `new_title`).
- `download_artifact` with `artifact_type` and `output_path`.
- `export_artifact` with `export_type`: docs/sheets.
- `studio_delete` (requires `confirm=True`).

CLI equivalent: `nlm studio status|delete|rename`, `nlm download`, `nlm export`.

## Slide revision

Use `studio_revise` to revise individual slides in an existing slide deck.
- Requires `artifact_id` (from `studio_status`) and `slide_instructions`.
- Creates a NEW artifact — the original is not modified.
- Slide numbers are 1-based (slide 1 = first slide).
- Poll `studio_status` after calling to check when the new deck is ready.

CLI equivalent: `nlm slides revise`.

## Chat configuration + notes

- `chat_configure` with `goal`: default/learning_guide/custom.
- `note` with `action`: create/list/update/delete. Delete requires `confirm=True`.

CLI equivalent: `nlm chat configure`, `nlm note create|list|update|delete`.

⚠️ AI tools must NOT use `nlm chat start` (REPL for humans only). Use
`notebook_query` (MCP) or `nlm notebook query` (CLI) for one-shot Q&A.

## Sharing

- `notebook_share_status` — check.
- `notebook_share_public` — enable/disable public link.
- `notebook_share_invite` with `email` and `role`: viewer/editor.

CLI equivalent: `nlm share status|public|invite`.

## Batch operations

Use `batch` with `action` parameter. Select notebooks by `notebook_names`,
`tags`, or `all=True`.

```
batch(action="query", query="...", notebook_names="A, B")
batch(action="add_source", source_url="https://...", tags="ai,research")
batch(action="create", titles="Project A, Project B, Project C")
batch(action="delete", notebook_names="Old Project", confirm=True)
batch(action="studio", artifact_type="audio", tags="research", confirm=True)
```

CLI equivalent: `nlm batch query|add-source|create|delete|studio`.

## Cross-notebook query

Query multiple notebooks and get aggregated answers with per-notebook citations.

```
cross_notebook_query(query="...", notebook_names="A, B")
cross_notebook_query(query="...", tags="ai,research")
cross_notebook_query(query="...", all=True)
```

CLI equivalent: `nlm cross query`.

## Pipelines

Define and execute multi-step notebook workflows.

```
pipeline(action="list")
pipeline(action="run", notebook_id="...", pipeline_name="ingest-and-podcast", input_url="https://...")
```

Built-in pipelines: `ingest-and-podcast`, `research-and-report`, `multi-format`.

CLI equivalent: `nlm pipeline list|run`. Custom pipelines: YAML files in
`~/.notebooklm-mcp-cli/pipelines/`.

## Tags & Smart Select

```
tag(action="add", notebook_id="...", tags="ai,research,llm")
tag(action="remove", notebook_id="...", tags="ai")
tag(action="list")
tag(action="select", query="ai research")
```

CLI equivalent: `nlm tag add|remove|list|select`.
