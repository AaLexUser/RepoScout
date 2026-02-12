import path from 'node:path';
import { stat } from 'node:fs/promises';
import type { GitEntry } from './types.ts';
import { repoKey } from './types.ts';

async function cloneRepo(entry: GitEntry, reposDir: string): Promise<string> {
	const dest = path.join(reposDir, repoKey(entry.name));
	await Bun.$`mkdir -p ${reposDir}`;
	await Bun.$`git clone --depth 1 -b ${entry.branch} ${entry.url} ${dest}`;
	return dest;
}

export async function ensureCloned(entry: GitEntry, reposDir: string): Promise<string> {
	const dest = path.join(reposDir, repoKey(entry.name));
	const exists = await stat(dest)
		.then((s) => s.isDirectory())
		.catch(() => false);
	if (exists) {
		return dest;
	}
	return cloneRepo(entry, reposDir);
}
