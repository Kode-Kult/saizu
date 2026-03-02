import { existsSync, statSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'bun';

export interface AnalysisResult {
	packageName: string;
	version: string;
	license: string;
	gzipSize: number;
	uncompressedSize: number;
	fileCount: number;
	dependencies: string[];
	description: string;
	repository: string;
	homepage: string;
	hasESM: boolean;
	hasCJS: boolean;
	hasTypes: boolean;
	typeBreakdown: Record<string, number>;
}

export async function analyzePackage(name: string, version?: string): Promise<AnalysisResult> {
	const id = crypto.randomUUID();
	// biome-ignore lint/complexity/useLiteralKeys: TS index signature requires bracket notation
	const tmpBase = process.env['TMP'] || process.env['TEMP'] || '/tmp';
	const tempDir = join(tmpBase, `pkgsize-${id}`);
	const fullPkgName = version ? `${name}@${version}` : name;

	try {
		await spawn({ cmd: ['mkdir', '-p', tempDir], stderr: 'ignore' }).exited;
		await Bun.write(join(tempDir, 'package.json'), JSON.stringify({ name: 'temp-analysis', private: true }));

		const proc = spawn({
			cmd: ['bun', 'add', fullPkgName],
			cwd: tempDir,
			stdout: 'ignore',
			stderr: 'ignore',
		});

		const timeout = setTimeout(() => {
			proc.kill();
		}, 45000);

		const exitCode = await proc.exited;
		clearTimeout(timeout);

		if (exitCode !== 0) {
			throw new Error(`Failed to install package ${fullPkgName}`);
		}

		const pkgPath = join(tempDir, 'node_modules', ...name.split(/[/\\]/));
		if (!existsSync(join(pkgPath, 'package.json'))) {
			throw new Error(`Package metadata for "${name}" not found.`);
		}

		const pkgJson = await Bun.file(join(pkgPath, 'package.json')).json();

		let totalUncompressedSize = 0;
		let totalGzipSize = 0;
		let fileCount = 0;
		const typeBreakdown: Record<string, number> = {};

		const measureFile = async (absolutePath: string) => {
			try {
				const file = Bun.file(absolutePath);
				const buffer = await file.arrayBuffer();
				const uint8 = new Uint8Array(buffer);
				const sz = uint8.length;
				if (sz === 0) return;

				totalUncompressedSize += sz;
				totalGzipSize += Bun.gzipSync(uint8).length;
				fileCount++;

				const basename = absolutePath.split(/[/\\]/).pop() || '';
				const dotIdx = basename.lastIndexOf('.');

				let ext: string;
				let isDts = false;

				if (dotIdx <= 0) {
					// No extension (e.g. LICENSE, Makefile) or dotfile (.gitignore)
					ext = 'other';
				} else {
					ext = basename.slice(dotIdx + 1).toLowerCase();
					// Check for .d.ts pattern
					const secondDotIdx = basename.lastIndexOf('.', dotIdx - 1);
					if (secondDotIdx > 0) {
						isDts = basename.slice(secondDotIdx + 1, dotIdx).toLowerCase() === 'd' && ext === 'ts';
					}
					// Validate: must be short and alphanumeric, otherwise classify as 'other'
					if (ext.length > 10 || !/^[a-z0-9]+$/.test(ext)) ext = 'other';
				}

				const finalExt = isDts ? 'dts' : ext;
				typeBreakdown[finalExt] = (typeBreakdown[finalExt] || 0) + sz;
			} catch (_e) {}
		};

		const files = await readdir(pkgPath, { recursive: true });
		for (const relativePath of files) {
			if (relativePath.includes('node_modules')) continue;

			const absolutePath = join(pkgPath, relativePath);
			try {
				const stats = statSync(absolutePath);
				if (stats.isFile()) {
					await measureFile(absolutePath);
				}
			} catch (_e) {}
		}

		const repo = (typeof pkgJson.repository === 'string' ? pkgJson.repository : pkgJson.repository?.url) || '';
		const hasESM = !!(pkgJson.module || pkgJson.exports || pkgJson.type === 'module');
		const hasCJS = !!(pkgJson.main || !pkgJson.type || pkgJson.type === 'commonjs');
		const hasTypes = !!(pkgJson.types || pkgJson.typings || existsSync(join(pkgPath, 'index.d.ts')));

		const allDeps = [
			...Object.keys(pkgJson.dependencies || {}),
			...Object.keys(pkgJson.peerDependencies || {}),
			...Object.keys(pkgJson.optionalDependencies || {}),
		];

		let repositoryUrl = repo
			.replace('git+', '') // git+https:// → https://
			.replace(/\.git$/, ''); // strip trailing .git

		// Normalize all known formats to https://
		if (repositoryUrl.startsWith('git@')) {
			// git@github.com:user/repo → https://github.com/user/repo
			repositoryUrl = repositoryUrl.replace('git@', 'https://').replace(/(?<=https:\/\/[^/]+):/, '/');
		} else if (/^github:/i.test(repositoryUrl)) {
			// github:user/repo → https://github.com/user/repo
			repositoryUrl = repositoryUrl.replace(/^github:/i, 'https://github.com/');
		} else if (/^gitlab:/i.test(repositoryUrl)) {
			repositoryUrl = repositoryUrl.replace(/^gitlab:/i, 'https://gitlab.com/');
		} else if (/^bitbucket:/i.test(repositoryUrl)) {
			repositoryUrl = repositoryUrl.replace(/^bitbucket:/i, 'https://bitbucket.org/');
		} else if (repositoryUrl.startsWith('git://')) {
			// git://github.com/user/repo → https://github.com/user/repo
			repositoryUrl = repositoryUrl.replace('git://', 'https://');
		} else if (repositoryUrl.startsWith('//')) {
			// //github.com/user/repo → https://github.com/user/repo
			repositoryUrl = `https:${repositoryUrl}`;
		} else if (repositoryUrl && !repositoryUrl.startsWith('http')) {
			// bare user/repo → assume github
			if (repositoryUrl.includes('/') && !repositoryUrl.includes(':')) {
				repositoryUrl = `https://github.com/${repositoryUrl}`;
			} else {
				repositoryUrl = ''; // unrecognized format, discard
			}
		}

		// Normalize license field — can be a string or an object { type: '...' }
		const rawLicense = pkgJson.license || pkgJson.licenses?.[0]?.type || '';
		const license = typeof rawLicense === 'string' ? rawLicense : rawLicense.type || '';

		return {
			packageName: pkgJson.name,
			version: pkgJson.version,
			license,
			uncompressedSize: totalUncompressedSize,
			gzipSize: totalGzipSize,
			fileCount,
			dependencies: Array.from(new Set(allDeps)),
			description: pkgJson.description || '',
			repository: repositoryUrl,
			homepage: pkgJson.homepage || '',
			hasESM,
			hasCJS,
			hasTypes,
			typeBreakdown,
		};
	} finally {
		try {
			spawn({ cmd: ['rm', '-rf', tempDir], stdout: 'ignore', stderr: 'ignore' });
		} catch (_e) {}
	}
}
