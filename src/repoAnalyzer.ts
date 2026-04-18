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
	const { owner, repo, branch, subpath } = options;

	if (subpath && (subpath.includes('..') || subpath.startsWith('/'))) {
		throw new Error('INVALID_SUBPATH');
	}

	// biome-ignore lint/complexity/useLiteralKeys: Bun.env bracket notation
	const tmpBase = Bun.env['TMP'] || Bun.env['TEMP'] || '/tmp';
	const id = crypto.randomUUID();
	const tmpDir = join(tmpBase, `saizu-repo-${id}`);

	try {
		// 1. Shallow clone — if branch specified use it, otherwise let git use repo default (main/master/etc)
		const cloneArgs = ['git', 'clone', '--depth', '1', '--single-branch'];
		if (branch && branch !== 'HEAD') {
			cloneArgs.push('--branch', branch);
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

		// 2. Commit hash + actual branch (may differ from requested if default was used)
		const hashProc = Bun.spawn(['git', '-C', tmpDir, 'rev-parse', '--short', 'HEAD'], { stdout: 'pipe' });
		await hashProc.exited;
		const commit = (await new Response(hashProc.stdout).text()).trim();

		const branchProc = Bun.spawn(['git', '-C', tmpDir, 'rev-parse', '--abbrev-ref', 'HEAD'], { stdout: 'pipe' });
		await branchProc.exited;
		const actualBranch = (await new Response(branchProc.stdout).text()).trim() || branch || 'main';

		// 3. Resolve analysis directory
		const analysisDir = subpath ? join(tmpDir, subpath) : tmpDir;
		const pkgJsonFile = Bun.file(join(analysisDir, 'package.json'));
		if (!(await pkgJsonFile.exists())) throw new Error('NO_PACKAGE_JSON');

		const pkgJson = await pkgJsonFile.json();

		// 4. Analyze using the unified analyzeLocalDirectory (same logic as npm flow)
		const baseAnalysis = await analyzeLocalDirectory(analysisDir, pkgJson);

		// 5. Monorepo root detection (convert workspaces into pseudo-dependencies)
		const isRootMonorepo = !subpath && pkgJson.workspaces;
		const monorepoPackages: string[] = [];
		if (isRootMonorepo) {
			const workspacesConfig = Array.isArray(pkgJson.workspaces)
				? pkgJson.workspaces
				: ((pkgJson.workspaces as { packages?: string[] }).packages ?? []);

			for (const pattern of workspacesConfig) {
				let pat = pattern;
				if (pat.startsWith('./')) pat = pat.slice(2);
				if (pat.endsWith('/*')) pat = pat.slice(0, -2);
				if (pat.endsWith('/')) pat = pat.slice(0, -1);

				const glob = new Bun.Glob(`${pat}/package.json`);
				for await (const match of glob.scan({ cwd: tmpDir, onlyFiles: true })) {
					const pkgDir = match.replace(/[/\\]?package\.json$/, '').replace(/\\\\/g, '/');
					monorepoPackages.push(`${owner}/${repo}:${pkgDir}`);
				}
			}
			// Prepend monorepo sub-packages as dependencies so the UI shows them interactively
			if (monorepoPackages.length > 0) {
				baseAnalysis.dependencies = [...monorepoPackages, ...baseAnalysis.dependencies];
			}
		}

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
			branch: actualBranch,
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
