import { type Context, Hono } from 'hono';
import { cors } from 'hono/cors';
import { type AnalysisResult, analyzePackage } from './analyzer';
import { packageCache } from './cache';

const api = new Hono();

// Enable CORS for all API routes
api.use('*', cors({ origin: '*' }));

// Rate limiter state
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 30; // 30 requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000;

// Utility to extract real client IP
const getClientIP = (c: Context) =>
	c.req.header('x-forwarded-for')?.split(',')[0] || c.req.header('x-real-ip') || '127.0.0.1';

// Rate limit middleware
api.use('*', async (c, next) => {
	const ip = getClientIP(c);
	const now = Date.now();
	let record = rateLimitMap.get(ip);

	if (!record || now > record.resetAt) {
		record = { count: 1, resetAt: now + RATE_LIMIT_WINDOW };
		rateLimitMap.set(ip, record);
	} else {
		record.count++;
	}

	if (record.count > RATE_LIMIT_MAX) {
		return c.json(
			{
				error: 'RATE_LIMITED',
				message: 'Too many requests. Please try again later.',
				statusCode: 429,
			},
			429,
		);
	}

	await next();
});

// Format internal AnalysisResult to the public API contract
const formatPackageResult = (data: AnalysisResult) => {
	// Standardize download times (in milliseconds)
	const calcDlTime = (bytes: number, bps: number) => Math.round((bytes / bps) * 1000);
	const dl4g = calcDlTime(data.gzipSize, 7 * 1024 * 1024);
	const dlWifi = calcDlTime(data.gzipSize, 20 * 1024 * 1024);
	const dl3g = calcDlTime(data.gzipSize, 1.5 * 1024 * 1024);
	const dl2g = calcDlTime(data.gzipSize, 50 * 1024);

	return {
		name: data.packageName,
		version: data.version,
		description: data.description || '',
		license: data.license || 'Unknown',
		author: data.packageName.split('/')[0]?.replace('@', '') || 'unknown',
		gzipSize: data.gzipSize,
		installSize: data.uncompressedSize,
		fileCount: data.fileCount,
		fileTypes: data.typeBreakdown || {},
		dependencies: Array.isArray(data.dependencies) ? data.dependencies : [],
		dependencyCount: Array.isArray(data.dependencies) ? data.dependencies.length : 0,
		hasESM: data.hasESM,
		hasCJS: data.hasCJS,
		hasTypes: data.hasTypes,
		downloadTime: {
			'2g': dl2g,
			'3g': dl3g,
			'4g': dl4g,
			wifi: dlWifi,
		},
	};
};

// Generic error handler to adhere to the requested JSON response shape
const handleError = (c: Context, error: unknown) => {
	const msg = error instanceof Error ? error.message : String(error);

	if (msg.includes('not found') || msg.includes('Failed to install')) {
		return c.json(
			{
				error: 'PACKAGE_NOT_FOUND',
				message: msg,
				statusCode: 404,
			},
			404,
		);
	}

	return c.json(
		{
			error: 'ANALYSIS_FAILED',
			message: msg,
			statusCode: 500,
		},
		500,
	);
};

// Set generic headers
api.use('*', async (c, next) => {
	// biome-ignore lint/complexity/useLiteralKeys: TS strict context
	c.header('X-Saizu-Version', Bun.env['SAIZU_VERSION'] || '1.0.0');
	await next();
});

// GET /api/v1 (Documentation)
api.get('/', (c) => {
	return c.json({
		// biome-ignore lint/complexity/useLiteralKeys: TS strict context
		version: Bun.env['SAIZU_VERSION'] || '1.0.0',
		baseUrl: 'https://saizu.dev/api/v1',
		endpoints: [
			{ method: 'GET', path: '/package/:name', description: 'Analyze a single npm package' },
			{ method: 'GET', path: '/compare?a=pkg1&b=pkg2', description: 'Compare two npm packages' },
			{ method: 'GET', path: '/health', description: 'Health check' },
		],
	});
});

// GET /api/v1/health
api.get('/health', (c) => {
	return c.json({
		status: 'ok',
		// biome-ignore lint/complexity/useLiteralKeys: TS strict context
		version: Bun.env['SAIZU_VERSION'] || '1.0.0',
		uptime: process.uptime(),
	});
});

const getPackageInfo = async (name: string, version?: string) => {
	const cacheKey = version ? `${name}@${version}` : name;
	const cached = packageCache.get(cacheKey);

	if (cached) {
		return { data: cached, hit: true };
	}

	const result = await analyzePackage(name, version);
	packageCache.set(cacheKey, result);
	return { data: result, hit: false };
};

// GET /api/v1/package/:name (using wildcard to support scoped packages like @scope/name)
api.get('/package/*', async (c) => {
	// Remove '/package/' from the start of the path (which is the matched wildcard part)
	const path = c.req.path.replace('/api/v1/package/', '');
	const name = decodeURIComponent(path);

	if (!name) {
		return c.json(
			{
				error: 'MISSING_PARAMS',
				message: 'Package name is required',
				statusCode: 400,
			},
			400,
		);
	}

	const version = c.req.query('version');

	try {
		const { data, hit } = await getPackageInfo(name, version);

		c.header('X-Cache', hit ? 'HIT' : 'MISS');
		c.header('Cache-Control', 'public, max-age=300');

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
		return c.json(
			{
				error: 'MISSING_PARAMS',
				message: 'Both "a" and "b" query parameters are required for comparison',
				statusCode: 400,
			},
			400,
		);
	}

	try {
		const [resA, resB] = await Promise.all([getPackageInfo(pkgA), getPackageInfo(pkgB)]);

		c.header('X-Cache', resA.hit && resB.hit ? 'HIT' : 'MISS');
		c.header('Cache-Control', 'public, max-age=300');

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
