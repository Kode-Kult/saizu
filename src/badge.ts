export type BadgeType = 'gzip' | 'install';

// Character width table for DejaVu Sans 11px — same as shields.io
// This gives pixel-accurate text widths matching real browser rendering
const WIDTHS: Record<string, number> = {
	' ': 3.3,
	'!': 4,
	'"': 5,
	'#': 8,
	$: 6,
	'%': 8,
	'&': 8,
	"'": 3,
	'(': 4,
	')': 4,
	'*': 6,
	'+': 8,
	',': 4,
	'-': 5,
	'.': 4,
	'/': 5,
	'0': 7,
	'1': 7,
	'2': 7,
	'3': 7,
	'4': 7,
	'5': 7,
	'6': 7,
	'7': 7,
	'8': 7,
	'9': 7,
	':': 4,
	';': 4,
	'<': 8,
	'=': 8,
	'>': 8,
	'?': 6,
	'@': 11,
	A: 8,
	B: 7,
	C: 7,
	D: 8,
	E: 6,
	F: 6,
	G: 8,
	H: 8,
	I: 3,
	J: 4,
	K: 7,
	L: 6,
	M: 9,
	N: 8,
	O: 8,
	P: 7,
	Q: 8,
	R: 7,
	S: 6,
	T: 6,
	U: 8,
	V: 8,
	W: 10,
	X: 7,
	Y: 6,
	Z: 7,
	'[': 4,
	'\\': 5,
	']': 4,
	'^': 8,
	_: 6,
	'`': 5,
	a: 6,
	b: 7,
	c: 5,
	d: 7,
	e: 6,
	f: 4,
	g: 7,
	h: 7,
	i: 3,
	j: 3,
	k: 6,
	l: 3,
	m: 10,
	n: 7,
	o: 7,
	p: 7,
	q: 7,
	r: 4,
	s: 5,
	t: 5,
	u: 7,
	v: 6,
	w: 9,
	x: 6,
	y: 6,
	z: 5,
	'{': 5,
	'|': 4,
	'}': 5,
	'~': 8,
};

function measureText(text: string): number {
	let w = 0;
	for (const ch of text) w += WIDTHS[ch] ?? 7;
	return w;
}

function textWidth(text: string): number {
	// Add 10px padding (5px each side) — same as shields.io
	return Math.round(measureText(text) + 10);
}

export function generateBadge(sizeInBytes: number, type: BadgeType = 'gzip'): string {
	const isMb = sizeInBytes > 900 * 1024;
	const value = isMb ? `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB` : `${(sizeInBytes / 1024).toFixed(1)} KB`;
	const color = getColor(sizeInBytes, type);
	const label = type === 'gzip' ? 'gzip size' : 'install size';

	const labelWidth = textWidth(label);
	const valueWidth = textWidth(value);
	const totalWidth = labelWidth + valueWidth;

	return `
<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20">
  <linearGradient id="b" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <mask id="a">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </mask>
  <g mask="url(#a)">
    <path fill="#555" d="M0 0h${labelWidth}v20H0z"/>
    <path fill="${color}" d="M${labelWidth} 0h${valueWidth}v20H${labelWidth}z"/>
    <path fill="url(#b)" d="M0 0h${totalWidth}v20H0z"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text x="${labelWidth + valueWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${value}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${value}</text>
  </g>
</svg>`.trim();
}

function getColor(sizeInBytes: number, type: BadgeType): string {
	const kb = sizeInBytes / 1024;
	const threshold1 = type === 'gzip' ? 50 : 500;
	const threshold2 = type === 'gzip' ? 200 : 2000;
	if (kb < threshold1) return '#4c1';
	if (kb < threshold2) return '#dfb317';
	return '#e05d44';
}
