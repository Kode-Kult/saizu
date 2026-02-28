import type { AnalysisResult } from './analyzer';

export class Cache<T> {
	private cache = new Map<string, { value: T; expires: number }>();

	constructor(private defaultTtl: number = 3600000) {} // 1 hour default

	set(key: string, value: T, ttl: number = this.defaultTtl) {
		this.cache.set(key, {
			value,
			expires: Date.now() + ttl,
		});
	}

	get(key: string): T | null {
		const entry = this.cache.get(key);
		if (!entry) return null;

		if (Date.now() > entry.expires) {
			this.cache.delete(key);
			return null;
		}

		return entry.value;
	}

	delete(key: string) {
		this.cache.delete(key);
	}

	clear() {
		this.cache.clear();
	}
}

export const packageCache = new Cache<AnalysisResult>();
