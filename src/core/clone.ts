import path from 'node:path';
import { lstat, readlink, stat, symlink } from 'node:fs/promises';
import { repoKey, type DirEntry, type GitEntry, type RepoEntry } from './types.ts';

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

async function ensureLocalLinked(entry: DirEntry, reposDir: string): Promise<string> {
	const dest = path.join(reposDir, repoKey(entry.name));
	const sourcePath = path.resolve(entry.path);

	await Bun.$`mkdir -p ${reposDir}`;

	try {
		const destinationStats = await lstat(dest);

		if (!destinationStats.isSymbolicLink()) {
			throw new Error(`Repository destination already exists at ${dest}`);
		}

		const symlinkTarget = await readlink(dest);
		const resolvedTarget = path.resolve(path.dirname(dest), symlinkTarget);
		if (resolvedTarget === sourcePath) {
			return dest;
		}

		throw new Error(
			`Repository destination already exists at ${dest} and points to ${resolvedTarget}`
		);
	} catch (err) {
		const isMissing = err instanceof Error && 'code' in err && err.code === 'ENOENT';
		if (!isMissing) {
			throw err;
		}
	}

	await symlink(sourcePath, dest, 'dir');
	return dest;
}

export async function ensureMaterialized(entry: RepoEntry, reposDir: string): Promise<string> {
	if (entry.type === 'local') {
		return ensureLocalLinked(entry, reposDir);
	}
	return ensureCloned(entry, reposDir);
}
