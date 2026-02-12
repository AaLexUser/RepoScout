# AGENTS.md — RepoScout

## Project Overview

RepoScout (`reps`) is a Bun/TypeScript CLI tool for managing repository references
and querying codebases via an AI agent. It uses Commander for CLI, Zod for validation,
and the OpenCode SDK for AI interactions.

## Build & Run Commands

| Task                    | Command                                  |
| ----------------------- | ---------------------------------------- |
| Install dependencies    | `bun install`                            |
| Run the CLI             | `bun run reps` or `bun run src/index.ts` |
| Type-check              | `bunx tsc --noEmit`                      |
| Format (write)          | `bun run format`                         |
| Format (check only)     | `bun run check`                          |
| Run all tests           | `bun test`                               |
| Run a single test       | `bun test path/to/file.test.ts`          |
| Run tests matching name | `bun test --test-name-pattern "pattern"` |

There is no build/compile step — Bun runs TypeScript directly (`noEmit: true`).

## Runtime & Tooling

- **Runtime:** Bun (not Node.js). Use `bun` for everything: running, testing, installing.
- **Package manager:** `bun install` (not npm/yarn/pnpm).
- **No bundler needed.** Bun handles TypeScript natively.
- **Bun APIs preferred:** `Bun.file()` / `Bun.write()` for file I/O, `Bun.$\`...\``for shell commands. Do not use`fs.readFile`/`fs.writeFile`or`child_process`.
- **Env loading:** Bun auto-loads `.env` — do not use `dotenv`.

## Project Structure

```
src/
  index.ts            # CLI entry point (Commander program)
  core/
    types.ts           # Zod schemas + inferred TypeScript types
    store.ts           # Config persistence (load/save/CRUD)
    clone.ts           # Git clone operations
    workspace.ts       # Temp workspace management
  commands/
    add.ts             # reps add
    ask.ts             # reps ask (AI agent)
    config.ts          # reps config model
    delete.ts          # reps delete
    list.ts            # reps list
```

- **`core/`** — Domain logic, no CLI/UI concerns.
- **`commands/`** — Thin CLI handlers that call into core and handle user I/O.
- No barrel exports / no `index.ts` re-exports. Import directly from specific files.
- One concept per file. Each command file exports exactly one `Command` instance.

## Code Style

### Formatting (Prettier)

- **Indentation:** Tabs
- **Quotes:** Single quotes
- **Trailing commas:** None
- **Semicolons:** Yes
- **Print width:** 100 characters
- Run `bun run format` before committing.

### Imports

- **Named imports only.** No default exports anywhere in the project.
- **Default imports** only for Node builtins: `import os from 'node:os'`.
- **`node:` prefix** always required for Node builtins.
- **`.ts` extensions** on all local/relative imports: `import { foo } from './bar.ts'`.
- **No path aliases.** Use relative paths (`./`, `../`).
- **Import order:** third-party packages, then Node builtins, then local modules.
- **Inline `type` keyword** for type-only imports within mixed imports:
  `import { loadConfig, type RepsConfig } from './store.ts'`.
- Use `import type { ... }` when the entire import is types-only.

### Naming Conventions

| Kind                 | Convention                     | Example                              |
| -------------------- | ------------------------------ | ------------------------------------ |
| Variables, functions | `camelCase`                    | `loadConfig`, `repoKey`              |
| Types, interfaces    | `PascalCase`                   | `RepoEntry`, `RepsConfig`            |
| Zod schemas          | `PascalCase` + `Schema` suffix | `GitEntrySchema`, `RepsConfigSchema` |
| True constants       | `UPPER_SNAKE_CASE`             | `VERSION`                            |
| Exported commands    | `camelCase` + `Command` suffix | `addCommand`, `askCommand`           |
| Files                | lowercase / kebab-case         | `store.ts`, `workspace.ts`           |
| Directories          | lowercase                      | `core/`, `commands/`                 |

### Functions

- Use `function` declarations for all named functions (not arrow functions).
- Arrow functions only for inline callbacks (`.then()`, `.map()`, `.action()`, etc.).
- **Always specify explicit return types** on every function.
- Use `async/await` throughout — no raw Promise chains for control flow.

### Types

- Prefer `type` over `interface` (exception: when extending is needed).
- Define data models as **Zod schemas first**, then infer types: `type Foo = z.infer<typeof FooSchema>`.
- Use inline object types for small, function-scoped shapes: `opts: { global?: boolean }`.
- Never use `any`. The project has `strict: true` and `noUncheckedIndexedAccess: true`.

### Error Handling

- Plain `try/catch` — no Result monads or custom error classes.
- Throw standard `Error`: `throw new Error('descriptive message')`.
- In command handlers, catch and exit:
  ```ts
  } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Error: ${message}`);
      process.exit(1);
  }
  ```
- Use `.catch(() => false)` for existence checks (e.g., `stat(path).then(...).catch(() => false)`).
- Use empty `catch {}` blocks (no variable) for expected failures like URL parsing.
- Use `try/finally` for cleanup (e.g., stopping servers).

### Comments

- Minimal comments. Prefer self-documenting code through descriptive naming.
- No JSDoc. Brief inline comments only when the "why" isn't obvious from the code.

### Command File Pattern

Every command file follows this structure:

```ts
import { Command } from 'commander';
import { coreFunction } from '../core/module.ts';

export const fooCommand = new Command('foo')
	.description('Does a thing')
	.argument('<name>', 'The name')
	.option('-g, --global', 'Use global scope')
	.action(async (name: string, options: { global?: boolean }) => {
		try {
			await coreFunction(name, { global: options.global });
			console.log(`Done: ${name}`);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			console.error(`Error: ${message}`);
			process.exit(1);
		}
	});
```

## Testing Conventions

- Test framework: Bun's built-in test runner (`bun test`).
- Test files: colocate as `*.test.ts` next to source files.
- Import from `bun:test`:
  ```ts
  import { test, expect, describe } from 'bun:test';
  ```

## Key Dependencies

| Package            | Purpose                            |
| ------------------ | ---------------------------------- |
| `commander`        | CLI framework                      |
| `zod` (v4)         | Schema validation + type inference |
| `@opencode-ai/sdk` | AI agent (OpenCode server/client)  |

## Design Philosophy

- **Simplicity-first** (Karpathy guidelines): no over-engineering.
- **Schema-first data modeling:** Zod schemas are the source of truth.
- **Lazy cloning:** `add` only writes config; `ask` triggers `ensureCloned()`.
- **Dual scope:** project-level (`.reps/`) vs global (`~/.reps/`).
- **Bun-native:** use Bun APIs over Node.js equivalents wherever possible.
