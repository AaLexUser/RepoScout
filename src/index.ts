#!/usr/bin/env bun
import { Command } from 'commander';
import { addCommand } from './commands/add';
import { askCommand } from './commands/ask';
import { configCommand } from './commands/config';
import { deleteCommand } from './commands/delete';
import { listCommand } from './commands/list';

const VERSION = '0.0.1';

const program = new Command()
	.name('reps')
	.description('A tool for asking questions about repositories')
	.version(VERSION, '-v, --version', 'Show the version number')
	.enablePositionalOptions();

program.addCommand(addCommand);
program.addCommand(askCommand);
program.addCommand(configCommand);
program.addCommand(deleteCommand);
program.addCommand(listCommand);
program.parse(process.argv);
