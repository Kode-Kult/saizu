// Server-side GitHub stars fetcher with in-memory cache (1h TTL)
// Zero client-side JS — the count is injected into the HTML template at render time.

let cachedStars = 0;
let lastFetch = 0;
const CACHE_TTL = 3_600_000; // 1 hour

export async function getGitHubStars(): Promise<number> {
	const now = Date.now();
	if (now - lastFetch < CACHE_TTL && lastFetch > 0) return cachedStars;

	try {
		const res = await fetch('https://api.github.com/repos/Kode-Kult/saizu', {
			headers: {
				'User-Agent': 'Saizu/1.0',
				Accept: 'application/vnd.github.v3+json',
			},
		});
		if (res.ok) {
			const data = (await res.json()) as { stargazers_count?: number };
			cachedStars = data.stargazers_count ?? 0;
		}
	} catch {
		// Keep cached value on network failure
	}

	lastFetch = now;
	return cachedStars;
}
