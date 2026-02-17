import path from 'node:path';
import { lstat, readlink, stat, symlink } from 'node:fs/promises';
import { repoKey, type DirEntry, type GitEntry, type RepoEntry } from './types.ts';

async function hasGitMetadata(dest: string): Promise<boolean> {
	const gitDir = path.join(dest, '.git');
	return stat(gitDir)
		.then((s) => s.isDirectory())
		.catch(() => false);
}

async function cloneRepo(entry: GitEntry, reposDir: string): Promise<string> {
	const dest = path.join(reposDir, repoKey(entry.name));
	await Bun.$`mkdir -p ${reposDir}`;
	try {
		await Bun.$`git clone --depth 1 -b ${entry.branch} ${entry.url} ${dest}`;
	} catch (err) {
		await Bun.$`rm -rf ${dest}`;
		throw err;
	}
	return dest;
}

export async function ensureCloned(entry: GitEntry, reposDir: string): Promise<string> {
	const dest = path.join(reposDir, repoKey(entry.name));
	const isValidClone = await hasGitMetadata(dest);
	if (isValidClone) {
		return dest;
	}

	const exists = await lstat(dest)
		.then(() => true)
		.catch(() => false);
	if (exists) {
		await Bun.$`rm -rf ${dest}`;
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
