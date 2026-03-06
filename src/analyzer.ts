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

// biome-ignore lint/suspicious/noExplicitAny: package.json dynamic structure
export async function analyzeLocalDirectory(pkgPath: string, pkgJson: any): Promise<AnalysisResult> {
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
				ext = 'other';
			} else {
				ext = basename.slice(dotIdx + 1).toLowerCase();
				const secondDotIdx = basename.lastIndexOf('.', dotIdx - 1);
				if (secondDotIdx > 0) {
					isDts = basename.slice(secondDotIdx + 1, dotIdx).toLowerCase() === 'd' && ext === 'ts';
				}
				if (ext.length > 10 || !/^[a-z0-9]+$/.test(ext)) ext = 'other';
			}

			const finalExt = isDts ? 'dts' : ext;
			typeBreakdown[finalExt] = (typeBreakdown[finalExt] || 0) + sz;
		} catch (_e) {}
	};

	// Determine which files to include (Approccio B)
	// If 'files' is present in package.json, we only include those
	// Always include package.json, README, LICENSE, CHANGELOG
	const includeList = new Set<string>();
	if (Array.isArray(pkgJson.files)) {
		for (const pattern of pkgJson.files) {
			const glob = new Bun.Glob(pattern);
			for (const file of glob.scanSync({ cwd: pkgPath, onlyFiles: true })) {
				includeList.add(join(pkgPath, file));
			}
			// Also include directories mentioned in 'files'
			for (const dir of glob.scanSync({ cwd: pkgPath, onlyFiles: false })) {
				const fullDir = join(pkgPath, dir);
				if (statSync(fullDir).isDirectory()) {
					const subFiles = await readdir(fullDir, { recursive: true });
					for (const sub of subFiles) {
						includeList.add(join(fullDir, sub));
					}
				}
			}
		}
		// Mandatory npm files
		const mandatory = new Bun.Glob('{package.json,README*,LICENSE*,CHANGELOG*}');
		for (const file of mandatory.scanSync({ cwd: pkgPath, onlyFiles: true })) {
			includeList.add(join(pkgPath, file));
		}
	}

	const allFiles = await readdir(pkgPath, { recursive: true });
	for (const relativePath of allFiles) {
		const absolutePath = join(pkgPath, relativePath);
		
		// Skip if Approccio B is active and file not in include list
		if (includeList.size > 0 && !includeList.has(absolutePath)) continue;

		// Generic ignores
		if (
			relativePath.includes('node_modules') ||
			relativePath.includes('.git/') ||
			relativePath === '.git' ||
			relativePath.includes('.bun/') ||
			relativePath.endsWith('bun.lock') ||
			relativePath.endsWith('package-lock.json') ||
			relativePath.endsWith('yarn.lock')
		) {
			continue;
		}

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

	let repositoryUrl = repo.replace('git+', '').replace(/\.git$/, '');
	if (repositoryUrl.startsWith('git@')) {
		repositoryUrl = repositoryUrl.replace('git@', 'https://').replace(/(?<=https:\/\/[^/]+):/, '/');
	} else if (/^github:/i.test(repositoryUrl)) {
		repositoryUrl = repositoryUrl.replace(/^github:/i, 'https://github.com/');
	} else if (repositoryUrl && !repositoryUrl.startsWith('http')) {
		if (repositoryUrl.includes('/') && !repositoryUrl.includes(':')) {
			repositoryUrl = `https://github.com/${repositoryUrl}`;
		} else {
			repositoryUrl = '';
		}
	}

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
			stderr: 'pipe',
		});

		const timeout = setTimeout(() => {
			proc.kill();
		}, 45000);

		const exitCode = await proc.exited;
		clearTimeout(timeout);

		if (exitCode !== 0) {
			const errorMsg = await new Response(proc.stderr).text();
			throw new Error(`Failed to install package ${fullPkgName}: ${errorMsg.trim() || 'Unknown error'}`);
		}

		const pkgPath = join(tempDir, 'node_modules', ...name.split(/[/\\]/));
		if (!existsSync(join(pkgPath, 'package.json'))) {
			throw new Error(`Package metadata for "${name}" not found.`);
		}

		const pkgJson = await Bun.file(join(pkgPath, 'package.json')).json();
		return await analyzeLocalDirectory(pkgPath, pkgJson);

	} finally {
		try {
			spawn({ cmd: ['rm', '-rf', tempDir], stdout: 'ignore', stderr: 'ignore' });
		} catch (_e) {}
	}
}
