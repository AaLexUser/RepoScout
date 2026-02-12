import { Command } from 'commander';
import { listRepos } from '../core/store.ts';

export const listCommand = new Command('list')
	.description('List all configured repositories')
	.action(async () => {
		const repos = await listRepos();
		if (repos.length === 0) {
			console.log('No repositories configured.');
			return;
		}
		console.log('Configured repositories:\n');
		for (const { entry, scope } of repos) {
			if (entry.type === 'git') {
				console.log(`- ${entry.name} (git, ${scope})`);
				console.log(`    URL: ${entry.url}`);
				console.log(`    Branch: ${entry.branch}`);
			} else {
				console.log(`- ${entry.name} (local, ${scope})`);
				console.log(`    Path: ${entry.path}`);
			}
		}
	});
