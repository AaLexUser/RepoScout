import { Command } from 'commander';
import { createOpencodeClient, createOpencodeServer, type OpencodeClient } from '@opencode-ai/sdk';
import { loadConfig, globalRepsDir, projectRepsDir } from '../core/store.ts';
import { getRepoPath } from '../core/workspace.ts';

function systemPrompt(): string {
	return [
		'You are reps, an expert documentation search agent.',
		'Your job is to answer questions by searching through the collection of resources.',
		'',
		'You have access to the following tools:',
		'- read: Read file contents with line numbers',
		'- grep: Search file contents using regex patterns',
		'- glob: Find files matching glob patterns',
		'- list: List directory contents',
		'',
		'Guidelines:',
		'- Use glob to find relevant files first, then read them',
		'- Use grep to search for specific code patterns or text',
		'- Always cite the source files in your answers',
		'- Be concise but thorough in your responses',
		'- If you cannot find the answer, say so clearly'
	].join('\n');
}

async function resolveModel(
	cliModel?: string
): Promise<{ providerID: string; modelID: string } | undefined> {
	if (cliModel) {
		const [providerID, modelID] = cliModel.split('/', 2);
		if (providerID && modelID) {
			return { providerID, modelID };
		}
		throw new Error(
			`Invalid model format: "${cliModel}". Expected "provider/model" (e.g. "openai/gpt-5.2-codex").`
		);
	}

	const projectConfig = await loadConfig(projectRepsDir());
	if (projectConfig.model) {
		const [providerID, modelID] = projectConfig.model.split('/', 2);
		if (providerID && modelID) return { providerID, modelID };
	}

	const globalConfig = await loadConfig(globalRepsDir());
	if (globalConfig.model) {
		const [providerID, modelID] = globalConfig.model.split('/', 2);
		if (providerID && modelID) return { providerID, modelID };
	}

	return undefined;
}

async function allowedTools(
	client: OpencodeClient,
	allow: Set<string>
): Promise<Record<string, boolean>> {
	const ids = await client.tool.ids();
	if (ids.error) throw new Error('Failed to fetch tool IDs');
	const tools: Record<string, boolean> = {};
	for (const id of ids.data) {
		tools[id] = allow.has(id);
	}
	return tools;
}

async function streamSession(client: OpencodeClient, sessionID: string): Promise<void> {
	const events = await client.event.subscribe();
	for await (const event of events.stream) {
		if (event.type === 'message.part.updated') {
			const part = event.properties.part;
			if (part?.sessionID !== sessionID) continue;

			if (part?.type === 'tool' && part.state?.status === 'completed') {
				console.log(`\n[${part.tool}] ✓\n`);
			}
			if (part?.type === 'text' && part.time?.end) {
				const text = (part.text ?? '').trim();
				if (text) console.log(text);
			}
			if (part?.type === 'reasoning' && part.time?.end) {
				const reasoning = (part.text ?? '').trim();
				if (reasoning) console.log(reasoning);
			}
		}
		if (event.type === 'session.error' && event.properties?.sessionID === sessionID) {
			console.error('Error:', event.properties.error?.name);
		}
		if (
			event.type === 'session.status' &&
			event.properties.sessionID === sessionID &&
			event.properties.status.type === 'idle'
		) {
			return;
		}
	}
}

export const askCommand = new Command('ask')
	.description('Ask a question about repositories')
	.requiredOption('-r, --repository <name>', 'Repository to search')
	.requiredOption('-q, --question <text>', 'Question to ask')
	.option('-m, --model <model>', 'Model to use as provider/model (e.g. openai/gpt-5.2-codex)')
	.action(async (options: { repository: string, question: string, model?: string }) => {
		let targetSessionId: string | null = null;
		const model = await resolveModel(options.model);
		const workDir = await getRepoPath(options.repository);
		const server = await createOpencodeServer({ port: 0 });
		const client = createOpencodeClient({ baseUrl: server.url, directory: workDir });

		try {
			const session = await client.session.create({
				body: { title: 'reps-ask' }
			});
			if (!session.data) {
				console.error('Failed to create OpenCode session');
				process.exit(1);
			}

			targetSessionId = session.data.id;
			const streamPromise = streamSession(client, targetSessionId);

			const tools = await allowedTools(
				client,
				new Set([
					'bash',
					'read',
					'glob',
					'grep',
					'todowrite',
					'todoread',
					'task',
					'codesearch'
				])
			);
			const promptResult = await client.session.prompt({
				path: { id: targetSessionId },
				body: {
					model,
					system: systemPrompt(),
					tools,
					parts: [{ type: 'text', text: options.question }]
				}
			});

			if (promptResult.error) {
				console.error('Prompt error:', promptResult.error);
			}

			await streamPromise;
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			console.error(`Error: ${message}`);
			process.exit(1);
		} finally {
			if (targetSessionId) {
				await client.session.delete({ path: { id: targetSessionId } });
			}
			server.close();
			process.exit(0);
		}
	});
