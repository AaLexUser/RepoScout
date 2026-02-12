import { Command } from 'commander';
import { deleteRepo } from '../core/store.ts';

export const deleteCommand = new Command('delete')
	.description('Delete a repository from the configuration')
	.argument('<name>', 'Repository name to delete')
	.option('-g, --global', 'Delete from global config instead of project config')
	.action(async (name: string, options: { global?: boolean }) => {
		try {
			await deleteRepo(name, { global: options.global });
			console.log(`Deleted repository: ${name}`);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			console.error(`Error: ${message}`);
			process.exit(1);
		}
	});
