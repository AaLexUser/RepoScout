import os from 'node:os';
import path from 'node:path';
import { stat } from 'node:fs/promises';
import { ensureMaterialized } from './clone.ts';
import {
	RepsConfigSchema,
	RepoEntrySchema,
	repoKey,
	type RepoEntry,
	type RepsConfig
} from './types.ts';

export function globalRepsDir(): string {
	return path.join(os.homedir(), '.reps');
}

export function projectRepsDir(): string {
	return path.join(process.cwd(), '.reps');
}

function configPath(repsDir: string): string {
	return path.join(repsDir, 'reps.json');
}

export async function loadConfig(repsDir: string): Promise<RepsConfig> {
	const file = Bun.file(configPath(repsDir));
	if (!(await file.exists())) {
		return { repos: [] };
	}
	const raw = await file.json();
	return RepsConfigSchema.parse(raw);
}

export async function saveConfig(repsDir: string, config: RepsConfig): Promise<void> {
	await Bun.$`mkdir -p ${repsDir}`;
	await Bun.write(configPath(repsDir), JSON.stringify(config, null, 2) + '\n');
}

type GitAddInput = {
	type: 'git';
	name: string;
	url: string;
	branch: string;
	global?: boolean;
};
type DirAddInput = {
	type: 'local';
	name: string;
	path: string;
	global?: boolean;
};
type AddRepoInput = GitAddInput | DirAddInput;

export type ScopedRepo = {
	entry: RepoEntry;
	scope: 'project' | 'global';
};

async function assertRepoNameAvailable(name: string): Promise<void> {
	const allRepos = await listRepos();
	if (allRepos.some((r) => r.entry.name === name)) {
		throw new Error(`Repo "${name}" already exists. Remove it first or choose a different name.`);
	}
}

export async function addRepo(input: AddRepoInput): Promise<RepoEntry> {
	const isGlobal = input.global ?? false;
	const repsDir = isGlobal ? globalRepsDir() : projectRepsDir();

	let entry: RepoEntry;
	if (input.type === 'git') {
		entry = {
			type: 'git',
			name: input.name,
			url: input.url,
			branch: input.branch
		};
	} else {
		entry = { type: 'local', name: input.name, path: input.path };
	}

	RepoEntrySchema.parse(entry);
	await assertRepoNameAvailable(entry.name);

	if (entry.type === 'local') {
		const exists = await stat(entry.path)
			.then((s) => s.isDirectory())
			.catch(() => false);
		if (!exists) {
			throw new Error(`Directory does not exist: ${entry.path}`);
		}
	}

	const reposDir = path.join(repsDir, 'repos');
	const materializedPath = await ensureMaterialized(entry, reposDir);
	try {
		await assertRepoNameAvailable(entry.name);
	} catch (err) {
		await Bun.$`rm -rf ${materializedPath}`;
		throw err;
	}

	const config = await loadConfig(repsDir);
	config.repos.push(entry);
	await saveConfig(repsDir, config);

	return entry;
}

export async function deleteRepo(name: string, opts: { global?: boolean }): Promise<void> {
	const repsDir = opts.global ? globalRepsDir() : projectRepsDir();
	const config = await loadConfig(repsDir);

	const index = config.repos.findIndex((r) => r.name === name);
	if (index === -1) {
		const scope = opts.global ? 'global' : 'project';
		throw new Error(`Repo "${name}" not found in ${scope} config.`);
	}

	config.repos.splice(index, 1);
	await saveConfig(repsDir, config);

	// Clean up materialized repository path (directory or symlink).
	const cloneDir = path.join(repsDir, 'repos', repoKey(name));
	await Bun.$`rm -rf ${cloneDir}`;
}

export async function listRepos(): Promise<ScopedRepo[]> {
	const globalConfig = await loadConfig(globalRepsDir());
	const projectConfig = await loadConfig(projectRepsDir());

	const byName = new Map<string, ScopedRepo>();
	for (const entry of globalConfig.repos) {
		byName.set(entry.name, { entry, scope: 'global' });
	}
	for (const entry of projectConfig.repos) {
		byName.set(entry.name, { entry, scope: 'project' });
	}
	return Array.from(byName.values());
}
