# <img width="60" height="60" alt="saizu-logo-2-no-bg" src="https://github.com/user-attachments/assets/320f4c09-086d-4222-b022-cf9d825bd410" />  <img width="135" height="60" alt="saizu-jp-logo-nobg" src="https://github.com/user-attachments/assets/95407965-af1f-4738-bcad-67d2fa5d09fb" />

> 𝗦 𝗔 𝗜 𝗭 𝗨  ︲  **The real weight of your dependencies. Size is a feature, measure it.**

Saizu is a blazingly fast npm package analyzer built with **Bun** and **Hono** — no Node.js, no bloat, no compromises. The entire server runs as a single lightweight process with zero unnecessary dependencies.

## What it does

Paste any npm package name and Saizu will instantly tell you everything you need to know before adding it to your project:

- **Gzip size** and **install size** — the real numbers, not estimates
- **File count** and **type breakdown** — see exactly what you're shipping (`.js`, `.d.ts`, `.mjs`, and more) visualized as an interactive distribution bar
- **Dependencies** — the full list, each one clickable to inspect recursively
- **Download time** — calculated across 4G, Wi-Fi and Gbit so you know the real-world impact
- **Module format** — ESM, CommonJS, and TypeScript types availability at a glance
- **License** — detected directly from the package manifest
- **GitHub Badges** — copy-paste ready in both Markdown and HTML format, served instantly with no external service latency

Need to choose between two packages? The **Compare** mode puts them side by side with a detailed diff of every metric so you can make an informed decision.

## Why Saizu

Most bundle analyzers require you to install a package locally, run a build, and parse the output. Saizu does none of that — it installs the package in an isolated temp directory, measures it, and discards it. The result is cached in-memory for subsequent requests.

No database. No external services. No persistence layer. Just a single process, a temp folder, and an in-memory cache. The whole analysis takes a few seconds and works on any package, any version, any scope.

## REST API

Saizu provides a public JSON REST API to consume package metrics programmatically.

- **Base URL**: `https://saizu.dev/api/v1`
- **Rate Limit**: 30 requests per minute per IP.
- **CORS**: Enabled for all origins.

### Endpoints

```bash
# 1. Analyze a package
curl https://saizu.dev/api/v1/package/react

# 2. Analyze a specific version
curl https://saizu.dev/api/v1/package/react?version=18.2.0

# 3. Analyze a scoped package (URL encoded slash or wildcard)
curl "https://saizu.dev/api/v1/package/@tanstack%2Freact-query"
# or
curl https://saizu.dev/api/v1/package/@tanstack/react-query

# 4. Analyze a GitHub repo (pre-publish)
curl https://saizu.dev/api/v1/repo/facebook/react

# 5. Analyze a GitHub repo with branch and subpath (Monorepo)
curl "https://saizu.dev/api/v1/repo/tanstack/query?branch=beta&subpath=packages/react-query"

# 6. Compare two packages (npm vs npm)
curl "https://saizu.dev/api/v1/compare?a=axios&b=ky"

# 7. Compare npm package vs GitHub repo
curl "https://saizu.dev/api/v1/compare?a=axios&b=github:axios/axios"

# 8. Health check
curl https://saizu.dev/api/v1/health

# 9. API Reference
curl https://saizu.dev/api/v1/
```
```json
{
  "name": "@tanstack/react-query",
  "version": "5.90.21",
  "description": "Hooks for managing, caching and syncing asynchronous and remote data in React",
  "license": "MIT",
  "author": "tanstack",
  "gzipSize": 228158,
  "installSize": 734321,
  "fileCount": 325,
  "fileTypes": {
    "md": 4462,
    "other": 1079,
    "json": 4367,
    "tsx": 7511,
    "ts": 54459,
    "cjs": 175377,
    "cts": 70362,
    "map": 297586,
    "js": 48826,
    "dts": 70292
  },
  "dependencies": [
    "@tanstack/query-core",
    "react"
  ],
  "dependencyCount": 2,
  "hasESM": true,
  "hasCJS": true,
  "hasTypes": true,
  "downloadTime": {
    "4g": 31,
    "wifi": 11,
    "gbit": 2
  }
}
```


> Note: the API returns all sizes in **pure bytes** and download times in **milliseconds**.


## Analyze Preview

<img width="1920" height="2099" alt="image" src="https://github.com/user-attachments/assets/71212a16-f847-4498-a320-085fc6897864" />


## Compare Preview

![saizu-compare](https://github.com/user-attachments/assets/942ef725-e035-4836-9672-af1a37a03548)




