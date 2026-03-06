import { Hono } from 'hono';
import { getGitHubStars } from '../github';

const ui = new Hono();
function minifyCSS(css: string): string {
	return css
		.replace(/\/\*[\s\S]*?\*\//g, '') // remove comments
		.replace(/\s*([{}:;,>~+])\s*/g, '$1') // remove spaces around symbols
		.replace(/;\}/g, '}') // remove last ; in block
		.replace(/\s+/g, ' ') // collapse multiple spaces
		.replace(/: /g, ':') // remove space after :
		.trim();
}

function minifyJS(js: string): string {
	return js; // Deactivated minifier for JS as it was causes syntax errors.
}

// FIX: ridotto da 6 a 3 varianti Outfit (400/600/900).
// Risparmio: ~45KB di font eliminati.
// Se in futuro hai bisogno di 500/700/800, aggiungili qui e nei <link rel="preload">.
const fontsCSS = `
@font-face {
  font-family: 'Outfit';
  src: url('/fonts/Outfit-normal-400.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: optional;
}
@font-face {
  font-family: 'Outfit';
  src: url('/fonts/Outfit-normal-600.woff2') format('woff2');
  font-weight: 600;
  font-style: normal;
  font-display: optional;
}
@font-face {
  font-family: 'Outfit';
  src: url('/fonts/Outfit-normal-700.woff2') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: optional;
}
@font-face {
  font-family: 'Outfit';
  src: url('/fonts/Outfit-normal-900.woff2') format('woff2');
  font-weight: 900;
  font-style: normal;
  /* FIX CLS: 'optional' invece di 'swap' per i font hero above-the-fold.
     Il browser usa il fallback system font se il woff2 non è pronto al primo render,
     evitando il layout shift da FOUT. Il font viene comunque cachato per le visite successive. */
  font-display: optional;
}
@font-face {
  font-family: 'JetBrains Mono';
  src: url('/fonts/JetBrains-Mono-normal-600.woff2') format('woff2');
  font-weight: 600;
  font-style: normal;
  font-display: optional;
}
`;

const rawCriticalCSS = `
    :root {
        --bg: #0a0a0a;
        --surface: #111113;
        --border: rgba(255, 255, 255, 0.08);
        --text: #ffffff;
        --text-muted: #888888;
        --pink: #f472b6;
        --pink-light: #f9a8d4;
        --blue: #3b82f6;
        --green: #10b981;
        --font-main: 'Outfit', sans-serif;
        --font-mono: 'JetBrains Mono', monospace;
    }

    * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }

    body {
        font-family: var(--font-main);
        background-color: var(--bg);
        color: var(--text);
        margin: 0;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        overflow-x: hidden;
    }

    .page-content {
        flex: 1;
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .bg-overlay {
        position: fixed;
        top: 0; bottom: 0; left: 0; right: 0;
        background-image: url('/hero.avif');
        background-size: cover;
        background-position: center;
        opacity: 0.1;
        z-index: -1;
        pointer-events: none;
    }

    nav {
        width: 100%;
        height: 64px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 40px;
        border-bottom: 1px solid var(--border);
        background: rgba(0,0,0,0.8);
        backdrop-filter: blur(12px);
        position: sticky;
        top: 0;
        z-index: 100;
    }

    .logo { display: flex; align-items: center; gap: 12px; font-weight: 900; font-size: 1.5rem; letter-spacing: -0.04em; color: white; text-transform: uppercase; text-decoration: none; cursor: pointer; }
    .logo svg { filter: drop-shadow(0 0 12px rgba(244,114,182,0.4)); }

    .nav-right { display: flex; align-items: center; gap: 12px; }

    /* GitHub Stars Button */
    @keyframes sparkle-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
    }
    .gh-stars-btn {
        position: relative;
        display: inline-flex; align-items: center; gap: 7px;
        background: linear-gradient(to bottom, #fde047, #f59e0b, #eab308);
        color: #000; text-decoration: none;
        padding: 7px 16px; border-radius: 100px;
        font-size: 0.82rem; font-weight: 800;
        letter-spacing: 0.01em;
        box-shadow: inset 0 0 0 2px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.35);
        transition: all 0.2s;
        white-space: nowrap;
    }
    .gh-stars-btn:hover {
        transform: translateY(-1px) scale(1.03);
        box-shadow: inset 0 0 0 2px rgba(0,0,0,0.15), 0 0 20px rgba(245,158,11,0.4), 0 4px 16px rgba(0,0,0,0.3);
    }
    .gh-stars-btn:active { transform: scale(0.98); }
    .gh-stars-btn .gh-icon {
        background: #000; border-radius: 50%; padding: 3px;
        display: flex; align-items: center; justify-content: center;
    }
    .gh-stars-btn .gh-count {
        font-size: 0.82rem; font-weight: 900; letter-spacing: 0.02em;
    }
    /* Sparkle stars */
    .gh-sparkles { position: absolute; inset: 0; overflow: visible; pointer-events: none; }
    .gh-sparkles svg { position: absolute; fill: currentColor; }
    .gh-spark-1 { left: -4px; top: -4px; width: 10px; height: 10px; color: #fef9c3; filter: drop-shadow(0 0 5px rgba(255,255,200,0.9)); animation: sparkle-pulse 1.6s ease-in-out infinite; animation-delay: 0.2s; }
    .gh-spark-2 { right: 3px; top: -7px; width: 9px; height: 9px; color: #fffbeb; filter: drop-shadow(0 0 5px rgba(255,255,220,0.95)); animation: sparkle-pulse 1.9s ease-in-out infinite; animation-delay: 0.7s; }
    .gh-spark-3 { right: -5px; bottom: -4px; width: 12px; height: 12px; color: #fef08a; filter: drop-shadow(0 0 7px rgba(255,255,180,0.85)); animation: sparkle-pulse 2.2s ease-in-out infinite; animation-delay: 1.1s; }
    /* Hover shimmer beam */
    .gh-shimmer { position: absolute; inset: 0; overflow: hidden; border-radius: 100px; pointer-events: none; }
    .gh-shimmer-beam {
        position: absolute; left: -40px; right: -40px; top: -24px;
        height: 40px; transform: rotate(12deg);
        background: rgba(255,255,255,0.4); filter: blur(8px);
        opacity: 0; transition: opacity 0.5s;
    }
    .gh-stars-btn:hover .gh-shimmer-beam { opacity: 0.4; }

    .support-btn {
        display: flex; align-items: center; gap: 7px;
        background: linear-gradient(135deg, #ff6b9d, #f472b6, #c084fc);
        color: white; text-decoration: none;
        padding: 8px 18px; border-radius: 100px;
        font-size: 0.82rem; font-weight: 800;
        letter-spacing: 0.01em;
        box-shadow: 0 0 20px rgba(244,114,182,0.35), 0 2px 8px rgba(0,0,0,0.3);
        transition: all 0.2s;
        white-space: nowrap;
    }
    .support-btn:hover {
        transform: translateY(-1px) scale(1.03);
        box-shadow: 0 0 28px rgba(244,114,182,0.55), 0 4px 16px rgba(0,0,0,0.3);
    }
    .support-btn:active { transform: scale(0.98); }
    .support-btn svg { flex-shrink: 0; filter: drop-shadow(0 0 4px rgba(255,255,255,0.4)); }

    .container {
        width: 100%;
        max-width: 1030px;
        padding: 60px 24px;
    }

    header { text-align: left; margin-bottom: 40px; }
    h1 { font-size: 3rem; font-weight: 900; margin: 0 0 24px; letter-spacing: -0.05em; line-height: 1.1; }
    h1 .saizu-logo-text { height: 1em; width: auto; vertical-align: baseline; position: relative; top: 0.05em; }

    .search-row { display: flex; gap: 12px; margin-bottom: 40px; }
    .input-wrapper { flex: 1; position: relative; }
    input {
        width: 100%;
        background: rgba(255,255,255,0.03);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 14px 20px;
        color: white;
        font-size: 1.1rem;
        font-weight: 600;
        outline: none;
        transition: all 0.2s;
    }
    input:focus { border-color: var(--pink); background: rgba(255,255,255,0.06); box-shadow: 0 0 0 4px rgba(255,64,172,0.1); }

    .btn-primary {
        background: white;
        color: black;
        border: none;
        padding: 12px 30px;
        border-radius: 12px;
        font-weight: 700;
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
    }
    .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(255,255,255,0.1); }
    .btn-primary:disabled { opacity: 0.5; transform: none; cursor: not-allowed; }

    .loading-line { display: none; position: fixed; top: 64px; left: 0; width: 100%; height: 2px; overflow: hidden; background: rgba(255,64,172,0.1); z-index: 1000; }
    .loading-line::after { content: ''; position: absolute; height: 100%; background: var(--pink); box-shadow: 0 0 10px var(--pink); left: -100%; width: 100%; animation: load 1.5s infinite linear; }
    @keyframes load { 0% { left: -100%; } 100% { left: 100%; } }

    /* FIX CLS: riserva l'altezza del paragrafo hero prima che il font carichi,
       impedisce il layout shift da FOUT (contribuiva 0.374 di CLS score). */
    .hero-desc {
        color: var(--text-muted);
        font-size: 1.1rem;
        max-width: 800px;
        line-height: 1.5;
        margin-top: 12px;
        min-height: 3.3rem;
    }

    /* Mobile nav: critical path responsive rules */
    @media (max-width: 680px) {
        nav { padding: 0 16px; height: 56px; }
        .logo { font-size: 1.2rem; gap: 8px; }
        .logo img { width: 26px; height: 26px; }
        .nav-right { gap: 6px; }
        .gh-stars-btn { padding: 5px 10px; font-size: 0.72rem; gap: 5px; }
        .gh-stars-btn .gh-icon { padding: 2px; }
        .gh-stars-btn .gh-icon svg { width: 12px; height: 12px; }
        .gh-label { display: none; }
        .support-btn { padding: 6px 10px; font-size: 0.72rem; gap: 5px; }
        .support-btn svg { width: 12px; height: 12px; }
        .support-text { display: none; }
    }

    /* Anti-FOUC: hide result sections immediately (before deferred CSS loads) */
    .pkg-main-card, .install-size-viz, #compareResults { display: none; }
`;

const rawDeferredCSS = `
    .mode-tabs {
        display: inline-flex;
        background: rgba(255,255,255,0.04);
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 4px;
        gap: 4px;
        margin-bottom: 36px;
    }
    .mode-tab {
        padding: 8px 22px;
        border-radius: 10px;
        font-weight: 700;
        font-size: 0.9rem;
        cursor: pointer;
        border: none;
        background: transparent;
        color: var(--text-muted);
        transition: all 0.2s;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .mode-tab.active {
        background: white;
        color: black;
    }
    .mode-tab:not(.active):hover { color: white; background: rgba(255,255,255,0.08); }

    .compare-inputs {
        display: none;
        gap: 16px;
        margin-bottom: 40px;
        align-items: center;
    }
    .compare-inputs.visible { display: flex; }
    .vs-divider {
        font-size: 0.85rem;
        font-weight: 900;
        color: var(--text-muted);
        letter-spacing: 0.08em;
        flex-shrink: 0;
        padding: 0 4px;
    }

    .install-size-viz { display: none; margin-bottom: 40px; border-top: 1px solid var(--border); padding-top: 30px; }
    .viz-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 16px; }
    .viz-title { font-size: 1.8rem; font-weight: 800; display: flex; align-items: center; gap: 10px; }
    .viz-stats { color: var(--text-muted); font-size: 1.4rem; font-weight: 500; }
    .viz-stats b { color: white; }

    .distribution-bar {
        height: 28px; border-radius: 8px; display: flex; overflow: hidden;
        background: rgba(255,255,255,0.05); margin-bottom: 10px; gap: 2px;
    }
    .bar-segment {
        height: 100%; transition: width 0.5s ease, opacity 0.2s;
        position: relative; border-radius: 4px; cursor: default;
        flex-shrink: 0;
    }
    .bar-segment:hover { opacity: 0.85; }

    /* Tooltip */
    .bar-segment::after {
        content: attr(data-tip);
        position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%);
        background: #1a1a1f; border: 1px solid var(--border); color: white;
        font-size: 0.72rem; font-weight: 700; padding: 4px 10px; border-radius: 6px;
        white-space: nowrap; pointer-events: none; opacity: 0; transition: opacity 0.15s;
        z-index: 10;
    }
    .bar-segment:hover::after { opacity: 1; }

    /* Legend */
    .bar-legend {
        display: flex; flex-wrap: wrap; gap: 8px 16px; margin-top: 4px;
    }
    .bar-legend-item {
        display: flex; align-items: center; gap: 6px;
        font-size: 0.72rem; font-weight: 700; color: var(--text-muted);
        cursor: default;
    }
    .bar-legend-dot { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }

    .pkg-main-card { display: none; background: var(--surface); border: 1px solid var(--border); border-radius: 20px; padding: 40px; margin-bottom: 40px; box-shadow: 0 20px 60px rgba(0,0,0,0.5); position: relative; overflow: hidden; }



    .pkg-info-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
    .pkg-name-display { font-size: 2rem; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 8px; }
    .pkg-meta { color: var(--text-muted); font-size: 0.95rem; display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
    .pkg-tag { color: #f472b6; font-weight: 600; border: 1px solid rgba(244,63,94,0.3); padding: 2px 8px; border-radius: 6px; font-size: 0.8rem; }
    .pkg-desc { color: var(--text-muted); line-height: 1.6; font-size: 1.05rem; margin: 16px 0; }

    .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 24px; }
    .s-box { padding: 16px; border-radius: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); }
    .s-label { font-size: 0.75rem; font-weight: 700; color: #555; text-transform: uppercase; display: block; margin-bottom: 4px; }
    .s-value { font-size: 1.25rem; font-weight: 800; }
    .s-value span { font-size: 0.8rem; color: #444; margin-left: 2px; }

    .dl-bars { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
    .dl-bar-row { display: flex; align-items: center; gap: 8px; }
    .dl-bar-track { flex: 1; height: 8px; background: rgba(255,255,255,0.06); border-radius: 2px; overflow: hidden; }
    .dl-bar-fill { height: 100%; border-radius: 2px; transition: width 0.4s ease; }
    .dl-bar-label { font-size: 0.7rem; color: #666; min-width: 32px; }
    .dl-bar-value { font-size: 0.7rem; color: white; font-weight: 600; font-family: var(--font-mono); min-width: 45px; text-align: right; }

    .capability-row { display: flex; gap: 20px; margin-top: 24px; border-top: 1px solid var(--border); padding-top: 24px; }
    .cap-item { display: flex; align-items: center; gap: 6px; font-size: 0.9rem; font-weight: 600; color: var(--text-muted); }
    .cap-item.active { color: #10b981; }

    .badge-section { margin-top: 32px; padding-top: 24px; border-top: 1px dashed var(--border); }
    .badge-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: stretch; }
    .badge-item { background: rgba(255,255,255,0.03); padding: 20px; border-radius: 12px; border: 1px solid var(--border); display: flex; flex-direction: column; align-items: center; gap: 12px; }
    code {
        width: 100%; background: #111; padding: 12px; border-radius: 8px;
        font-family: var(--font-mono); font-size: 0.75rem; color: var(--pink);
        border: 1px solid var(--border); cursor: pointer; word-break: break-all; text-align: left;
        flex: 1; display: flex; align-items: flex-start;
    }
    .badge-fmt-tabs {
        display: flex; gap: 4px; width: 100%;
    }
    .badge-fmt-btn {
        flex: 1; padding: 5px 0; border-radius: 6px; border: 1px solid var(--border);
        background: transparent; color: var(--text-muted); font-size: 0.7rem; font-weight: 700;
        cursor: pointer; transition: all 0.15s; font-family: var(--font-main);
        text-transform: uppercase; letter-spacing: 0.04em;
    }
    .badge-fmt-btn.active { background: white; color: black; border-color: white; }
    .badge-fmt-btn:not(.active):hover { background: rgba(255,255,255,0.08); color: white; }
    .badge-copy-hint {
        font-size: 0.65rem; color: #444; text-align: center; margin-top: -4px;
        font-family: var(--font-mono);
    }

    #compareResults { display: none; }

    .compare-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 32px;
        padding-bottom: 24px;
        border-bottom: 1px solid var(--border);
    }
    .compare-title {
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--text-muted);
        display: flex;
        align-items: center;
        gap: 12px;
    }
    .compare-title .pkg-pill {
        background: rgba(255,255,255,0.06);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 4px 12px;
        color: white;
        font-family: var(--font-mono);
        font-size: 0.85rem;
    }

    .compare-columns {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-bottom: 32px;
    }
    .cmp-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 20px;
        padding: 28px;
        position: relative;
        overflow: hidden;
        transition: border-color 0.3s;
    }
    .cmp-card.winner { border-color: rgba(16,185,129,0.4); }
    .cmp-card.loser { opacity: 0.7; }

    .winner-badge {
        display: none;
        position: absolute;
        top: 16px;
        right: 16px;
        background: #10b981;
        color: white;
        font-size: 0.7rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        padding: 4px 10px;
        border-radius: 6px;
    }
    .cmp-card.winner .winner-badge { display: block; }

    .cmp-name { font-size: 1.3rem; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 6px; font-family: var(--font-mono); }
    .cmp-version { color: var(--text-muted); font-size: 0.85rem; font-weight: 600; margin-bottom: 16px; }
    .cmp-desc { color: var(--text-muted); font-size: 0.88rem; line-height: 1.5; margin-bottom: 20px; min-height: 42px; }

    .cmp-stat-row { display: flex; flex-direction: column; gap: 10px; }
    .cmp-stat {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }
    .cmp-stat-header { display: flex; justify-content: space-between; align-items: baseline; }
    .cmp-stat-name { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; color: #555; letter-spacing: 0.06em; }
    .cmp-stat-value { font-size: 1rem; font-weight: 800; }
    .cmp-stat-value.better { color: #10b981; }
    .cmp-stat-value.worse { color: #f472b6; }

    .cmp-fill-track {
        height: 4px;
        background: rgba(255,255,255,0.06);
        border-radius: 2px;
        overflow: hidden;
    }
    .cmp-fill-bar {
        height: 100%;
        border-radius: 2px;
        transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
        background: var(--pink);
    }
    .cmp-fill-bar.better { background: #10b981; }
    .cmp-fill-bar.worse { background: #f472b6; }

    .cmp-caps {
        display: flex;
        gap: 8px;
        margin-top: 20px;
        padding-top: 16px;
        border-top: 1px solid var(--border);
        flex-wrap: wrap;
    }
    .cmp-cap {
        font-size: 0.78rem;
        font-weight: 700;
        padding: 3px 10px;
        border-radius: 6px;
        border: 1px solid;
    }
    .cmp-cap.has { color: #10b981; border-color: rgba(16,185,129,0.3); background: rgba(16,185,129,0.08); }
    .cmp-cap.no { color: #444; border-color: rgba(255,255,255,0.06); background: transparent; text-decoration: line-through; }

    .compare-diff-section {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 20px;
        padding: 32px;
        margin-bottom: 32px;
    }
    .diff-title { font-size: 1rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 24px; }

    .diff-metric { margin-bottom: 28px; }
    .diff-metric:last-child { margin-bottom: 0; }
    .diff-metric-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .diff-metric-name { font-size: 0.85rem; font-weight: 700; color: white; }
    .diff-delta {
        font-size: 0.82rem;
        font-weight: 800;
        padding: 3px 10px;
        border-radius: 6px;
    }
    .diff-delta.positive { background: rgba(16,185,129,0.15); color: #10b981; }
    .diff-delta.negative { background: rgba(244,63,94,0.12); color: #f472b6; }
    .diff-delta.neutral { background: rgba(255,255,255,0.06); color: #888; }

    .h2h-bar-wrap {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    .h2h-label { font-size: 0.78rem; font-weight: 700; color: var(--text-muted); width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--font-mono); }
    .h2h-label.right { text-align: right; }
    .h2h-track {
        flex: 1;
        height: 10px;
        background: rgba(255,255,255,0.05);
        border-radius: 5px;
        opacity: .7;
        overflow: hidden;
        display: flex;
    }
    .h2h-fill-a {
        height: 100%;
        border-radius: 5px 0 0 5px;
        transition: width 0.7s cubic-bezier(0.22, 1, 0.36, 1);
    }
    .h2h-fill-b {
        height: 100%;
        border-radius: 0 5px 5px 0;
        transition: width 0.7s cubic-bezier(0.22, 1, 0.36, 1);
    }

    .verdict-box {
        border-radius: 16px;
        padding: 24px 28px;
        border: 1px solid;
        display: flex;
        align-items: center;
        gap: 20px;
        margin-bottom: 40px;
    }
    .verdict-icon { font-size: 2.5rem; flex-shrink: 0; }
    .verdict-text-wrap { flex: 1; }
    .verdict-headline { font-size: 1.1rem; font-weight: 800; margin-bottom: 4px; }
    .verdict-body { color: var(--text-muted); font-size: 0.9rem; line-height: 1.5; }

    footer {
        margin-top: auto;
        padding: 32px 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-top: 1px solid var(--border);
        color: #444;
        font-weight: 500;
        font-size: 0.85rem;
        width: 100%;
        background: rgba(0,0,0,0.6);
        backdrop-filter: blur(12px);
        z-index: 10;
    }

    /* ── Dependencies list ── */
    .deps-section { margin-top: 28px; padding-top: 24px; border-top: 1px solid var(--border); }
    .deps-title { font-size: 0.75rem; font-weight: 700; color: #555; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 14px; display: block; }
    .dep-list { display: flex; flex-direction: column; gap: 8px; }
    .dep-row {
        display: flex; align-items: center; justify-content: space-between;
        background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);
        border-radius: 10px; padding: 10px 16px;
        cursor: pointer; transition: all 0.15s; text-decoration: none; color: inherit;
    }
    .dep-row:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.12); transform: translateX(2px); }
    .dep-name { font-family: var(--font-mono); font-size: 0.9rem; font-weight: 600; color: white; }
    .dep-inspect {
        display: flex; align-items: center; gap: 6px;
        font-size: 0.75rem; font-weight: 700; color: var(--pink);
        opacity: 0; transition: opacity 0.15s;
    }
    .dep-row:hover .dep-inspect { opacity: 1; }
    .dep-inspect svg { flex-shrink: 0; }

    @media (max-width: 680px) {
        .compare-columns { grid-template-columns: 1fr; }
        h1 { font-size: 2rem; }
        .compare-inputs { flex-direction: column; }
        .vs-divider { align-self: center; }
        .stats-row { grid-template-columns: 1fr 1fr; }
        .gh-stars-btn { padding: 6px 12px; font-size: 0.75rem; }
        .gh-stars-btn .gh-count { font-size: 0.75rem; }
    }
`;

export const criticalCSS = minifyCSS(fontsCSS + rawCriticalCSS);
export const deferredCSS = minifyCSS(rawDeferredCSS);

// Cache-busting: generate a short content hash for the deferred CSS URL
const cssHash = new Bun.CryptoHasher('md5').update(deferredCSS).digest('hex').slice(0, 8);
export const deferredCSSPath = `/css/deferred.css?v=${cssHash}`;

const rawJS = `
        // ── CONSTANTS ──
        const COLORS = { js: '#fcd34d', ts: '#3b82f6', json: '#22c55e', dts: '#8b5cf6', cjs: '#c95c57', map: '#8e8eb8', md: '#2dd4bf', mjs: '#ba8e00', cts: '#81bdc7', css: '#e879f9', html: '#f97316', yml: '#ef4444', yaml: '#ef4444', txt: '#a3a3a3', xml: '#06b6d4', sh: '#84cc16', svg: '#fb923c', wasm: '#7c3aed', lock: '#6b7280', other: '#3f3f46' };
        const COLOR_A = '#f472b6';
        const COLOR_B = '#3b82f6';

        // ── UTILITIES ──
        function authorName(name) {
            return name.split('/')[0].replace('@', '');
        }
        function formatSize(bytes) {
            const kb = bytes / 1024;
            if (kb > 900) return \`<b>\${(kb / 1024).toFixed(1)}</b><span>MB</span>\`;
            return \`<b>\${kb.toFixed(1)}</b><span>KB</span>\`;
        }
        function fmtShort(bytes) {
            const kb = bytes / 1024;
            if (kb > 900) return (kb / 1024).toFixed(1) + ' MB';
            return kb.toFixed(1) + ' KB';
        }
        function pctDiff(a, b) {
            if (b === 0) return '+∞%';
            const d = ((a - b) / b * 100);
            return (d >= 0 ? '+' : '') + d.toFixed(1) + '%';
        }
        function loader(show) {
            document.getElementById('loader').style.display = show ? 'block' : 'none';
        }
        function classifyInput(raw) {
            const trimmed = raw.trim();
            const isGithub = /^[a-zA-Z0-9_.-]+\\/[a-zA-Z0-9_.-]+$/.test(trimmed);
            if (isGithub) return { type: 'github', value: trimmed };
            return { type: 'npm', value: trimmed };
        }

        // ── MODE SWITCHING ──
        let currentMode = 'analyze';
        function switchMode(mode) {
            currentMode = mode;
            document.getElementById('tabAnalyze').classList.toggle('active', mode === 'analyze');
            document.getElementById('tabCompare').classList.toggle('active', mode === 'compare');
            document.getElementById('analyzeMode').style.display = mode === 'analyze' ? 'block' : 'none';
            document.getElementById('compareMode').style.display = mode === 'compare' ? 'block' : 'none';
        }

        // ── ANALYZE MODE ──
        const btn = document.getElementById('searchBtn');
        const input = document.getElementById('pkgInput');
        const viz = document.getElementById('vizContainer');
        const card = document.getElementById('pkgResult');


        async function analyze(pushHistory = true) {
            const raw = input.value.trim();
            if (!raw) return;
            const classified = classifyInput(raw);
            
            if (pushHistory) history.pushState({ pkg: raw, mode: 'analyze' }, '', '/?pkg=' + encodeURIComponent(raw));
            btn.disabled = true;
            loader(true);
            try {
                let url;
                if (classified.type === 'github') {
                    const [owner, repo] = classified.value.split('/');
                    url = \`/api/v1/repo/\${owner}/\${repo}\`;
                    const params = new URLSearchParams(window.location.search);
                    if (params.has('subpath')) url += '?subpath=' + params.get('subpath');
                } else {
                    url = \`/api/v1/package/\${classified.value}\`;
                }

                const res = await fetch(url);
                const data = await res.json();
                if (data.error) {
                    if (data.error === 'MONOREPO_ROOT') {
                        throw new Error(\`Monorepo root. Try: \${data.workspaces[0] || 'subpath'}\`);
                    }
                    throw new Error(data.message || data.error);
                }
                renderResults(data, raw);
            } catch (err) {
                alert('Analysis Error: ' + err.message);
            } finally {
                btn.disabled = false;
                loader(false);
            }
        }

        function renderResults(data, query) {
            viz.style.display = 'block';
            card.style.display = 'block';

            const totalDisplay = data.installSize > (900 * 1024) ? (data.installSize / (1024 * 1024)).toFixed(1) + 'MB' : (data.installSize / 1024).toFixed(1) + 'KB';
            document.getElementById('vizSummary').innerHTML = \`<b>\${totalDisplay}</b> / 1 package\`;

            document.getElementById('resName').textContent = data.packageName;
            const version = (data.packageVersion === '0.0.0' || !data.packageVersion) ? '(unreleased)' : 'v' + data.packageVersion;
            document.getElementById('resVersion').textContent = version;
            
            const author = data.source === 'github' ? data.owner : authorName(data.packageName);
            document.getElementById('resAuthor').textContent = author;
            
            let desc = data.description || "A powerful library analyzed with Bun.";
            if (data.source === 'github' && data.commit) {
                desc = \`<span style="color:var(--pink); font-family:var(--font-mono); font-size:0.85em; background:rgba(244,114,182,0.1); padding:2px 6px; border-radius:4px; margin-right:8px">\${data.branch} @ \${data.commit}</span>\` + desc;
            }
            if (data.source === 'github' && data.npmComparison?.available) {
                const comp = data.npmComparison;
                const signG = comp.gzipDelta >= 0 ? '+' : '';
                const signI = comp.installDelta >= 0 ? '+' : '';
                desc += \`<div style="margin-top:12px; font-size:0.85em; color:var(--text-muted); padding:8px 12px; background:rgba(255,255,255,0.03); border-radius:8px; border:1px solid var(--border)">
                    vs npm \${comp.publishedVersion} &nbsp; 
                    <span style="color:\${comp.gzipDelta > 0 ? 'var(--pink)' : 'var(--green)'}">↑ \${signG}\${fmtShort(comp.gzipDelta)} gzip</span> &nbsp; 
                    <span style="color:\${comp.installDelta > 0 ? 'var(--pink)' : 'var(--green)'}">↑ \${signI}\${fmtShort(comp.installDelta)} install</span>
                </div>\`;
            }

            document.getElementById('resDesc').innerHTML = desc;
            document.getElementById('resLicense').textContent = data.license || 'N/A';

            // Download time calculation (based on gzip size)
            // Bandwidth: 4G=7MB/s, WiFi=20MB/s, Gigabit=125MB/s
            function calcDl(bytes, bps) {
                const ms = (bytes / bps) * 1000;
                if (ms < 1) return { val: '<1', unit: 'ms' };
                if (ms < 1000) return { val: ms.toFixed(0), unit: 'ms' };
                return { val: (ms / 1000).toFixed(1), unit: 's' };
            }
            const dl4g = calcDl(data.gzipSize, 7 * 1024 * 1024);
            const dlWifi = calcDl(data.gzipSize, 20 * 1024 * 1024);
            const dlGbit = calcDl(data.gzipSize, 125 * 1024 * 1024);
            function toMs(dl) { return dl.unit === 's' ? parseFloat(dl.val) * 1000 : parseFloat(dl.val); }
            const times = [toMs(dl4g), toMs(dlWifi), toMs(dlGbit)];
            const maxTime = Math.max(...times);
            document.getElementById('dlBar4g').style.width = (times[0] / maxTime * 100) + '%';
            document.getElementById('dlBarWifi').style.width = (times[1] / maxTime * 100) + '%';
            document.getElementById('dlBarGbit').style.width = (times[2] / maxTime * 100) + '%';
            document.getElementById('dlVal4g').textContent = dl4g.val + dl4g.unit;
            document.getElementById('dlValWifi').textContent = dlWifi.val + dlWifi.unit;
            document.getElementById('dlValGbit').textContent = dlGbit.val + dlGbit.unit;
            document.getElementById('resGzip').innerHTML = formatSize(data.gzipSize);
            document.getElementById('resTotal').innerHTML = formatSize(data.installSize);
            const deps = Array.isArray(data.dependencies) ? data.dependencies : [];
            document.getElementById('resDepsCount').textContent = deps.length;
            document.getElementById('resFiles').innerHTML = \`<b>\${data.fileCount || '--'}</b>\`;

            const depList = document.getElementById('depList');
            depList.innerHTML = '';
            document.getElementById('depsSection').style.display = deps.length > 0 ? 'block' : 'none';
            deps.forEach(dep => {
                const a = document.createElement('a');
                a.className = 'dep-row';
                a.href = \`/?pkg=\${encodeURIComponent(dep)}\`;
                a.title = \`Analyze \${dep}\`;
                a.innerHTML = \`
                    <span class="dep-name">\${dep}</span>
                    <span class="dep-inspect">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        Inspect
                    </span>
                \`;
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    document.getElementById('pkgInput').value = dep;
                    analyze();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                });
                depList.appendChild(a);
            });

            updateCap('capESM', data.hasESM);
            updateCap('capCJS', data.hasCJS);
            updateCap('capTypes', data.hasTypes);

            const repoArea = document.getElementById('resRepoArea');
            repoArea.innerHTML = data.repository ? \`<a href="\${data.repository}" target="_blank" style="color:white;opacity:0.4"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg></a>\` : '';

            const bar = document.getElementById('distBar');
            const legend = document.getElementById('barLegend');
            bar.innerHTML = '';
            legend.innerHTML = '';
            const breakdown = data.typeBreakdown || {};
            // Group into "other": tiny segments (<2%), unknown extensions (no dedicated color), or path-like keys
            let otherSize = 0;
            const entries = Object.entries(breakdown).sort((a,b) => b[1]-a[1]);
            const hasColor = (ext) => {
                const key = ext.startsWith('.') ? ext.slice(1) : ext;
                return key !== 'other' && COLORS[key] !== undefined;
            };
            const shown = entries.filter(([ext,size]) => size / data.installSize >= 0.02 && hasColor(ext) && !ext.includes("/") && ext.charCodeAt(0) !== 92);
            const hidden = entries.filter(([ext,size]) => (size / data.installSize < 0.02) || !hasColor(ext) || ext.includes("/") || ext.charCodeAt(0) === 92);
            hidden.forEach(([,size]) => otherSize += size);

            shown.forEach(([ext, size]) => {
                const pct = (size / data.installSize * 100).toFixed(1);
                const key = ext.startsWith('.') ? ext.slice(1) : ext;
                const color = COLORS[key] || COLORS.other;
                const seg = document.createElement('div');
                seg.className = 'bar-segment';
                seg.style.width = pct + '%';
                seg.style.backgroundColor = color;
                seg.setAttribute('data-tip', \`\${ext} · \${pct}% · \${(size/1024).toFixed(1)} KB\`);
                bar.appendChild(seg);

                const item = document.createElement('div');
                item.className = 'bar-legend-item';
                item.innerHTML = \`<span class="bar-legend-dot" style="background:\${color}"></span>\${ext} <span style="color:#666">\${pct}%</span>\`;
                legend.appendChild(item);
            });

            if (otherSize > 0) {
                const pct = (otherSize / data.installSize * 100).toFixed(1);
                const seg = document.createElement('div');
                seg.className = 'bar-segment';
                seg.style.width = pct + '%';
                seg.style.backgroundColor = COLORS.other;
                seg.setAttribute('data-tip', \`other · \${pct}%\`);
                bar.appendChild(seg);

                const item = document.createElement('div');
                item.className = 'bar-legend-item';
                item.innerHTML = \`<span class="bar-legend-dot" style="background:\${COLORS.other}"></span>other <span style="color:#666">\${pct}%</span>\`;
                legend.appendChild(item);
            }

			const envUrl = "${Bun.env['" + "SAIZU_URL" + "'] || ''}";
			const baseUrl = envUrl || window.location.origin;
			const gzipUrl = \`\${baseUrl}/badge/\${query}?type=gzip\`;
			const installUrl = \`\${baseUrl}/badge/\${query}?type=install\`;
            document.getElementById('badgeGzip').src = gzipUrl;
            document.getElementById('badgeInstall').src = installUrl;
            // Store URLs globally for format switcher
            window._badgeUrls = { gzip: gzipUrl, install: installUrl };
            // Set default markdown format
            document.getElementById('codeGzip').textContent = \`![gzip size](\${gzipUrl})\`;
            document.getElementById('codeInstall').textContent = \`![install size](\${installUrl})\`;
            // Reset tabs to markdown
            document.querySelectorAll('.badge-fmt-btn').forEach(b => {
                b.classList.toggle('active', b.textContent === 'Markdown');
            });

            card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        function updateCap(id, active) {
            const el = document.getElementById(id);
            const label = el.getAttribute('data-label') || el.textContent.trim();
            if (!el.hasAttribute('data-label')) el.setAttribute('data-label', label);
            el.className = 'cap-item' + (active ? ' active' : '');
            const icon = active
                ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
                : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
            el.innerHTML = icon + ' ' + label;
        }

        [document.getElementById('codeGzip'), document.getElementById('codeInstall')].forEach(el => {
            el.onclick = function() {
                navigator.clipboard.writeText(this.textContent);
                this.style.color = '#fff';
                setTimeout(() => this.style.color = '', 500);
            };
        });

        function setBadgeFmt(type, fmt, btn) {
            const urls = window._badgeUrls;
            if (!urls) return;
            const url = type === 'gzip' ? urls.gzip : urls.install;
            const label = type === 'gzip' ? 'gzip size' : 'install size';
            const codeEl = document.getElementById(type === 'gzip' ? 'codeGzip' : 'codeInstall');

            if (fmt === 'md') {
                codeEl.textContent = \`![\${label}](\${url})\`;
            } else {
                codeEl.textContent = \`<img src="\${url}" alt="\${label}">\`;
            }

            // Update active tab within the same badge-item
            btn.closest('.badge-fmt-tabs').querySelectorAll('.badge-fmt-btn').forEach(b => {
                b.classList.toggle('active', b === btn);
            });
        }

        input.addEventListener('keypress', (e) => { if (e.key === 'Enter') analyze(); });

        // Handle browser back/forward
        window.addEventListener('popstate', (e) => {
            const state = e.state;
            if (!state) {
                // Back to home — hide results
                document.getElementById('vizContainer').style.display = 'none';
                document.getElementById('pkgResult').style.display = 'none';
                input.value = '';
            } else if (state.mode === 'analyze' && state.pkg) {
                input.value = state.pkg;
                analyze(false);
            }
        });

        // On page load, check URL params (e.g. /?pkg=discord.js)
        (function() {
            const params = new URLSearchParams(window.location.search);
            const pkg = params.get('pkg');
            if (pkg) {
                input.value = pkg;
                history.replaceState({ pkg, mode: 'analyze' }, '', window.location.href);
                analyze(false);
            } else {
                history.replaceState({ home: true }, '', window.location.pathname);
            }
        })();

        // ══════════════════════════════════════
        // COMPARE MODE
        // ══════════════════════════════════════
        const cmpBtn = document.getElementById('cmpBtn');
        const cmpInputA = document.getElementById('cmpInputA');
        const cmpInputB = document.getElementById('cmpInputB');

        async function runCompare() {
            const rawA = cmpInputA.value.trim();
            const rawB = cmpInputB.value.trim();
            if (!rawA || !rawB) return;

            cmpBtn.disabled = true;
            loader(true);

            try {
                const fetchTgt = async (raw) => {
                    const c = classifyInput(raw);
                    let url;
                    if (c.type === 'github') {
                        const [owner, repo] = c.value.split('/');
                        url = \`/api/v1/repo/\${owner}/\${repo}\`;
                    } else {
                        url = \`/api/v1/package/\${c.value}\`;
                    }
                    return fetch(url).then(r => r.json());
                };

                const [resA, resB] = await Promise.all([
                    fetchTgt(rawA),
                    fetchTgt(rawB),
                ]);

                if (resA.error) throw new Error(\`\${rawA}: \${resA.error}\`);
                if (resB.error) throw new Error(\`\${rawB}: \${resB.error}\`);

                renderCompare(resA, resB, rawA, rawB);
            } catch (err) {
                alert('Compare Error: ' + err.message);
            } finally {
                cmpBtn.disabled = false;
                loader(false);
            }
        }

        function renderCompare(a, b, qA, qB) {
            document.getElementById('compareResults').style.display = 'block';

            // Titles
            document.getElementById('cmpTitleA').textContent = a.packageName;
            document.getElementById('cmpTitleB').textContent = b.packageName;

            // Determine gzip winner (lower = better)
            const gzipWinnerA = a.gzipSize <= b.gzipSize;

            // Populate side cards
            populateCmpCard('A', a, b, gzipWinnerA);
            populateCmpCard('B', b, a, !gzipWinnerA);

            // Head-to-head bars
            renderH2H(a, b);

            // Verdict
            renderVerdict(a, b);

            document.getElementById('compareResults').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        function populateCmpCard(side, data, other, isWinner) {
            const s = side; // 'A' or 'B'
            document.getElementById('cmpName' + s).textContent = data.packageName;
            document.getElementById('cmpVersion' + s).textContent = 'v' + (data.packageVersion || data.version);
            document.getElementById('cmpDesc' + s).textContent = data.description || '';

            const statsEl = document.getElementById('cmpStats' + s);
            statsEl.innerHTML = '';

            const metrics = [
                { name: 'Gzip Size', valA: data.gzipSize, valB: other.gzipSize, fmt: fmtShort, lowerBetter: true },
                { name: 'Install Size', valA: data.installSize, valB: other.installSize, fmt: fmtShort, lowerBetter: true },
                { name: 'Dependencies', valA: data.dependencies.length, valB: other.dependencies.length, fmt: v => v + '', lowerBetter: true },
            ];

            const maxVal = { 
                0: Math.max(data.gzipSize, other.gzipSize), 
                1: Math.max(data.installSize, other.installSize), 
                2: Math.max(data.dependencies.length, other.dependencies.length) 
            };

            metrics.forEach((m, i) => {
                const better = m.lowerBetter ? m.valA <= m.valB : m.valA >= m.valB;
                const cls = m.valA === m.valB ? '' : (better ? 'better' : 'worse');
                const fillPct = maxVal[i] > 0 ? (m.valA / maxVal[i] * 100).toFixed(1) : 50;
                const fillCls = cls;

                const row = document.createElement('div');
                row.className = 'cmp-stat';
                row.innerHTML = \`
                    <div class="cmp-stat-header">
                        <span class="cmp-stat-name">\${m.name}</span>
                        <span class="cmp-stat-value \${cls}">\${m.fmt(m.valA)}</span>
                    </div>
                    <div class="cmp-fill-track">
                        <div class="cmp-fill-bar \${fillCls}" style="width:\${fillPct}%"></div>
                    </div>
                \`;
                statsEl.appendChild(row);
            });

            // Caps
            const capsEl = document.getElementById('cmpCaps' + s);
            capsEl.innerHTML = '';
            [['ESM', data.hasESM], ['CommonJS', data.hasCJS], ['Types', data.hasTypes]].forEach(([label, has]) => {
                const span = document.createElement('span');
                span.className = 'cmp-cap ' + (has ? 'has' : 'no');
                span.textContent = label;
                capsEl.appendChild(span);
            });

            // Winner styling
            const cardEl = document.getElementById('cmpCard' + s);
            cardEl.classList.toggle('winner', isWinner);
            cardEl.classList.toggle('loser', !isWinner);
        }

        function renderH2H(a, b) {
            const shortA = a.packageName.split('/').pop();
            const shortB = b.packageName.split('/').pop();

            // Labels
            ['h2hLabelA','h2hLabelA2','h2hLabelA3'].forEach(id => document.getElementById(id).textContent = shortA);
            ['h2hLabelB','h2hLabelB2','h2hLabelB3'].forEach(id => document.getElementById(id).textContent = shortB);

            function setH2H(barAId, barBId, valA, valB, deltaId, fmtFn) {
                const total = valA + valB || 1;
                const pA = (valA / total * 100).toFixed(1);
                const pB = (valB / total * 100).toFixed(1);

                const barA = document.getElementById(barAId);
                const barB = document.getElementById(barBId);
                barA.style.width = pA + '%';
                barB.style.width = pB + '%';

                const winnerA = valA <= valB;
                barA.style.background = winnerA ? '#10b981' : '#f472b6';
                barB.style.background = !winnerA ? '#10b981' : '#f472b6';

                const delta = document.getElementById(deltaId);
                if (valA === valB) {
                    delta.textContent = 'Equal';
                    delta.className = 'diff-delta neutral';
                } else {
                    const smaller = Math.min(valA, valB);
                    const larger = Math.max(valA, valB);
                    const pct = ((larger - smaller) / larger * 100).toFixed(0);
                    const winnerName = valA < valB ? shortA : shortB;
                    delta.textContent = \`\${winnerName} is \${pct}% smaller\`;
                    delta.className = 'diff-delta positive';
                }
            }

            setH2H('h2hGzipA', 'h2hGzipB', a.gzipSize, b.gzipSize, 'diffGzipDelta', fmtShort);
            setH2H('h2hInstallA', 'h2hInstallB', a.installSize, b.installSize, 'diffInstallDelta', fmtShort);
            setH2H('h2hDepsA', 'h2hDepsB', a.dependencies.length, b.dependencies.length, 'diffDepsDelta', v => v + '');
        }

        function renderVerdict(a, b) {
            const box = document.getElementById('verdictBox');
            const icon = document.getElementById('verdictIcon');
            const headline = document.getElementById('verdictHeadline');
            const body = document.getElementById('verdictBody');

            const nameA = a.packageName;
            const nameB = b.packageName;

            // Score: count wins across gzip, install, deps
            let scoreA = 0, scoreB = 0;
            if (a.gzipSize < b.gzipSize) scoreA++; else if (b.gzipSize < a.gzipSize) scoreB++;
            if (a.installSize < b.installSize) scoreA++; else if (b.installSize < a.installSize) scoreB++;
            if (a.dependencies.length < b.dependencies.length) scoreA++; else if (b.dependencies.length < a.dependencies.length) scoreB++;


            const gzipDiffPct = Math.abs((a.gzipSize - b.gzipSize) / Math.max(a.gzipSize, b.gzipSize) * 100).toFixed(0);

            if (scoreA === scoreB) {
                box.style.borderColor = 'rgba(255,255,255,0.12)';
                box.style.background = 'rgba(255,255,255,0.03)';
                icon.textContent = '⚖️';
                headline.textContent = "It’s a draw!";
                body.textContent = \`Both \${nameA} and \${nameB} are comparable across all measured dimensions. Choice depends on ecosystem fit.\`;
            } else {
                const winner = scoreA > scoreB ? a : b;
                const loser  = scoreA > scoreB ? b : a;
                const isA    = winner === a;

                box.style.borderColor = 'rgba(16,185,129,0.35)';
                box.style.background = 'rgba(16,185,129,0.06)';
                icon.textContent = '🏆';
                headline.style.color = '#10b981';
                headline.textContent = \`\${winner.packageName} wins\`;
                
                const parts = [];
                if (winner.gzipSize < loser.gzipSize) parts.push(\`\${gzipDiffPct}% lighter gzip\`);
                if (winner.installSize < loser.installSize) parts.push('smaller install footprint');
                if (winner.dependencies.length < loser.dependencies.length) parts.push(\`\${loser.dependencies.length - winner.dependencies.length} fewer deps\`);


                body.textContent = parts.length
                    ? \`Wins with: \${parts.join(', ')}.\`
                    : \`Edges out \${loser.packageName} across multiple metrics.\`;
            }
        }

        // Enter key for compare inputs
        [cmpInputA, cmpInputB].forEach(el => el.addEventListener('keypress', e => { if (e.key === 'Enter') runCompare(); }));
`;

export const minifiedJS = minifyJS(rawJS);

function buildHTML(starCount: number) {
	return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Saizu | npm package analyzer</title>
    <meta name="description" content="Analyze npm package size instantly. Get gzip size, install size, dependencies and GitHub badges. Built for the Bun era — no dist, no compile step.">
    <link rel="icon" type="image/png" href="/saizu-logo.avif">
    <link rel="apple-touch-icon" href="/saizu-logo.avif">

    <!-- OpenGraph -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://saizu.dev/">
    <meta property="og:title" content="Saizu | npm package analyzer">
    <meta property="og:description" content="Analyze npm package size instantly. Get gzip size, install size, dependencies and GitHub badges. Built for the Bun era.">
    <meta property="og:image" content="https://saizu.dev/saizu-logo.avif">
    <meta property="og:site_name" content="Saizu">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="Saizu | npm package analyzer">
    <meta name="twitter:description" content="Analyze npm package size instantly. Get gzip size, install size, dependencies and GitHub badges.">
    <meta name="twitter:image" content="https://saizu.dev/saizu-logo.avif">

    <!-- Font preload removed: @font-face already in inline criticalCSS -->

    <!-- Critical CSS INLINE -->
    <style>${criticalCSS}</style>
    <!-- Deferred CSS non-blocking -->
    <link rel="preload" href="${deferredCSSPath}" as="style" onload="this.onload=null;this.rel='stylesheet'">
    <noscript><link rel="stylesheet" href="${deferredCSSPath}"></noscript>
</head>
<body>
    <nav>
        <a href="/" class="logo">
                    <img src="/saizu-logo.avif" width="32" height="32" alt="Saizu Logo" style="vertical-align: middle;" loading="eager" />
            Saizu
        </a>
        <div class="nav-right">
            <a href="https://github.com/Kode-Kult/saizu" target="_blank" rel="noopener" class="gh-stars-btn" aria-label="GitHub Stars">
                <span class="gh-sparkles" aria-hidden="true">
                    <svg class="gh-spark-1" viewBox="0 0 24 24"><path d="M12 2l2.4 5.6L20 10l-5.6 2.4L12 18l-2.4-5.6L4 10l5.6-2.4z"/></svg>
                    <svg class="gh-spark-2" viewBox="0 0 24 24"><path d="M12 2l2.4 5.6L20 10l-5.6 2.4L12 18l-2.4-5.6L4 10l5.6-2.4z"/></svg>
                    <svg class="gh-spark-3" viewBox="0 0 24 24"><path d="M12 2l2.4 5.6L20 10l-5.6 2.4L12 18l-2.4-5.6L4 10l5.6-2.4z"/></svg>
                </span>
                <span class="gh-shimmer" aria-hidden="true"><span class="gh-shimmer-beam"></span></span>
                <span class="gh-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg></span>
                <span class="gh-count"><span class="gh-label">Stars: </span>${starCount}</span>
            </a>
            <a href="https://www.paypal.com/paypalme/l0g4n7" target="_blank" rel="noopener" class="support-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.593c-.525-.438-1.056-.877-1.575-1.29C5.17 16.194 2 13.265 2 9.5 2 6.42 4.42 4 7.5 4c1.736 0 3.354.86 4.5 2.197C13.146 4.86 14.764 4 16.5 4 19.58 4 22 6.42 22 9.5c0 3.765-3.17 6.694-8.425 10.803-.519.413-1.05.852-1.575 1.29z"/></svg>
                <span class="support-text">Support Saizu</span>
            </a>
        </div>
    </nav>

    <div id="loader" class="loading-line"></div>

    <main class="page-content">
        <div class="bg-overlay"></div>
        <div class="container">
            <header style="display:flex; align-items:center; gap:32px">
                <img src="/saizu-logo.avif" width="100" height="100" alt="Saizu" style="flex-shrink:0; margin-top:-95px" fetchpriority="high" />
                <div>
                    <h1><img src="/saizu-jp.avif" width="135" height="60" alt="SAIZU" class="saizu-logo-text" fetchpriority="high"> The real weight of your dependencies.</h1>
                    <p class="hero-desc">Size is a feature, Compare, Measure, Choose it.<br>Understand your bundle footprint and generate <b>GitHub badges</b> in seconds.</p>
                </div>
            </header>

            <!-- TAB SWITCHER -->
            <div class="mode-tabs">
                <button class="mode-tab active" id="tabAnalyze" onclick="switchMode('analyze')">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    Analyze
                </button>
                <button class="mode-tab" id="tabCompare" onclick="switchMode('compare')">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="18" rx="1"/></svg>
                    Compare
                </button>
            </div>

            <!-- ANALYZE MODE -->
            <div id="analyzeMode">
                <div class="search-row">
                    <div class="input-wrapper">
                        <input type="text" id="pkgInput" placeholder="Analyze package or repo (e.g. react, facebook/react)" spellcheck="false" />
                    </div>
                    <button id="searchBtn" class="btn-primary" onclick="analyze()">Search</button>
                </div>

                <div id="vizContainer" class="install-size-viz">
                    <div class="viz-header">
                        <div class="viz-title">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"></path></svg>
                            Install size
                        </div>
                        <div class="viz-stats" id="vizSummary">--MB / -- package</div>
                    </div>
                    <div class="distribution-bar" id="distBar"></div>
                    <div class="bar-legend" id="barLegend"></div>
                </div>

                <div id="pkgResult" class="pkg-main-card">

                    <div class="pkg-info-row">
                        <div class="pkg-title-area">
                            <div id="resName" class="pkg-name-display">--</div>
                            <div class="pkg-meta">
                                <span id="resVersion" style="font-family: var(--font-mono); font-weight: 600">v0.0.0</span>
                                <span id="resAuthorWrap">by <span id="resAuthor">--</span></span>
                                <span class="pkg-tag" id="resLicense">MIT</span>
                            </div>
                        </div>
                        <div id="resRepoArea"></div>
                    </div>
                    <div id="resDesc" class="pkg-desc">--</div>

                    <!-- Stat boxes (single row) -->
                    <div class="stats-row">
                        <div class="s-box"><span class="s-label">Gzip size</span><div class="s-value" id="resGzip">--</div></div>
                        <div class="s-box"><span class="s-label">Install size</span><div class="s-value" id="resTotal">--</div></div>
                        <div class="s-box"><span class="s-label">Files</span><div class="s-value" id="resFiles">--</div></div>
                        <div class="s-box">
                            <span class="s-label">Download time</span>
                            <div class="dl-bars">
                                <div class="dl-bar-row">
                                    <div class="dl-bar-track"><div class="dl-bar-fill" id="dlBar4g" style="background:#f59e0b"></div></div>
                                    <span class="dl-bar-label">4G</span>
                                    <span class="dl-bar-value" id="dlVal4g">--</span>
                                </div>
                                <div class="dl-bar-row">
                                    <div class="dl-bar-track"><div class="dl-bar-fill" id="dlBarWifi" style="background:#06b6d4"></div></div>
                                    <span class="dl-bar-label">WiFi</span>
                                    <span class="dl-bar-value" id="dlValWifi">--</span>
                                </div>
                                <div class="dl-bar-row">
                                    <div class="dl-bar-track"><div class="dl-bar-fill" id="dlBarGbit" style="background:#a78bfa"></div></div>
                                    <span class="dl-bar-label">Gbit</span>
                                    <span class="dl-bar-value" id="dlValGbit">--</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Dependencies list -->
                    <div class="deps-section" id="depsSection">
                        <span class="deps-title">Dependencies (<span id="resDepsCount">0</span>)</span>
                        <div class="dep-list" id="depList"></div>
                    </div>

                    <!-- Capabilities -->
                    <div class="capability-row">
                        <div class="cap-item" id="capESM">ESM</div>
                        <div class="cap-item" id="capCJS">CommonJS</div>
                        <div class="cap-item" id="capTypes">Types</div>
                    </div>

                    <!-- GitHub Badges -->
                    <div class="badge-section">
                        <span class="s-label" style="margin-bottom: 12px">GitHub Badges</span>
                        <div class="badge-grid">
                            <div class="badge-item">
                                <img id="badgeGzip" src="" alt="Gzip Badge" />
                                <div class="badge-fmt-tabs">
                                    <button class="badge-fmt-btn active" onclick="setBadgeFmt('gzip','md',this)">Markdown</button>
                                    <button class="badge-fmt-btn" onclick="setBadgeFmt('gzip','html',this)">HTML</button>
                                </div>
                                <code id="codeGzip" title="Click to copy"></code>
                                <span class="badge-copy-hint">click to copy</span>
                            </div>
                            <div class="badge-item">
                                <img id="badgeInstall" src="" alt="Install Badge" />
                                <div class="badge-fmt-tabs">
                                    <button class="badge-fmt-btn active" onclick="setBadgeFmt('install','md',this)">Markdown</button>
                                    <button class="badge-fmt-btn" onclick="setBadgeFmt('install','html',this)">HTML</button>
                                </div>
                                <code id="codeInstall" title="Click to copy"></code>
                                <span class="badge-copy-hint">click to copy</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- COMPARE MODE -->
            <div id="compareMode" style="display:none">
                <div class="compare-inputs visible">
                    <div class="input-wrapper">
                        <input type="text" id="cmpInputA" placeholder="Package A (e.g. discord.js)" spellcheck="false" />
                    </div>
                    <div class="vs-divider">VS</div>
                    <div class="input-wrapper">
                        <input type="text" id="cmpInputB" placeholder="Package B (e.g. @ovencord/discord.js)" spellcheck="false" />
                    </div>
                    <button id="cmpBtn" class="btn-primary" onclick="runCompare()">Compare</button>
                </div>

                <div id="compareResults">
                    <!-- Header -->
                    <div class="compare-header">
                        <div class="compare-title">
                            <span class="pkg-pill" id="cmpTitleA">--</span>
                            <span style="color:#444">vs</span>
                            <span class="pkg-pill" id="cmpTitleB">--</span>
                        </div>
                    </div>

                    <!-- Side-by-side cards -->
                    <div class="compare-columns">
                        <div class="cmp-card" id="cmpCardA">
                            <div class="winner-badge">✓ Smaller</div>
                            <div class="cmp-name" id="cmpNameA">--</div>
                            <div class="cmp-version" id="cmpVersionA">--</div>
                            <div class="cmp-desc" id="cmpDescA">--</div>
                            <div class="cmp-stat-row" id="cmpStatsA"></div>
                            <div class="cmp-caps" id="cmpCapsA"></div>
                        </div>
                        <div class="cmp-card" id="cmpCardB">
                            <div class="winner-badge">✓ Smaller</div>
                            <div class="cmp-name" id="cmpNameB">--</div>
                            <div class="cmp-version" id="cmpVersionB">--</div>
                            <div class="cmp-desc" id="cmpDescB">--</div>
                            <div class="cmp-stat-row" id="cmpStatsB"></div>
                            <div class="cmp-caps" id="cmpCapsB"></div>
                        </div>
                    </div>

                    <!-- Head-to-head diff bars -->
                    <div class="compare-diff-section">
                        <div class="diff-title">Head-to-head</div>

                        <div class="diff-metric" id="diffGzip">
                            <div class="diff-metric-header">
                                <span class="diff-metric-name">Gzip Size</span>
                                <span class="diff-delta" id="diffGzipDelta">--</span>
                            </div>
                            <div class="h2h-bar-wrap">
                                <span class="h2h-label" id="h2hLabelA">--</span>
                                <div class="h2h-track">
                                    <div class="h2h-fill-a" id="h2hGzipA" style="width:50%"></div>
                                    <div class="h2h-fill-b" id="h2hGzipB" style="width:50%"></div>
                                </div>
                                <span class="h2h-label right" id="h2hLabelB">--</span>
                            </div>
                        </div>

                        <div class="diff-metric" id="diffInstall">
                            <div class="diff-metric-header">
                                <span class="diff-metric-name">Install Size</span>
                                <span class="diff-delta" id="diffInstallDelta">--</span>
                            </div>
                            <div class="h2h-bar-wrap">
                                <span class="h2h-label" id="h2hLabelA2">--</span>
                                <div class="h2h-track">
                                    <div class="h2h-fill-a" id="h2hInstallA" style="width:50%"></div>
                                    <div class="h2h-fill-b" id="h2hInstallB" style="width:50%"></div>
                                </div>
                                <span class="h2h-label right" id="h2hLabelB2">--</span>
                            </div>
                        </div>

                        <div class="diff-metric" id="diffDeps">
                            <div class="diff-metric-header">
                                <span class="diff-metric-name">Dependencies</span>
                                <span class="diff-delta" id="diffDepsDelta">--</span>
                            </div>
                            <div class="h2h-bar-wrap">
                                <span class="h2h-label" id="h2hLabelA3">--</span>
                                <div class="h2h-track">
                                    <div class="h2h-fill-a" id="h2hDepsA" style="width:50%"></div>
                                    <div class="h2h-fill-b" id="h2hDepsB" style="width:50%"></div>
                                </div>
                                <span class="h2h-label right" id="h2hLabelB3">--</span>
                            </div>
                        </div>
                    </div>

                    <!-- Verdict -->
                    <div class="verdict-box" id="verdictBox">
                        <div class="verdict-icon" id="verdictIcon">⚖️</div>
                        <div class="verdict-text-wrap">
                            <div class="verdict-headline" id="verdictHeadline">--</div>
                            <div class="verdict-body" id="verdictBody">--</div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </main>

    <footer>
        Luigi Colantuono © Saizu 2026. Powered by Bun & Hono.
    </footer>

    <script>${minifiedJS}</script>
</body>
</html>
`;
}

ui.get('/', async (c) => {
	const stars = await getGitHubStars();
	return c.html(buildHTML(stars));
});

export default ui;
