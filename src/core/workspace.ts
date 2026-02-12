import os from 'node:os';
import path from 'node:path';
import { mkdtemp, cp } from 'node:fs/promises';
import { ensureCloned } from './clone.ts';
import { listRepos, globalRepsDir, projectRepsDir } from './store.ts';

export async function createWorkspace(repoNames: string[]): Promise<string> {
	const allRepos = await listRepos();
	const workDir = await mkdtemp(path.join(os.tmpdir(), 'reps-'));

	for (const name of repoNames) {
		const found = allRepos.find((r) => r.entry.name === name);
		if (!found) {
			await cleanupWorkspace(workDir);
			throw new Error(`Repo "${name}" not found. Run "reps list" to see available repos.`);
		}

		const { entry, scope } = found;
		let sourcePath: string;

		if (entry.type === 'local') {
			sourcePath = entry.path;
		} else {
			const repsDir = scope === 'global' ? globalRepsDir() : projectRepsDir();
			const reposDir = path.join(repsDir, 'repos');
			sourcePath = await ensureCloned(entry, reposDir);
		}
		await cp(sourcePath, path.join(workDir, name), { recursive: true });
	}

	return workDir;
}

export async function cleanupWorkspace(workDir: string): Promise<void> {
	await Bun.$`rm -rf ${workDir}`;
}

export async function getRepoPath(repoName: string): Promise<string> {
	const allRepos = await listRepos();
	const found = allRepos.find((r) => r.entry.name === repoName);
	if (!found) {
		throw new Error(`Repo "${repoName}" not found. Run "reps list" to see available repos.`);
	}
  const { entry, scope } = found;
  let sourcePath: string;
  if (entry.type === 'local') {
    sourcePath = entry.path;
  } else {
    const repsDir = scope === 'global' ? globalRepsDir() : projectRepsDir();
    const reposDir = path.join(repsDir, 'repos');
    sourcePath = await ensureCloned(entry, reposDir);
  }
	return sourcePath
}
