import { join } from 'node:path';
import { type AnalysisResult, analyzePackage, analyzeLocalDirectory } from './analyzer';
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

	// biome-ignore lint/complexity/useLiteralKeys: User requirement: Bun.env bracket notation
	const tmpBase = Bun.env['TMP'] || Bun.env['TEMP'] || '/tmp';
	const id = crypto.randomUUID();
	const tmpDir = join(tmpBase, `saizu-repo-${id}`);

	try {
		const cloneProc = Bun.spawn(
			[
				'git',
				'clone',
				'--depth',
				'1',
				'--single-branch',
				'--branch',
				branch,
				`https://github.com/${owner}/${repo}.git`,
				tmpDir,
			],
			{ stderr: 'pipe' },
		);

		let isTimeout = false;
		const timeoutId = setTimeout(() => {
			isTimeout = true;
			cloneProc.kill();
		}, 30_000);

		const cloneExitCode = await cloneProc.exited;
		clearTimeout(timeoutId);

		if (isTimeout) {
			throw new Error('CLONE_TIMEOUT');
		}

		if (cloneExitCode !== 0) {
			const stderr = await new Response(cloneProc.stderr).text();
			const lowerStderr = stderr.toLowerCase();
			if (stderr.includes('Authentication failed') || stderr.includes('could not read Username')) {
				throw new Error('PRIVATE_REPO');
			}
			if (lowerStderr.includes('not found') || lowerStderr.includes('could not read from remote')) {
				throw new Error('REPO_NOT_FOUND');
			}
			if (
				lowerStderr.includes('did not match any file') ||
				lowerStderr.includes('remote branch') ||
				lowerStderr.includes('not found in upstream')
			) {
				throw new Error('BRANCH_NOT_FOUND');
			}
			// Fallback generic error
			throw new Error('REPO_NOT_FOUND');
		}

		const hashProc = Bun.spawn(['git', '-C', tmpDir, 'rev-parse', '--short', 'HEAD'], { stdout: 'pipe' });
		await hashProc.exited;
		const commit = (await new Response(hashProc.stdout).text()).trim();

		const analysisDir = subpath ? join(tmpDir, subpath) : tmpDir;
		const pkgJsonPath = join(analysisDir, 'package.json');

		const packageJsonObj = await Bun.file(pkgJsonPath)
			.json()
			.catch(() => null);

		if (!packageJsonObj) {
			throw new Error('NO_PACKAGE_JSON');
		}

		// Root monorepos often lack a name field, we fallback to the repo name
		const packageName = packageJsonObj.name || repo;

		// Use base analysis pipeline (Approccio B)
		// We use analyzeLocalDirectory to measure the source without installing dependencies
		const baseAnalysis = await analyzeLocalDirectory(analysisDir, packageJsonObj);

		let npmComparison: RepoAnalysisResult['npmComparison'] = {
			available: false,
			publishedVersion: null,
			gzipDelta: null,
			installDelta: null,
			verdict: null,
		};

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
					packageCache.set(cacheKey, currentNpm);
				}
			}

			if (currentNpm) {
				const gzipDelta = baseAnalysis.gzipSize - currentNpm.gzipSize;
				const installDelta = baseAnalysis.uncompressedSize - currentNpm.uncompressedSize;
				let verdict: 'heavier' | 'lighter' | 'equal' = 'equal';
				if (gzipDelta > 1024) verdict = 'heavier';
				else if (gzipDelta < -1024) verdict = 'lighter';

				npmComparison = {
					available: true,
					publishedVersion,
					gzipDelta,
					installDelta,
					verdict,
				};
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
		};
	} finally {
		// Guaranteed cleanup
		try {
			await Bun.spawn(['rm', '-rf', tmpDir]).exited;
		} catch (_e) {}
	}
}
