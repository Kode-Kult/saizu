import { type Context, Hono } from 'hono';
import { cors } from 'hono/cors';
import { type AnalysisResult, analyzePackage } from './analyzer';
import { packageCache } from './cache';
import { analyzeRepo, type RepoAnalysisResult } from './repoAnalyzer';

const api = new Hono();

// Enable CORS for all API routes
api.use('*', cors({ origin: '*' }));

// Format internal AnalysisResult to the public API contract
const formatPackageResult = (data: AnalysisResult | RepoAnalysisResult) => {
	const calcDlTime = (bytes: number, bps: number) => Math.round((bytes / bps) * 1000);
	const base = {
		packageName: data.packageName,
		packageVersion: data.version,
		description: data.description,
		license: data.license,
		gzipSize: data.gzipSize,
		installSize: data.uncompressedSize,
		fileCount: data.fileCount,
		fileTypes: data.typeBreakdown,
		dependencies: data.dependencies,
		dependencyCount: data.dependencies.length,
		hasESM: data.hasESM,
		hasCJS: data.hasCJS,
		hasTypes: data.hasTypes,
		downloadTime: {
			'4g': calcDlTime(data.gzipSize, 7 * 1024 * 1024),
			wifi: calcDlTime(data.gzipSize, 20 * 1024 * 1024),
			gbit: calcDlTime(data.gzipSize, 125 * 1024 * 1024),
		},
	};

	if ('source' in data && data.source === 'github') {
		return {
			source: 'github',
			owner: data.owner,
			repo: data.repo,
			branch: data.branch,
			subpath: data.subpath,
			commit: data.commit,
			...base,
			npmComparison: data.npmComparison,
			cachedAt: new Date().toISOString(),
		};
	}

	return { source: 'npm', ...base };
};

// Generic error handler following the requested table
const handleError = (c: Context, error: unknown) => {
	const msg = error instanceof Error ? error.message : String(error);

	if (msg === 'REPO_NOT_FOUND') {
		return c.json({ error: 'REPO_NOT_FOUND', message: 'The repo does not exist or is private', statusCode: 404 }, 404);
	}
	if (msg === 'BRANCH_NOT_FOUND') {
		return c.json({ error: 'BRANCH_NOT_FOUND', message: 'The specified branch does not exist', statusCode: 404 }, 404);
	}
	if (msg === 'SUBPATH_NOT_FOUND') {
		return c.json(
			{ error: 'SUBPATH_NOT_FOUND', message: 'The subpath does not exist in the repo', statusCode: 404 },
			404,
		);
	}
	if (msg === 'NO_PACKAGE_JSON') {
		return c.json(
			{ error: 'NO_PACKAGE_JSON', message: 'The repo (or subpath) does not contain package.json', statusCode: 422 },
			422,
		);
	}
	if (msg === 'MONOREPO_ROOT') {
		// biome-ignore lint/suspicious/noExplicitAny: Custom error properties
		const workspaces = (error as any).workspaces || [];
		return c.json(
			{
				error: 'MONOREPO_ROOT',
				message: `This is a monorepo root. Please specify a subpath, e.g. ?subpath=${workspaces[0] || 'packages/react'}`,
				workspaces,
				statusCode: 422,
			},
			422,
		);
	}
	if (msg === 'INVALID_SUBPATH') {
		return c.json(
			{ error: 'INVALID_SUBPATH', message: 'The subpath contains .. or invalid characters', statusCode: 422 },
			422,
		);
	}
	if (msg === 'CLONE_TIMEOUT') {
		return c.json({ error: 'CLONE_TIMEOUT', message: 'The clone took more than 30 seconds', statusCode: 408 }, 408);
	}
	if (msg === 'PRIVATE_REPO') {
		return c.json(
			{ error: 'PRIVATE_REPO', message: 'Git responded with an auth error (private repo)', statusCode: 400 },
			400,
		);
	}

	// Fallback for NPM failures
	const status = msg.includes('not found') ? 404 : 500;
	return c.json(
		{
			error: status === 404 ? 'PACKAGE_NOT_FOUND' : 'ANALYSIS_FAILED',
			message: msg,
			statusCode: status,
		},
		// biome-ignore lint/suspicious/noExplicitAny: Hono StatusCode type mismatch with dynamic variable
		status as any,
	);
};

// Set generic headers
api.use('*', async (c, next) => {
	// biome-ignore lint/complexity/useLiteralKeys: Bun.env bracket notation
	c.header('X-Saizu-Version', Bun.env['SAIZU_VERSION'] || '1.0.0');
	await next();
});

// GET /api/v1 (Documentation)
api.get('/', (c) => {
	return c.json({
		// biome-ignore lint/complexity/useLiteralKeys: Bun.env bracket notation
		version: Bun.env['SAIZU_VERSION'] || '1.0.0',
		baseUrl: 'https://saizu.dev/api/v1',
		endpoints: [
			{ method: 'GET', path: '/package/:name', description: 'Analyze a published npm package' },
			{ method: 'GET', path: '/repo/:owner/:repo', description: 'Analyze a public GitHub repo (pre-publish)' },
			{
				method: 'GET',
				path: '/compare?a=target1&b=target2',
				description: 'Compare two targets (npm or github:owner/repo)',
			},
			{ method: 'GET', path: '/health', description: 'Health check' },
		],
		targetFormats: {
			npm: 'react, @tanstack/react-query, react@18.2.0',
			github: 'github:owner/repo, github:owner/repo@branch, github:owner/repo@branch:subpath',
		},
	});
});

// GET /api/v1/health
api.get('/health', (c) => {
	return c.json({
		status: 'ok',
		// biome-ignore lint/complexity/useLiteralKeys: Bun.env bracket notation
		version: Bun.env['SAIZU_VERSION'] || '1.0.0',
		uptime: process.uptime(),
	});
});

const getPackageInfo = async (name: string, version?: string) => {
	const cacheKey = version ? `npm:${name}@${version}` : `npm:${name}`;
	const cached = packageCache.get(cacheKey);

	if (cached) {
		return { data: cached, hit: true };
	}

	const result = await analyzePackage(name, version);
	packageCache.set(cacheKey, result, 30 * 60 * 1000); // 30 mins TTL
	return { data: result, hit: false };
};

const getRepoInfo = async (owner: string, repo: string, branch?: string, subpath?: string) => {
	const cacheKey = `github:${owner}/${repo}@${branch || 'main'}:${subpath ?? ''}`;
	const cached = packageCache.get(cacheKey);

	if (cached) {
		return { data: cached, hit: true };
	}

	const result = await analyzeRepo({ owner, repo, branch, subpath });
	packageCache.set(cacheKey, result, 5 * 60 * 1000); // 5 mins for GitHub
	return { data: result, hit: false };
};

// GET /api/v1/package/:name
api.get('/package/*', async (c) => {
	const path = c.req.path.replace('/api/v1/package/', '');
	const name = decodeURIComponent(path);
	if (!name) return c.json({ error: 'MISSING_PARAMS', statusCode: 400 }, 400);

	const version = c.req.query('version');

	try {
		const { data, hit } = await getPackageInfo(name, version);
		c.header('X-Cache', hit ? 'HIT' : 'MISS');
		return c.json(formatPackageResult(data));
	} catch (error) {
		return handleError(c, error);
	}
});

// GET /api/v1/repo/:owner/:repo
api.get('/repo/:owner/:repo', async (c) => {
	const owner = c.req.param('owner');
	const repo = c.req.param('repo');
	const branch = c.req.query('branch') || 'main'; // User defaults to main
	const subpath = c.req.query('subpath');

	if (!owner || !repo) return c.json({ error: 'MISSING_PARAMS', statusCode: 400 }, 400);

	try {
		const { data, hit } = await getRepoInfo(owner, repo, branch, subpath);
		c.header('X-Cache', hit ? 'HIT' : 'MISS');
		return c.json(formatPackageResult(data));
	} catch (error) {
		return handleError(c, error);
	}
});

// GET /api/v1/compare
api.get('/compare', async (c) => {
	const pkgA = c.req.query('a');
	const pkgB = c.req.query('b');

	if (!pkgA || !pkgB) {
		return c.json({ error: 'MISSING_PARAMS', message: 'Both "a" and "b" are required', statusCode: 400 }, 400);
	}

	try {
		const fetchTarget = async (target: string) => {
			if (target.startsWith('github:')) {
				const withoutPrefix = target.slice('github:'.length);
				let ownerRepo = withoutPrefix;
				let branch = 'main';
				let subpath: string | undefined;

				const colonIdx = withoutPrefix.indexOf(':');
				if (colonIdx !== -1) {
					subpath = withoutPrefix.slice(colonIdx + 1);
					ownerRepo = withoutPrefix.slice(0, colonIdx);
				}

				const atIdx = ownerRepo.indexOf('@');
				if (atIdx !== -1) {
					branch = ownerRepo.slice(atIdx + 1);
					ownerRepo = ownerRepo.slice(0, atIdx);
				}

				const [owner, repoName] = ownerRepo.split('/');
				if (!owner || !repoName) throw new Error(`Invalid github format: ${target}`);

				return getRepoInfo(owner, repoName, branch, subpath);
			}

			const atIdx = target.lastIndexOf('@');
			if (atIdx > 0) {
				const name = target.slice(0, atIdx);
				const version = target.slice(atIdx + 1);
				return getPackageInfo(name, version);
			}
			return getPackageInfo(target);
		};

		const [resA, resB] = await Promise.all([fetchTarget(pkgA), fetchTarget(pkgB)]);

		const fmtA = formatPackageResult(resA.data);
		const fmtB = formatPackageResult(resB.data);

		return c.json({
			a: fmtA,
			b: fmtB,
			diff: {
				gzipSize: fmtA.gzipSize - fmtB.gzipSize,
				installSize: fmtA.installSize - fmtB.installSize,
				dependencyCount: fmtA.dependencyCount - fmtB.dependencyCount,
				smaller: fmtA.gzipSize < fmtB.gzipSize ? 'a' : fmtA.gzipSize > fmtB.gzipSize ? 'b' : 'equal',
			},
		});
	} catch (error) {
		return handleError(c, error);
	}
});

export default api;
