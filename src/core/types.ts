import { z } from 'zod';

const NAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

const RepoNameSchema = z
	.string()
	.min(1, 'Repo name cannot be empty')
	.max(64, 'Repo name too long (max 64 chars)')
	.regex(NAME_REGEX, 'Name must start with alphanumeric, then alphanumeric/._- only');

const GitUrlSchema = z
	.string()
	.min(1, 'Git URL cannot be empty')
	.refine(
		(url) => {
			try {
				return new URL(url).protocol === 'https:';
			} catch {
				return false;
			}
		},
		{ message: 'Git URL must be a valid HTTPS URL' }
	)
	.refine(
		(url) => {
			try {
				const u = new URL(url);
				return !u.username && !u.password;
			} catch {
				return true;
			}
		},
		{ message: 'Git URL must not contain embedded credentials' }
	);

const BranchSchema = z
	.string()
	.min(1, 'Branch name cannot be empty')
	.max(128, 'Branch name too long (max 128 chars)')
	.regex(/^[a-zA-Z0-9/_.-]+$/, 'Branch contains invalid characters')
	.refine((b) => !b.startsWith('-'), {
		message: "Branch must not start with '-'"
	});

export const GitEntrySchema = z.object({
	type: z.literal('git'),
	name: RepoNameSchema,
	url: GitUrlSchema,
	branch: BranchSchema
});

export const DirEntrySchema = z.object({
	type: z.literal('local'),
	name: RepoNameSchema,
	path: z
		.string()
		.min(1, 'Path cannot be empty')
		.refine((p) => p.startsWith('/'), { message: 'Path must be absolute' })
});

export const RepoEntrySchema = z.discriminatedUnion('type', [GitEntrySchema, DirEntrySchema]);

export const RepsConfigSchema = z.object({
	repos: z.array(RepoEntrySchema),
	model: z.string().optional()
});

export type GitEntry = z.infer<typeof GitEntrySchema>;
export type DirEntry = z.infer<typeof DirEntrySchema>;
export type RepoEntry = z.infer<typeof RepoEntrySchema>;
export type RepsConfig = z.infer<typeof RepsConfigSchema>;

export function repoKey(name: string): string {
	return encodeURIComponent(name);
}
