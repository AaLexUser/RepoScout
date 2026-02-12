# RepoScout

> A lightweight CLI tool for managing repository references and asking AI-powered questions about codebases.

RepoScout (`reps`) helps you maintain a curated collection of repositories (local or remote) and query them using AI agents. Perfect for exploring documentation, understanding codebases, and extracting insights from multiple projects.

## Installation

```bash
bun add -g opencode-ai
bun install
```

## Quick Start

```bash
# Add a GitHub repository
bun run reps add https://github.com/sveltejs/svelte -n svelte

# Add a local directory
bun run reps add ~/Work/my-project -n myproject

# Configure your AI model (optional)
bun run reps config model openai/gpt-5.2-codex

# Ask a question about a repository
bun run reps ask -r svelte -q "How does the reactivity system work?"

# List all repositories
bun run reps list

# Remove a repository
bun run reps delete svelte
```

## Commands

### `reps add [repository]`

Add a repository to your collection.

```bash
# Add git repository with auto-detected name
bun run reps add https://github.com/facebook/react

# Add with custom name and branch
bun run reps add https://github.com/vuejs/core -n vue -b main

# Add local directory
bun run reps add ~/Work/my-library -n mylib

# Add to global scope
bun run reps add https://github.com/nodejs/node -g
```

**Options:**
- `-n, --name [name]` — Custom repository name
- `-b, --branch [branch]` — Git branch (default: `main`)
- `-t, --type [type]` — Force type: `git` or `local`
- `-g, --global` — Add to global config instead of project config

### `reps list`

List all repositories in the current scope (project + global).

```bash
bun run reps list
```

### `reps delete <name>`

Remove a repository from your collection.

```bash
# Delete from project scope
bun run reps delete myrepo

# Delete from global scope
bun run reps delete myrepo -g
```

**Options:**
- `-g, --global` — Delete from global config

### `reps ask`

Ask AI-powered questions about a repository.

```bash
bun run reps ask -r react -q "How do hooks work?"

# Use a specific model
bun run reps ask -r vue -q "Explain the compiler" -m openai/gpt-5.2-codex
```

**Options:**
- `-r, --repository <name>` — Repository to query (required)
- `-q, --question <text>` — Your question (required)
- `-m, --model <model>` — AI model (format: `provider/model`)

### `reps config model [value]`

View or set the AI model configuration.

```bash
# View current model
bun run reps config model

# Set project-level model
bun run reps config model openai/gpt-5.2-codex

# Set global model
bun run reps config model openai/gpt-5.2-codex -g
```

**Options:**
- `-g, --global` — Configure global model

## Configuration

RepoScout uses a JSON configuration file (`reps.json`) stored in:
- **Project scope**: `.reps/reps.json` (current directory)
- **Global scope**: `~/.reps/reps.json` (home directory)

## Storage Layout

```
Project-scoped:                Global:
.reps/                         ~/.reps/
├── reps.json                  ├── reps.json
└── repos/                     └── repos/
    ├── opencode/                  ├── react/
    └── mylib/                     └── node/
```

## Requirements

- [Bun](https://bun.sh) runtime (v1.3.6+)
- TypeScript 5+
- An OpenCode AI compatible endpoint (for the `ask` command)

## Development

```bash
# Format code
bun run format

# Check formatting
bun run check

# Type check
bun run --bun tsc --noEmit
```

