// biome-ignore lint/style/useNodejsImportProtocol: Bun-native path resolution required by user
import { join } from 'path';
import type { AnalysisResult } from './analyzer';
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

async function getPublishableFiles(analysisDir: string): Promise<string[]> {
	const pkgFile = Bun.file(join(analysisDir, 'package.json'));
	if (!(await pkgFile.exists())) throw new Error('NO_PACKAGE_JSON');
	const pkg = await pkgFile.json();

	// Monorepo root detection
	if (!pkg.files && pkg.workspaces) {
		const workspaces = Array.isArray(pkg.workspaces) ? pkg.workspaces : (pkg.workspaces.packages ?? []);
		const err = new Error('MONOREPO_ROOT');
		// biome-ignore lint/suspicious/noExplicitAny: Custom error properties
		(err as any).workspaces = workspaces;
		throw err;
	}

	// Pattern to include
	const includePatterns: string[] = pkg.files?.length ? pkg.files : ['**/*'];

	// Exclude ALWAYS these, npm excludes them automatically
	const ALWAYS_EXCLUDED = [
		'node_modules',
		'.git',
		'.DS_Store',
		'*.test.*',
		'*.spec.*',
		'**/__tests__/**',
		'**/test/**',
		'**/tests/**',
		'**/*.md',
		'**/*.map',
		'**/.*',
		'**/*.snap',
		'**/fixtures/**',
		'**/examples/**',
		'**/benchmark/**',
		'**/scripts/**',
	];

	const glob = new Bun.Glob(
		includePatterns.length === 1 && includePatterns[0] === '**/*' ? '**/*' : `{${includePatterns.join(',')}}`,
	);

	const allFiles: string[] = [];
	for await (const file of glob.scan({ cwd: analysisDir, onlyFiles: true })) {
		allFiles.push(file);
	}

	// Apply exclusions
	return allFiles.filter((f) => {
		const lower = f.toLowerCase();
		return !ALWAYS_EXCLUDED.some((pattern) => {
			if (pattern.includes('*')) {
				return new Bun.Glob(pattern).match(f);
			}
			return lower.includes(pattern.toLowerCase());
		});
	});
}

async function getGzipSize(absFilePaths: string[]): Promise<number> {
	const chunks: Uint8Array[] = [];
	for (const p of absFilePaths) {
		chunks.push(new Uint8Array(await Bun.file(p).arrayBuffer()));
	}
	const combined = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0));
	let offset = 0;
	for (const chunk of chunks) {
		combined.set(chunk, offset);
		offset += chunk.length;
	}

	// Native CompressionStream (available in Bun)
	const cs = new CompressionStream('gzip');
	const writer = cs.writable.getWriter();
	writer.write(combined);
	writer.close();
	const compressed = await new Response(cs.readable).arrayBuffer();
	return compressed.byteLength;
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
		// 1. Clone repo (shallow clone)
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
			const lowerStderr = stderr.toLowerCase();
			if (stderr.includes('Authentication failed') || stderr.includes('could not read Username')) {
				throw new Error('PRIVATE_REPO');
			}
			if (lowerStderr.includes('not found') || lowerStderr.includes('could not read from remote')) {
				throw new Error('REPO_NOT_FOUND');
			}
			if (lowerStderr.includes('did not match any file') || lowerStderr.includes('remote branch')) {
				throw new Error('BRANCH_NOT_FOUND');
			}
			throw new Error('REPO_NOT_FOUND');
		}

		// 2. Get commit hash
		const hashProc = Bun.spawn(['git', '-C', tmpDir, 'rev-parse', '--short', 'HEAD'], { stdout: 'pipe' });
		await hashProc.exited;
		const commit = (await new Response(hashProc.stdout).text()).trim();

		// 3. Resolve analysis directory
		const analysisDir = subpath ? join(tmpDir, subpath) : tmpDir;
		const pkgJsonFile = Bun.file(join(analysisDir, 'package.json'));
		if (!(await pkgJsonFile.exists())) throw new Error('NO_PACKAGE_JSON');

		const pkgJson = await pkgJsonFile.json();
		const packageName = pkgJson.name || repo;

		// 4. Analyze publishable files (Approccio B Refined)
		const publishableFiles = await getPublishableFiles(analysisDir);
		const absFilePaths = publishableFiles.map((f) => join(analysisDir, f));

		const uncompressedSize = absFilePaths.reduce((acc, p) => acc + Bun.file(p).size, 0);
		const gzipSize = await getGzipSize(absFilePaths);
		const fileCount = publishableFiles.length;

		const typeBreakdown: Record<string, number> = {};
		for (const relPath of publishableFiles) {
			const parts = relPath.split('.');
			const ext = parts.length > 1 ? parts.pop()?.toLowerCase() || 'other' : 'other';
			const sz = Bun.file(join(analysisDir, relPath)).size;
			typeBreakdown[ext] = (typeBreakdown[ext] || 0) + sz;
		}

		const baseAnalysis: AnalysisResult = {
			packageName,
			version: pkgJson.version || '0.0.0',
			license: pkgJson.license || 'N/A',
			uncompressedSize,
			gzipSize,
			fileCount,
			dependencies: Object.keys(pkgJson.dependencies || {}),
			description: pkgJson.description || '',
			repository: `https://github.com/${owner}/${repo}`,
			homepage: pkgJson.homepage || '',
			hasESM: !!(pkgJson.module || pkgJson.exports || pkgJson.type === 'module'),
			hasCJS: !!(pkgJson.main || !pkgJson.type || pkgJson.type === 'commonjs'),
			hasTypes: !!(pkgJson.types || pkgJson.typings || (await Bun.file(join(analysisDir, 'index.d.ts')).exists())),
			typeBreakdown,
		};

		// 5. npmComparison
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
				// We still use analyzePackage for NPM comparison as it handles fetching from registry
				const { analyzePackage } = await import('./analyzer');
				currentNpm = await analyzePackage(packageName, publishedVersion).catch(() => null);
				if (currentNpm) {
					packageCache.set(cacheKey, currentNpm, 30 * 60 * 1000);
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
		// 6. Guaranteed cleanup
		try {
			await Bun.spawn(['rm', '-rf', tmpDir]).exited;
		} catch (_e) {}
	}
}
