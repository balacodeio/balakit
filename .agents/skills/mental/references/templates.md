# `.mental/` file templates

Copy-paste skeletons for every concept type. Substitute `<...>` placeholders.
Frontmatter: `type` is required (OKF); everything else strongly recommended.
`timestamp` = last updated, ISO-8601. Links are standard markdown, rooted at the
bundle (`/decisions/...`), because **path = identity**.

## Bundle skeleton (bootstrap, default level)

```
.mental/
├── index.md
├── status/current.md
├── decisions/
├── journal/
├── notes/
├── areas/
├── plans/
├── docs/internal/
├── docs/external/
└── temp/
```

Create `index.md` and `status/current.md` from the templates below; leave the
other directories empty — concepts are added as work happens.

## `index.md` (bundle entry point)

```markdown
---
type: Status
title: <Project> — .mental index
description: Entry point and navigation for this repo's .mental bundle.
tags: [index]
timestamp: <ISO-8601>
status: active
---

# <Project> — mental index

Private second-brain for <repo>. Start at [current status](/status/current.md).

- [Status](/status/current.md) — where things stand (derived snapshot)
- [Journal](/journal/) — day-by-day log; latest entry ends with the Resume line
- [Decisions](/decisions/) — what was decided/deferred, and why
- [Notes](/notes/) — durable repo knowledge
- [Areas](/areas/) — domain digests
- [Plans](/plans/) — authored plans
- [Docs](/docs/) — internal (authored) / external (ingested)
```

## `status/current.md` (derived snapshot — a cache, never hand-groomed)

```markdown
---
type: Status
title: Current status
description: Derived "you are here" snapshot — regenerate, don't hand-edit.
tags: [status]
timestamp: <ISO-8601>
status: active
---

# Status — <project>
_Derived <date> from journal tail + git + open decisions. Stale? Re-derive._

## Now
<current focus, one or two sentences>

## In flight
<branches / PRs / uncommitted work observed in git>

## Open decisions
- [<title>](/decisions/<file>.md) — open
- [<title>](/decisions/<file>.md) — deferred: <why>

## ▶ Resume point
<copied from the latest journal entry's Resume line>
```

## `journal/<YYYY-MM-DD>.md`

```markdown
---
type: Journal
title: Journal — <YYYY-MM-DD>
description: Work log for <YYYY-MM-DD>.
tags: [journal]
timestamp: <ISO-8601>
status: active
---

# <YYYY-MM-DD>

## <HH:MM> — <topic>
<what happened, what was accomplished, decisions made, user's stated intent /
headspace when voiced — human-legible narrative for future-them>

Resume: <next action> — open loops: <thread>, <thread>
```

Multiple sessions the same day append additional `## <HH:MM> — <topic>` sections.
**The last line of every session section is the `Resume:` line.**

## `decisions/<YYYY-MM-DD>-<slug>.md`

```markdown
---
type: Decision
title: <Decision title>
description: <one-line summary>
tags: [<topic>]
timestamp: <ISO-8601>
status: open        # open → deferred → decided → superseded
resource: <optional link to PR/code/discussion>
---

# <Decision title>

## Context
<why this decision surfaced>

## Options
- <option A> — <tradeoff>
- <option B> — <tradeoff>

## Outcome
<empty while open/deferred. When decided: what was chosen + WHY + when.
If deferred: what it's waiting on.>
```

## `notes/<slug>.md`

```markdown
---
type: Note
title: <Fact title>
description: <one-line summary>
tags: [<topic>]
timestamp: <ISO-8601>
status: active
resource: <optional link to the code this describes>
---

# <Fact title>

<the durable, non-obvious, repo-specific fact — how this repo ACTUALLY behaves.
Link related concepts: [related note](/notes/<slug>.md)>
```

## `areas/<domain>.md`

```markdown
---
type: Area
title: <Domain> — digest
description: Map-of-content digest for <domain>.
tags: [<domain>]
timestamp: <ISO-8601>
status: active
---

# <Domain>

## Current state
<narrative digest>

## Key decisions
- [<title>](/decisions/<file>.md)

## Canonical notes
- [<title>](/notes/<slug>.md)
```

## `plans/<slug>.md`

```markdown
---
type: Plan
title: <Plan title>
description: <one-line summary>
tags: [<topic>]
timestamp: <ISO-8601>
status: draft       # draft → active → superseded
---

# <Plan title>

<the plan, in whatever shape the user thinks in>
```

## `docs/{internal,external}/<slug>.md` (Document concept wrapping an asset)

```markdown
---
type: Document
title: <Document title>
description: <one-line summary of what it is and why it matters>
tags: [<topic>]
timestamp: <ISO-8601>
status: active
resource: <source URL (external) or relative path to the asset file (internal)>
---

# <Document title>

<short summary of the document's content + what the user should take from it.
The raw asset (PDF/HTML/etc.) sits alongside this concept file.>
```
