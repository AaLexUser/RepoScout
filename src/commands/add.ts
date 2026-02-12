import { Command } from 'commander';
import os from 'node:os';
import path from 'node:path';
import { addRepo } from '../core/store.ts';

interface GithubURLParts {
	owner: string;
	repo: string;
}

function normalizeToURL(input: string): URL | null {
	const s = input
		.trim()
		.replace(/^git@([^:]+):/, 'https://$1/') // git@host:path → https://host/path
		.replace(/^(?![\w]+:\/\/)/, 'https://'); // prepend protocol if missing

	try {
		return new URL(s);
	} catch {
		return null;
	}
}

function parseGithubURL(input: string): GithubURLParts | null {
	const url = normalizeToURL(input);
	if (!url) return null;

	const [owner, repo] = url.pathname
		.replace(/^\/api\/v3/, '')
		.replace(/\.git$/, '')
		.split('/')
		.filter(Boolean);

	return owner && repo ? { owner, repo } : null;
}

function isGithubUrl(input: string): boolean {
	const url = normalizeToURL(input);
	return url?.hostname === 'github.com';
}

function normalizeGitUrl(input: string): string {
	if (isGithubUrl(input)) {
		const parts = parseGithubURL(input);
		if (parts) return `https://github.com/${parts.owner}/${parts.repo}`;
	}
	// Non-GitHub URL: ensure it has a protocol
	const url = normalizeToURL(input);
	return url?.href ?? input;
}

function inferRepoName(input: string): string {
	const ghParts = parseGithubURL(input);
	if (ghParts) return ghParts.repo;

	const url = normalizeToURL(input);
	if (url) {
		const segments = url.pathname
			.replace(/\.git$/, '')
			.split('/')
			.filter(Boolean);
		const last = segments.at(-1);
		if (last) return last;
	}
	return path.basename(input);
}

function resolvePath(input: string): string {
	if (input.startsWith('~/')) {
		return path.join(os.homedir(), input.slice(2));
	}
	if (path.isAbsolute(input)) {
		return input;
	}
	return path.resolve(process.cwd(), input);
}

function isUrlLike(input: string): boolean {
	return (
		input.startsWith('http://') ||
		input.startsWith('https://') ||
		input.startsWith('git@') ||
		input.includes('github.com/')
	);
}

export const addCommand = new Command()
	.command('add')
	.description('Add a repository')
	.argument('[repository]', 'GitHub repository URL or local path')
	.option('-n, --name [name]', 'Repository name')
	.option('-g, --global', 'Add to global config instead of project config')
	.option('-b, --branch [branch]', 'Git branch (default: main)')
	.option('-t, --type [type]', 'Repository type: git or local')
	.action(
		async (
			urlOrPath: string,
			options: {
				name?: string;
				branch?: string;
				type?: string;
				global?: boolean;
			}
		) => {
			let repoType: 'git' | 'local';
			if (options.type) {
				if (options.type !== 'git' && options.type !== 'local') {
					console.error('Error: --type must be "git" or "local"');
					process.exit(1);
				}
				repoType = options.type;
			} else {
				repoType = isUrlLike(urlOrPath) ? 'git' : 'local';
			}

			try {
				if (repoType === 'git') {
					const url = normalizeGitUrl(urlOrPath);
					const name = options.name ?? inferRepoName(urlOrPath);
					const repo = await addRepo({
						type: 'git',
						name,
						url,
						branch: options.branch ?? 'main',
						global: options.global
					});
					console.log(`Added git repository: ${repo.name}`);
				} else {
					const resolvedPath = resolvePath(urlOrPath);
					const name = options.name ?? path.basename(resolvedPath);
					const repo = await addRepo({
						type: 'local',
						name,
						path: resolvedPath,
						global: options.global
					});
					console.log(`Added local repository: ${repo.name}`);
				}
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				console.error(`Error: ${message}`);
				process.exit(1);
			}
		}
	);
