import { spawn } from 'bun';
// biome-ignore lint/style/useNodejsImportProtocol: Bun-native path resolution required by user
import { join } from 'path';

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

// Hard exclusions — always applied regardless of pkg.files
const EXCLUDED_SEGMENTS = ['node_modules', '.git/', '.bun/', '__tests__/', 'test/', 'tests/'];
const EXCLUDED_PATTERNS = [/\.(test|spec)\.[a-z]+$/, /\.snap$/, /bun\.lock$/, /package-lock\.json$/, /yarn\.lock$/];

function isExcluded(relativePath: string): boolean {
	if (EXCLUDED_SEGMENTS.some((s) => relativePath.includes(s))) return true;
	if (EXCLUDED_PATTERNS.some((p) => p.test(relativePath))) return true;
	return false;
}

export async function analyzeLocalDirectory(
	pkgPath: string,
	// biome-ignore lint/suspicious/noExplicitAny: package.json structure is dynamic
	pkgJson: any,
	applyFiltered = true,
): Promise<AnalysisResult> {
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

			const basename = absolutePath.split(/[/\\]/).pop() ?? '';
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
			typeBreakdown[finalExt] = (typeBreakdown[finalExt] ?? 0) + sz;
		} catch (_e) {}
	};

	// Build includeSet from pkg.files if present
	let includeSet: Set<string> | null = null;
	if (applyFiltered && Array.isArray(pkgJson.files) && pkgJson.files.length > 0) {
		includeSet = new Set<string>();
		for (const pattern of pkgJson.files as string[]) {
			let pat = pattern;
			if (pat.startsWith('./')) pat = pat.slice(2);
			const isDir = pat.endsWith('/');
			const patternsToScan = isDir || pat.includes('*') ? [pat] : [pat, `${pat}/**/*`];

			for (const scanPat of patternsToScan) {
				const g = new Bun.Glob(scanPat);
				for await (const f of g.scan({ cwd: pkgPath, onlyFiles: true })) {
					includeSet.add(f.replace(/\\\\/g, '/'));
				}
			}
		}
		// Always include mandatory npm files
		const mandatoryGlob = new Bun.Glob('{package.json,README*,LICENSE*,LICENCE*,CHANGELOG*}');
		for await (const f of mandatoryGlob.scan({ cwd: pkgPath, onlyFiles: true })) {
			includeSet.add(f.replace(/\\\\/g, '/'));
		}
	}

	for await (const relativePath of new Bun.Glob('**/*').scan({ cwd: pkgPath, onlyFiles: true })) {
		const normalizedPath = relativePath.replace(/\\\\/g, '/');
		if (includeSet && !includeSet.has(normalizedPath)) continue;
		if (isExcluded(normalizedPath)) continue;
		await measureFile(join(pkgPath, relativePath));
	}

	const rawRepo = (typeof pkgJson.repository === 'string' ? pkgJson.repository : pkgJson.repository?.url) || '';
	let repositoryUrl = rawRepo.replace('git+', '').replace(/\.git$/, '');
	if (repositoryUrl.startsWith('git@')) {
		repositoryUrl = repositoryUrl.replace('git@', 'https://').replace(/(?<=https:\/\/[^/]+):/, '/');
	} else if (/^github:/i.test(repositoryUrl)) {
		repositoryUrl = repositoryUrl.replace(/^github:/i, 'https://github.com/');
	} else if (repositoryUrl && !repositoryUrl.startsWith('http')) {
		repositoryUrl =
			repositoryUrl.includes('/') && !repositoryUrl.includes(':') ? `https://github.com/${repositoryUrl}` : '';
	}

	const hasESM = !!(pkgJson.module || pkgJson.exports || pkgJson.type === 'module');
	const hasCJS = !!(pkgJson.main || !pkgJson.type || pkgJson.type === 'commonjs');
	const hasTypes = !!(pkgJson.types || pkgJson.typings || (await Bun.file(join(pkgPath, 'index.d.ts')).exists()));

	const rawLicense = pkgJson.license || pkgJson.licenses?.[0]?.type || '';
	const license = typeof rawLicense === 'string' ? rawLicense : ((rawLicense as { type?: string }).type ?? '');

	const allDeps = [
		...Object.keys((pkgJson.dependencies as Record<string, string>) || {}),
		...Object.keys((pkgJson.peerDependencies as Record<string, string>) || {}),
		...Object.keys((pkgJson.optionalDependencies as Record<string, string>) || {}),
	];

	return {
		packageName: pkgJson.name as string,
		version: (pkgJson.version as string) || '0.0.0',
		license,
		uncompressedSize: totalUncompressedSize,
		gzipSize: totalGzipSize,
		fileCount,
		dependencies: Array.from(new Set(allDeps)),
		description: (pkgJson.description as string) || '',
		repository: repositoryUrl,
		homepage: (pkgJson.homepage as string) || '',
		hasESM,
		hasCJS,
		hasTypes,
		typeBreakdown,
	};
}

export async function analyzePackage(name: string, version?: string): Promise<AnalysisResult> {
	const id = crypto.randomUUID();
	// biome-ignore lint/complexity/useLiteralKeys: Bun.env bracket notation
	const tmpBase = Bun.env['TMP'] || Bun.env['TEMP'] || '/tmp';
	const tempDir = join(tmpBase, `pkgsize-${id}`);
	const fullPkgName = version ? `${name}@${version}` : name;

	try {
		const { mkdir } = await import('node:fs/promises');
		await mkdir(tempDir, { recursive: true });
		await Bun.write(join(tempDir, 'package.json'), JSON.stringify({ name: 'temp-analysis', private: true }));

		const proc = spawn({
			cmd: ['bun', 'add', fullPkgName],
			cwd: tempDir,
			stdout: 'ignore',
			stderr: 'pipe',
		});

		const timeout = setTimeout(() => proc.kill(), 45000);
		const exitCode = await proc.exited;
		clearTimeout(timeout);

		if (exitCode !== 0) {
			const errorMsg = await new Response(proc.stderr).text();
			throw new Error(`Failed to install package ${fullPkgName}: ${errorMsg.trim() || 'Unknown error'}`);
		}

		const pkgPath = join(tempDir, 'node_modules', ...name.split(/[/\\]/));
		const pkgJsonFile = Bun.file(join(pkgPath, 'package.json'));
		if (!(await pkgJsonFile.exists())) {
			throw new Error(`Package metadata for "${name}" not found.`);
		}

		const pkgJson = await pkgJsonFile.json();
		return await analyzeLocalDirectory(pkgPath, pkgJson, false);
	} finally {
		try {
			const { rm } = await import('node:fs/promises');
			await rm(tempDir, { recursive: true, force: true });
		} catch (_e) {}
	}
}
