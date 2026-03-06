// biome-ignore lint/style/useNodejsImportProtocol: Bun-native path resolution required by user
import { join } from 'path';
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

/**
 * Core measurement logic for a directory (Approccio B).
 * Respects the 'files' field in package.json and excludes common noise.
 */
// biome-ignore lint/suspicious/noExplicitAny: package.json structure
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

	// Deterministic inclusion list based on 'files' field
	const includedPatterns: string[] = Array.isArray(pkgJson.files) ? pkgJson.files : ['**/*'];
	const includeList = new Set<string>();

	for (const pattern of includedPatterns) {
		const glob = new Bun.Glob(pattern);
		// scan is async and returns an iterator
		for await (const file of glob.scan({ cwd: pkgPath, onlyFiles: true })) {
			includeList.add(join(pkgPath, file));
		}
	}

	// Always include mandatory files as per npm docs
	const mandatoryGlob = new Bun.Glob('{package.json,README*,LICENSE*,LICENCE*,CHANGELOG*}');
	for await (const file of mandatoryGlob.scan({ cwd: pkgPath, onlyFiles: true })) {
		includeList.add(join(pkgPath, file));
	}

	// Scan all files in directory and filter
	const allFilesGlob = new Bun.Glob('**/*');
	for await (const relativePath of allFilesGlob.scan({ cwd: pkgPath, onlyFiles: true })) {
		const absolutePath = join(pkgPath, relativePath);

		// Implementation of Approccio B: if files field exists, only measure included files
		if (Array.isArray(pkgJson.files) && !includeList.has(absolutePath)) {
			continue;
		}

		// Hard exclusions (npm defaults)
		if (
			relativePath.includes('node_modules') ||
			relativePath.startsWith('.git/') ||
			relativePath === '.git' ||
			relativePath.includes('.bun/') ||
			relativePath.endsWith('bun.lock') ||
			relativePath.endsWith('package-lock.json') ||
			relativePath.endsWith('yarn.lock') ||
			relativePath.includes('__tests__/') ||
			relativePath.includes('test/') ||
			relativePath.includes('tests/') ||
			/\.(test|spec)\./.test(relativePath)
		) {
			continue;
		}

		await measureFile(absolutePath);
	}

	const repo = (typeof pkgJson.repository === 'string' ? pkgJson.repository : pkgJson.repository?.url) || '';
	const hasESM = !!(pkgJson.module || pkgJson.exports || pkgJson.type === 'module');
	const hasCJS = !!(pkgJson.main || !pkgJson.type || pkgJson.type === 'commonjs');
	const hasTypes = !!(pkgJson.types || pkgJson.typings || (await Bun.file(join(pkgPath, 'index.d.ts')).exists()));

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
		version: pkgJson.version || '0.0.0',
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
	// biome-ignore lint/complexity/useLiteralKeys: Bun.env bracket notation
	const tmpBase = Bun.env['TMP'] || Bun.env['TEMP'] || '/tmp';
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
		const pkgJsonFile = Bun.file(join(pkgPath, 'package.json'));
		if (!(await pkgJsonFile.exists())) {
			throw new Error(`Package metadata for "${name}" not found.`);
		}

		const pkgJson = await pkgJsonFile.json();
		return await analyzeLocalDirectory(pkgPath, pkgJson);

	} finally {
		try {
			await spawn({ cmd: ['rm', '-rf', tempDir] }).exited;
		} catch (_e) {}
	}
}
