# RepoScout

> A lightweight CLI tool for managing repository references and asking AI-powered questions about codebases.

RepoScout (`reps`) helps you maintain a curated collection of repositories (local or remote) and query them using AI agents. Perfect for exploring documentation, understanding codebases, and extracting insights from multiple projects.

## Prerequisites

- [Bun](https://bun.sh) runtime (v1.3.6+)
- [OpenCode](https://opencode.ai) installed globally (`bun add -g opencode-ai`)

## Installation

```bash
bun install -g https://github.com/AaLexUser/RepoScout
```

After installation the `reps` command is available globally.

## Quick Start

```bash
# Add a GitHub repository
reps add https://github.com/sveltejs/svelte -n svelte

# Add a local directory
reps add ~/Work/my-project -n myproject

# Configure your AI model (optional)
reps config model openai/gpt-5.2-codex

# Ask a question about a repository
reps ask -r svelte -q "How does the reactivity system work?"

# List all repositories
reps list

# Remove a repository
reps delete svelte
```

## Commands

### `reps add [repository]`

Add a repository to your collection.

```bash
# Add git repository with auto-detected name
reps add https://github.com/facebook/react

# Add with custom name and branch
reps add https://github.com/vuejs/core -n vue -b main

# Add local directory
reps add ~/Work/my-library -n mylib

# Add to global scope
reps add https://github.com/nodejs/node -g
```

**Options:**

- `-n, --name [name]` — Custom repository name
- `-b, --branch [branch]` — Git branch (default: `main`)
- `-t, --type [type]` — Force type: `git` or `local`
- `-g, --global` — Add to global config instead of project config

### `reps list`

List all repositories in the current scope (project + global).

```bash
reps list
```

### `reps delete <name>`

Remove a repository from your collection.

```bash
# Delete from project scope
reps delete myrepo

# Delete from global scope
reps delete myrepo -g
```

**Options:**

- `-g, --global` — Delete from global config

### `reps ask`

Ask AI-powered questions about a repository.

```bash
reps ask -r react -q "How do hooks work?"

# Use a specific model
reps ask -r vue -q "Explain the compiler" -m openai/gpt-5.2-codex
```

**Options:**

- `-r, --repository <name>` — Repository to query (required)
- `-q, --question <text>` — Your question (required)
- `-m, --model <model>` — AI model (format: `provider/model`)

### `reps config model [value]`

View or set the AI model configuration.

```bash
# View current model
reps config model

# Set project-level model
reps config model openai/gpt-5.2-codex

# Set global model
reps config model openai/gpt-5.2-codex -g
```

**Options:**

- `-g, --global` — Configure global model

## Configuration

RepoScout uses a JSON configuration file (`reps.json`) stored in:

- **Project scope**: `.reps/reps.json` (current directory)
- **Global scope**: `~/.reps/reps.json` (home directory)

Project-level settings take priority over global settings.

## Storage Layout

```
Project-scoped:                Global:
.reps/                         ~/.reps/
├── reps.json                  ├── reps.json
└── repos/                     └── repos/
    ├── opencode/                  ├── react/
    └── mylib/                     └── node/
```

Repositories are cloned lazily — `reps add` only saves metadata; the actual `git clone` happens on the first `reps ask` invocation.

## Development

```bash
# Install dependencies
bun install

# Run from source
bun run reps

# Format code
bun run format

# Check formatting
bun run check

# Type check
bunx tsc --noEmit

# Run tests
bun test
```
