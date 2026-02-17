import { describe, expect, test } from 'bun:test';
import { lstat, mkdir, mkdtemp, readlink, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { DirEntry, GitEntry } from './types.ts';
import { ensureMaterialized } from './clone.ts';

function localEntry(name: string, sourcePath: string): DirEntry {
	return {
		type: 'local',
		name,
		path: sourcePath
	};
}

function gitEntry(name: string, url: string, branch: string): GitEntry {
	return {
		type: 'git',
		name,
		url,
		branch
	};
}

describe('ensureMaterialized', () => {
	test('creates a symlink in repos dir for local repositories', async (): Promise<void> => {
		const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'reps-clone-test-'));
		try {
			const sourcePath = path.join(tempRoot, 'source-repo');
			const reposDir = path.join(tempRoot, '.reps', 'repos');
			await mkdir(sourcePath, { recursive: true });

			const entry = localEntry('my-local-repo', sourcePath);
			const dest = await ensureMaterialized(entry, reposDir);

			expect(dest).toBe(path.join(reposDir, 'my-local-repo'));

			const stats = await lstat(dest);
			expect(stats.isSymbolicLink()).toBe(true);

			const target = await readlink(dest);
			const resolvedTarget = path.resolve(path.dirname(dest), target);
			expect(resolvedTarget).toBe(sourcePath);
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});

	test('keeps existing symlink when it already points to the same local path', async (): Promise<void> => {
		const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'reps-clone-test-'));
		try {
			const sourcePath = path.join(tempRoot, 'source-repo');
			const reposDir = path.join(tempRoot, '.reps', 'repos');
			await mkdir(sourcePath, { recursive: true });

			const entry = localEntry('my-local-repo', sourcePath);
			const firstDest = await ensureMaterialized(entry, reposDir);
			const secondDest = await ensureMaterialized(entry, reposDir);

			expect(secondDest).toBe(firstDest);

			const stats = await lstat(secondDest);
			expect(stats.isSymbolicLink()).toBe(true);
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});

	test('throws when destination already exists as a directory', async (): Promise<void> => {
		const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'reps-clone-test-'));
		try {
			const sourcePath = path.join(tempRoot, 'source-repo');
			const reposDir = path.join(tempRoot, '.reps', 'repos');
			const destPath = path.join(reposDir, 'my-local-repo');
			await mkdir(sourcePath, { recursive: true });
			await mkdir(destPath, { recursive: true });

			const entry = localEntry('my-local-repo', sourcePath);

			await expect(ensureMaterialized(entry, reposDir)).rejects.toThrow(
				`Repository destination already exists at ${destPath}`
			);
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});

	test('clones git repositories into repos dir', async (): Promise<void> => {
		const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'reps-clone-test-'));
		try {
			const sourcePath = path.join(tempRoot, 'source-git-repo');
			const reposDir = path.join(tempRoot, '.reps', 'repos');
			await mkdir(sourcePath, { recursive: true });

			await Bun.$`git init -b main ${sourcePath}`;
			await Bun.write(path.join(sourcePath, 'README.md'), 'hello\n');
			await Bun.$`git -C ${sourcePath} add README.md`;
			await Bun.$`git -C ${sourcePath} -c user.name=test -c user.email=test@example.com commit -m init`;

			const entry = gitEntry('my-git-repo', sourcePath, 'main');
			const dest = await ensureMaterialized(entry, reposDir);
			const clonedReadme = Bun.file(path.join(dest, 'README.md'));

			expect(await clonedReadme.exists()).toBe(true);
			expect(await clonedReadme.text()).toBe('hello\n');
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});

	test('re-clones when destination exists but is not a git repository', async (): Promise<void> => {
		const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'reps-clone-test-'));
		try {
			const sourcePath = path.join(tempRoot, 'source-git-repo');
			const reposDir = path.join(tempRoot, '.reps', 'repos');
			const destPath = path.join(reposDir, 'my-git-repo');
			await mkdir(sourcePath, { recursive: true });
			await mkdir(destPath, { recursive: true });
			await Bun.write(path.join(destPath, 'STALE.txt'), 'stale\n');

			await Bun.$`git init -b main ${sourcePath}`;
			await Bun.write(path.join(sourcePath, 'README.md'), 'hello\n');
			await Bun.$`git -C ${sourcePath} add README.md`;
			await Bun.$`git -C ${sourcePath} -c user.name=test -c user.email=test@example.com commit -m init`;

			const entry = gitEntry('my-git-repo', sourcePath, 'main');
			const dest = await ensureMaterialized(entry, reposDir);

			expect(dest).toBe(destPath);
			expect(await Bun.file(path.join(dest, 'README.md')).text()).toBe('hello\n');
			expect(await Bun.file(path.join(dest, 'STALE.txt')).exists()).toBe(false);
		} finally {
			await rm(tempRoot, { recursive: true, force: true });
		}
	});
});
