import { Hono } from 'hono';
import { cors } from 'hono/cors';
import apiRoutes from './routes/api';
import badgeRoutes from './routes/badge';
import uiRoutes, { deferredCSS } from './routes/ui';

const app = new Hono();

const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT = 60;
const WINDOW = 60000;

app.use('*', cors());

// Rate limiting
app.use('*', async (c, next) => {
	const ip = c.req.header('x-forwarded-for') || 'unknown';
	const now = Date.now();
	const userData = rateLimitMap.get(ip) || { count: 0, lastReset: now };

	if (now - userData.lastReset > WINDOW) {
		userData.count = 0;
		userData.lastReset = now;
	}

	userData.count++;
	rateLimitMap.set(ip, userData);

	if (userData.count > RATE_LIMIT) {
		return c.json({ error: 'Too many requests. Please try again in a minute.' }, 429);
	}

	await next();
});

// Gzip compression — text only (HTML, CSS, JS, JSON)
// Never compress fonts/images: they are already compressed internally
app.use('*', async (c, next) => {
	await next();

	const res = c.res;
	const accept = c.req.header('accept-encoding') || '';
	if (!accept.includes('gzip')) return;

	const ct = res.headers.get('content-type') || '';
	const isText = ct.startsWith('text/') || ct.includes('javascript') || ct.includes('json');
	if (!isText) return;

	const buf = await res.arrayBuffer();
	const compressed = Bun.gzipSync(new Uint8Array(buf));
	const headers = new Headers(res.headers);
	headers.set('Content-Encoding', 'gzip');
	headers.set('Content-Length', String(compressed.length));
	headers.delete('transfer-encoding');

	c.res = new Response(compressed, { status: res.status, headers });
});

// Sub-routers — native Hono mount, zero bridge overhead
app.route('/api', apiRoutes);
app.route('/badge', badgeRoutes);

// Static assets
app.get('/fonts/*', (c) => {
	const filename = c.req.path.split('/').pop();
	return new Response(Bun.file(`public/fonts/${filename}`), {
		headers: {
			'Cache-Control': 'public, max-age=31536000, immutable',
			'Content-Type': 'font/woff2',
		},
	});
});

app.get(
	'/bg.png',
	() =>
		new Response(Bun.file('public/bg.png'), {
			headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
		}),
);

app.get(
	'/hero.avif',
	() =>
		new Response(Bun.file('public/hero.avif'), {
			headers: {
				'Cache-Control': 'public, max-age=86400',
				'Content-Type': 'image/avif',
			},
		}),
);

app.get(
	'/saizu-logo.avif',
	() =>
		new Response(Bun.file('public/saizu-logo.avif'), {
			headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
		}),
);

app.get(
	'/saizu-jp.avif',
	() =>
		new Response(Bun.file('public/saizu-jp.avif'), {
			headers: {
				'Cache-Control': 'public, max-age=31536000, immutable',
				'Content-Type': 'image/avif',
			},
		}),
);

app.get(
	'/css/deferred-:hash.css',
	() =>
		new Response(deferredCSS, {
			headers: {
				'Content-Type': 'text/css',
				'Cache-Control': 'public, max-age=31536000, immutable',
			},
		}),
);

// UI routes
app.route('/', uiRoutes);

export default {
	port: 3009,
	fetch: app.fetch,
};

console.log('Server is running at http://localhost:3009');
