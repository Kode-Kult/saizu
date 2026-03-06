// biome-ignore lint/style/useNodejsImportProtocol: Bun-native path resolution required by user
import { join } from 'path';
import { type AnalysisResult, analyzeLocalDirectory, analyzePackage } from './analyzer';
import { packageCache } from './cache';

export interface RepoAnalysisOptions {
	owner: string;
	repo: string;
	branch?: string;
	subpath?: string;
}

export interface RepoAnalysisResult extends AnalysisResult {
	source: 'github';
	owner: string;
	repo: string;
	branch: string;
	subpath?: string;
	commit: string;
	npmComparison: {
		available: boolean;
		publishedVersion: string | null;
		gzipDelta: number | null;
		installDelta: number | null;
		verdict: 'heavier' | 'lighter' | 'equal' | null;
	};
}

export async function analyzeRepo(options: RepoAnalysisOptions): Promise<RepoAnalysisResult> {
	const { owner, repo, branch = 'main', subpath } = options;

	if (subpath && (subpath.includes('..') || subpath.startsWith('/'))) {
		throw new Error('INVALID_SUBPATH');
	}

	// biome-ignore lint/complexity/useLiteralKeys: Bun.env bracket notation
	const tmpBase = Bun.env['TMP'] || Bun.env['TEMP'] || '/tmp';
	const id = crypto.randomUUID();
	const tmpDir = join(tmpBase, `saizu-repo-${id}`);

	try {
		// 1. Shallow clone
		const cloneArgs = ['git', 'clone', '--depth', '1'];
		if (branch && branch !== 'HEAD') {
			cloneArgs.push('--single-branch', '--branch', branch);
		}
		cloneArgs.push(`https://github.com/${owner}/${repo}.git`, tmpDir);

		const cloneProc = Bun.spawn(cloneArgs, { stderr: 'pipe' });
		let isTimeout = false;
		const timeoutId = setTimeout(() => {
			isTimeout = true;
			cloneProc.kill();
		}, 30_000);

		const cloneExitCode = await cloneProc.exited;
		clearTimeout(timeoutId);

		if (isTimeout) throw new Error('CLONE_TIMEOUT');

		if (cloneExitCode !== 0) {
			const stderr = await new Response(cloneProc.stderr).text();
			const lower = stderr.toLowerCase();
			if (stderr.includes('Authentication failed') || stderr.includes('could not read Username')) {
				throw new Error('PRIVATE_REPO');
			}
			if (lower.includes('did not match any file') || lower.includes('remote branch')) {
				throw new Error('BRANCH_NOT_FOUND');
			}
			throw new Error('REPO_NOT_FOUND');
		}

		// 2. Commit hash
		const hashProc = Bun.spawn(['git', '-C', tmpDir, 'rev-parse', '--short', 'HEAD'], { stdout: 'pipe' });
		await hashProc.exited;
		const commit = (await new Response(hashProc.stdout).text()).trim();

		// 3. Resolve analysis directory
		const analysisDir = subpath ? join(tmpDir, subpath) : tmpDir;
		const pkgJsonFile = Bun.file(join(analysisDir, 'package.json'));
		if (!(await pkgJsonFile.exists())) throw new Error('NO_PACKAGE_JSON');

		const pkgJson = await pkgJsonFile.json();

		// 4. Monorepo root detection
		if (!pkgJson.files && pkgJson.workspaces) {
			const workspaces = Array.isArray(pkgJson.workspaces)
				? pkgJson.workspaces
				: ((pkgJson.workspaces as { packages?: string[] }).packages ?? []);
			const err = new Error('MONOREPO_ROOT');
			// biome-ignore lint/suspicious/noExplicitAny: Custom error with dynamic properties
			(err as any).workspaces = workspaces;
			throw err;
		}

		// 5. Analyze using the unified analyzeLocalDirectory (same logic as npm flow)
		const baseAnalysis = await analyzeLocalDirectory(analysisDir, pkgJson);

		// 6. npmComparison
		let npmComparison: RepoAnalysisResult['npmComparison'] = {
			available: false,
			publishedVersion: null,
			gzipDelta: null,
			installDelta: null,
			verdict: null,
		};

		const packageName = baseAnalysis.packageName;
		const npmData = (await fetch(`https://registry.npmjs.org/${packageName}/latest`)
			.then((r) => (r.ok ? r.json() : null))
			.catch(() => null)) as { version?: string } | null;

		if (npmData?.version) {
			const publishedVersion = npmData.version;
			const cacheKey = `npm:${packageName}@${publishedVersion}`;
			let currentNpm = packageCache.get(cacheKey) as AnalysisResult | null;

			if (!currentNpm) {
				currentNpm = await analyzePackage(packageName, publishedVersion).catch(() => null);
				if (currentNpm) {
					packageCache.set(cacheKey, currentNpm, 30 * 60 * 1000);
				}
			}

			if (currentNpm) {
				const gzipDelta = baseAnalysis.gzipSize - currentNpm.gzipSize;
				const installDelta = baseAnalysis.uncompressedSize - currentNpm.uncompressedSize;
				const verdict: 'heavier' | 'lighter' | 'equal' =
					gzipDelta > 1024 ? 'heavier' : gzipDelta < -1024 ? 'lighter' : 'equal';

				npmComparison = { available: true, publishedVersion, gzipDelta, installDelta, verdict };
			}
		}

		return {
			source: 'github',
			owner,
			repo,
			branch,
			subpath,
			commit,
			npmComparison,
			...baseAnalysis,
			// Override repository URL to always point to the GitHub source
			repository: `https://github.com/${owner}/${repo}`,
		};
	} finally {
		try {
			await Bun.spawn(['rm', '-rf', tmpDir]).exited;
		} catch (_e) {}
	}
}
