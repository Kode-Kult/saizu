import { type Context, Hono } from 'hono';
import { analyzePackage } from '../analyzer';
import { packageCache } from '../cache';

const api = new Hono();

const analyzeHandler = async (c: Context) => {
	const scope = c.req.param('scope');
	const packageParam = c.req.param('package');
	const name = scope ? `${scope}/${packageParam}` : packageParam;

	const cached = packageCache.get(name);
	if (cached) return c.json(cached);

	try {
		const result = await analyzePackage(name);
		packageCache.set(name, result);
		return c.json(result);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return c.json({ error: message }, 500);
	}
};

api.get('/:package', analyzeHandler);
api.get('/:scope/:package', analyzeHandler);

export default api;
