---
name: reps
description: >
  Use reps (RepoScout) when you need detailed research on a specific library, framework,
  or codebase. reps lets you add repository references (GitHub URLs or local directories)
  and ask AI-powered questions about them. Use this skill whenever the user asks to
  research, explore, or understand an external codebase, or when you need to look up
  how a library or framework works by querying its source code directly.
---

# reps CLI

## Workflow

1. Add the repository (if not already added).
2. (Optional) Check configured repos with `reps list`.
3. Ask a question with `reps ask`.

## Commands

Add a git repository:

```bash
reps add https://github.com/owner/repo -n short-name
```

Add a local directory:

```bash
reps add /absolute/path/to/project -n short-name
```

`-b branch` to specify a branch (default: `main`). `-g` for global scope.

List configured repositories:

```bash
reps list
```

Ask a question about a repository:

```bash
reps ask -r short-name -q "How does the routing system work?"
```

`-m provider/model` to override the AI model.

Delete a repository:

```bash
reps delete short-name
```

`-g` for global scope.

Configure the default AI model:

```bash
reps config model provider/model-name
```

`-g` for global scope.

## Notes

- Repos are cloned lazily on first `reps ask`, not on `reps add`.
- Names must be alphanumeric (plus `.`, `-`, `_`), max 64 chars.
- Project-scoped config (`.reps/`) takes priority over global (`~/.reps/`).
- If `reps` is not found, install with `bun install -g https://github.com/AaLexUser/RepoScout`.
