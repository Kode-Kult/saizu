import { type Context, Hono } from 'hono';
import { analyzePackage } from '../analyzer';
import { type BadgeType, generateBadge } from '../badge';
import { packageCache } from '../cache';
import { analyzeRepo } from '../repoAnalyzer';

const badge = new Hono();

const badgeHandler = async (c: Context) => {
	const scope = c.req.param('scope');
	const packageParam = c.req.param('package') ?? '';
	const type = (c.req.query('type') || 'gzip') as BadgeType;
	const name = scope ? `${scope}/${packageParam}` : packageParam;

	// Detect GitHub repo format: "owner/repo" (no @ or leading dot, no npm scope)
	const isGitHub = scope && !scope.startsWith('@') && /^[a-zA-Z0-9_.-]+$/.test(scope) && /^[a-zA-Z0-9_.-]+$/.test(packageParam);

	const cacheKey = isGitHub ? `github:${name}@undefined:` : `npm:${name}`;
	let result = packageCache.get(cacheKey);

	if (!result) {
		try {
			if (isGitHub) {
				result = await analyzeRepo({ owner: scope, repo: packageParam });
			} else {
				result = await analyzePackage(name);
			}
			packageCache.set(cacheKey, result, isGitHub ? 5 * 60 * 1000 : 30 * 60 * 1000);
		} catch (_e) {
			return c.body(generateErrorBadge(type), 200, { 'Content-Type': 'image/svg+xml' });
		}
	}

	if (!result) {
		return c.body(generateErrorBadge(type), 200, { 'Content-Type': 'image/svg+xml' });
	}

	const size = type === 'gzip' ? result.gzipSize : result.uncompressedSize;
	const svg = generateBadge(size, type);
	c.header('Content-Type', 'image/svg+xml');
	c.header('Cache-Control', 'public, max-age=3600');
	return c.body(svg);
};

function generateErrorBadge(type: string): string {
	const label = type === 'gzip' ? 'gzip size' : 'install size';
	const labelWidth = label.length * 7 + 10;
	const totalWidth = labelWidth + 45;
	return `
<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20">
  <rect width="${totalWidth}" height="20" rx="3" fill="#555"/>
  <rect x="${labelWidth}" width="45" height="20" rx="3" fill="#e05d44"/>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text x="${labelWidth + 22.5}" y="14">error</text>
  </g>
</svg>`.trim();
}

badge.get('/:package', badgeHandler);
badge.get('/:scope/:package', badgeHandler);

export default badge;
