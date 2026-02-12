import { Command } from 'commander';
import { loadConfig, saveConfig, globalRepsDir, projectRepsDir } from '../core/store.ts';

const modelCommand = new Command('model')
	.description('Get or set the default model (format: provider/model)')
	.argument('[value]', 'Model to set (e.g. openai/gpt-5.2-codex)')
	.option('-g, --global', 'Use global config instead of project config')
	.action(async (value?: string, options?: { global?: boolean }) => {
		const isGlobal = options?.global ?? false;

		if (value) {
			const [providerID, modelID] = value.split('/', 2);
			if (!providerID || !modelID) {
				console.error(
					'Error: Model must be in "provider/model" format (e.g. "openai/gpt-5.2-codex").'
				);
				process.exit(1);
			}

			const repsDir = isGlobal ? globalRepsDir() : projectRepsDir();
			const config = await loadConfig(repsDir);
			config.model = value;
			await saveConfig(repsDir, config);
			const scope = isGlobal ? 'global' : 'project';
			console.log(`Model set to "${value}" (${scope})`);
			return;
		}

		// No value: print current model
		const projectConfig = await loadConfig(projectRepsDir());
		if (projectConfig.model) {
			console.log(`${projectConfig.model} (project)`);
			return;
		}

		const globalConfig = await loadConfig(globalRepsDir());
		if (globalConfig.model) {
			console.log(`${globalConfig.model} (global)`);
			return;
		}

		console.log('No model configured. Use: reps config model <provider/model>');
	});

export const configCommand = new Command('config')
	.description('Manage configuration')
	.addCommand(modelCommand);
