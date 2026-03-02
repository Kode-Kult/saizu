# <img width="60" height="60" alt="saizu-logo-2-no-bg" src="https://github.com/user-attachments/assets/320f4c09-086d-4222-b022-cf9d825bd410" />  <img width="135" height="60" alt="saizu-jp-logo-nobg" src="https://github.com/user-attachments/assets/95407965-af1f-4738-bcad-67d2fa5d09fb" />

> 𝗦 𝗔 𝗜 𝗭 𝗨  ︲  **The real weight of your dependencies. Size is a feature, measure it.**

Saizu is a blazingly fast npm package analyzer built with **Bun** and **Hono** — no Node.js, no bloat, no compromises. The entire server runs as a single lightweight process with zero unnecessary dependencies.

## What it does

Paste any npm package name and Saizu will instantly tell you everything you need to know before adding it to your project:

- **Gzip size** and **install size** — the real numbers, not estimates
- **File count** and **type breakdown** — see exactly what you're shipping (`.js`, `.d.ts`, `.mjs`, and more) visualized as an interactive distribution bar
- **Dependencies** — the full list, each one clickable to inspect recursively
- **Download time** — calculated across 2G, 3G, 4G and Wi-Fi so you know the real-world impact
- **Module format** — ESM, CommonJS, and TypeScript types availability at a glance
- **License** — detected directly from the package manifest
- **GitHub Badges** — copy-paste ready in both Markdown and HTML format, served instantly with no external service latency

Need to choose between two packages? The **Compare** mode puts them side by side with a detailed diff of every metric so you can make an informed decision.

## Tech

- **[Bun](https://bun.sh)** — runtime, package manager, and TypeScript executor. No compile step, no `dist` folder.
- **[Hono](https://hono.dev)** — ultrafast web framework with zero dependencies, built on Web Standard APIs.

## Why Saizu

Most bundle analyzers require you to install a package locally, run a build, and parse the output. Saizu does none of that — it installs the package in an isolated temp directory, measures it, and discards it. The result is cached in-memory for subsequent requests.

No database. No external services. No persistence layer. Just a single process, a temp folder, and an in-memory cache. The whole analysis takes a few seconds and works on any package, any version, any scope.

## Compare Preview

![saizu-compare-preview](https://github.com/user-attachments/assets/6194884c-e53e-4ec5-9a01-692a0954e756)


## Analyze Preview

![saizu-compact](https://github.com/user-attachments/assets/72f1a9e7-1cc6-4943-844a-ef0cfbcd57f8)
