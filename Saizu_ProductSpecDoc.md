# SAIZU — サイズ
## Product Specification Document

> **The real weight of your dependencies. Size is a feature — measure it.**

| | |
|---|---|
| **Version** | 1.0.0 |
| **Date** | March 2026 |
| **Author** | Luigi Colantuono |
| **Repository** | https://github.com/Kode-Kult/saizu |
| **Live URL** | https://saizu.dev |
| **License** | Apache 2.0 |
| **Runtime** | Bun + Hono |
| **Language** | TypeScript |

---

## 1. Executive Summary

Saizu (サイズ, Japanese for "size") is a blazingly fast, zero-dependency npm package analyzer built to give frontend engineers immediate, accurate insight into the real cost of any npm package before it enters their codebase.

Existing tools like Bundlephobia, pkg-size.dev, and npms.io solve part of the problem but each has critical gaps: none of them supports GitHub repository and monorepo analysis, none provides real-time download time estimates across multiple network profiles, and none offers a side-by-side comparison mode that covers every metric at once.

Saizu closes all these gaps in a single, lightweight, self-hosted service. The entire server runs as a single Bun process with an in-memory cache — no database, no external services, no infrastructure complexity.

---

## 2. Problem Statement

### 2.1 The Hidden Cost of Dependencies

Modern JavaScript projects accumulate dependencies rapidly. A typical React app has 1,000+ transitive dependencies. Developers routinely add packages without understanding their real footprint — gzip size, install size, transitive dependency tree, or how long they will take to load on a mobile network.

This results in:

- Bundle bloat that degrades Core Web Vitals (LCP, FID, CLS)
- Slow installs in CI/CD pipelines due to unnecessarily heavy packages
- License compliance issues discovered only after deployment
- No data-driven way to compare two candidate packages head-to-head

### 2.2 Gaps in Existing Solutions

Bundlephobia and similar tools are limited to the npm registry. They cannot analyze a GitHub repository or a monorepo with multiple packages — a very common real-world scenario for teams evaluating a fork, a private package, or a pre-release version of a library.

Additionally, most analyzers require local installation, a build step, and manual interpretation of output. Saizu eliminates all of that friction by running the full analysis server-side in an isolated, ephemeral environment.

---

## 3. Solution Overview

### 3.1 Core Concept

Saizu installs any npm package in an isolated temporary directory, measures every dimension of its footprint, caches the result in memory, and returns a structured JSON response — all in a few seconds, with no local tooling required from the user.

The same pipeline also works on GitHub repositories and monorepos, making Saizu the only tool that provides a unified analysis surface across both npm and GitHub.

### 3.2 Key Differentiators

- **GitHub & monorepo analysis** — analyze any public GitHub repo or monorepo, not just npm packages
- **Side-by-side Compare mode** — every metric compared at a glance with a visual diff
- **Real-world download time** — estimates across 2G, 3G, 4G and Wi-Fi based on actual gzip size
- **Interactive file-type distribution bar** — visualizes exactly what files are being shipped
- **Zero infrastructure** — no database, no external API calls, in-memory cache only
- **Instant GitHub badges** — copy-paste Markdown/HTML badges served with zero external latency
- **Recursive dependency inspection** — click any dependency to analyze it inline

---

## 4. Feature Specification

| Feature | Description | Status |
|---|---|---|
| Package Analysis | Full metrics for any npm package by name and optional version | ✅ Implemented |
| Gzip & Install Size | Actual compressed and on-disk size after installation | ✅ Implemented |
| File Count & Breakdown | Total files with type distribution (.js, .d.ts, .mjs, etc.) | ✅ Implemented |
| Dependency Tree | Full list of direct + transitive dependencies, each clickable | ✅ Implemented |
| Download Time Estimates | Calculated for 2G, 3G, 4G and Wi-Fi from gzip size | ✅ Implemented |
| Module Format Detection | ESM / CommonJS / TypeScript types availability | ✅ Implemented |
| License Detection | Extracted directly from package.json manifest | ✅ Implemented |
| GitHub Badge Generator | Markdown + HTML badges, served server-side | ✅ Implemented |
| Compare Mode | Side-by-side diff of all metrics for two packages | ✅ Implemented |
| GitHub Repo Analysis | Analyze any public GitHub repository | ✅ Implemented |
| Monorepo Support | Analyze individual packages within a monorepo | ✅ Implemented |
| In-Memory Cache | Results cached per package+version to avoid redundant installs | ✅ Implemented |
| Version Selector | Analyze specific versions of a package | 🔄 In Progress |
| Historical Trend | Track package size changes across versions over time | 📋 Planned |

---

## 5. Technical Architecture

### 5.1 Stack

| Component | Technology |
|---|---|
| Runtime | Bun — serves as runtime, package manager, and TypeScript executor. No compile step, no dist folder. |
| Web Framework | Hono — ultrafast web framework built on Web Standard APIs, zero dependencies |
| Language | TypeScript (99.6% of codebase) |
| Containerization | Docker — single Dockerfile, production-ready |
| CI/CD | GitHub Actions |
| Cache | In-process LRU cache — no Redis, no external store |
| Analysis Method | Isolated temp directory install via Bun, then filesystem walk + stat |

### 5.2 Analysis Pipeline

For each analysis request, Saizu follows a deterministic 5-step pipeline:

1. Receive package name (and optional version) from client
2. Check in-memory cache — return immediately if hit
3. Install package in a fresh temporary directory using Bun
4. Walk the installed directory: count files, sum sizes, detect module formats, extract metadata
5. Serialize result to JSON, populate cache, discard temp directory, return response

GitHub analysis follows the same pipeline but clones the repository (or a specific monorepo subdirectory) instead of installing from npm.

### 5.3 Performance

- **Cold analysis** (no cache): 2–8 seconds depending on package size and network
- **Warm analysis** (cache hit): < 50ms
- **Server memory footprint**: < 100MB for typical workloads
- **No database cold start** — the process is the service

---

## 6. Competitive Analysis

| | **Saizu** | Bundlephobia | pkg-size.dev | npms.io |
|---|:---:|:---:|:---:|:---:|
| npm package analysis | ✓ | ✓ | ✓ | ✓ |
| GitHub repo analysis | **✓** | ✗ | ✗ | ✗ |
| Monorepo support | **✓** | ✗ | ✗ | ✗ |
| Compare mode | **✓** | ✗ | Partial | ✗ |
| Download time estimates | ✓ | ✓ | ✗ | ✗ |
| File type distribution | **✓** | ✗ | ✗ | ✗ |
| Badge generator | **✓** | ✗ | ✗ | ✗ |
| Recursive dep inspect | **✓** | Partial | ✗ | ✗ |
| No local install required | ✓ | ✓ | ✓ | ✓ |
| Self-hostable | **✓** | ✗ | ✗ | ✗ |
| Zero external dependencies | **✓** | ✗ | ✗ | ✗ |

---

## 7. User Stories

### 7.1 Frontend Developer — Pre-install Check

> "As a frontend developer, I want to know the gzip size and download time of a package before I add it to my project, so that I can make an informed decision without installing anything locally."

**Acceptance criteria:** entering a package name returns gzip size, install size, and estimated download times in under 10 seconds.

### 7.2 Tech Lead — Package Comparison

> "As a tech lead, I want to compare two packages side by side on all metrics, so that I can present a data-driven recommendation to my team."

**Acceptance criteria:** the Compare mode shows both packages simultaneously with a clear visual diff highlighting which package wins on each metric.

### 7.3 Open Source Maintainer — GitHub Repo Analysis

> "As an open source maintainer, I want to analyze my own GitHub repository before publishing to npm, so that I can verify the package size and catch unintended files."

**Acceptance criteria:** pasting a GitHub URL triggers the same analysis pipeline as an npm package name.

### 7.4 DevOps Engineer — Badge Automation

> "As a DevOps engineer, I want to embed live size badges in our README without relying on an external badge service, so that the badges are always accurate and never break."

**Acceptance criteria:** Saizu generates ready-to-paste Markdown and HTML badge code served from its own endpoint.

---

## 8. Roadmap

| Version | Scope |
|---|---|
| **v1.0 (Current)** | npm package analysis, Compare mode, GitHub repo + monorepo analysis, download time estimates, badge generator, in-memory cache |
| **v1.1 (Next)** | Version selector UI, historical size trend chart across versions, improved monorepo package picker |
| **v1.2** | API endpoint for CI integration — fail builds when package size exceeds a defined threshold |
| **v2.0** | Private GitHub repo support via OAuth, team workspaces, saved comparisons |

---

## 9. Non-Functional Requirements

- **Response time:** cold analysis under 10 seconds, cached analysis under 100ms
- **Availability:** the service is stateless and trivially horizontally scalable behind a load balancer
- **Security:** no user data is stored; temp directories are created with unique IDs and deleted immediately after analysis
- **Portability:** the entire application ships as a single Docker image with no external dependencies
- **Observability:** structured JSON logs emitted to stdout, compatible with any log aggregation stack

---

## 10. Glossary

| Term | Definition |
|---|---|
| **Gzip size** | The compressed size of the package as it would travel over the network (HTTP Content-Encoding: gzip) |
| **Install size** | The on-disk size of the package after extraction, including all files |
| **Transitive dependency** | A dependency of a dependency — not declared directly in the project but required at runtime |
| **Monorepo** | A single Git repository containing multiple independent packages (e.g. using workspaces) |
| **ESM** | ECMAScript Modules — the modern JavaScript module format using import/export syntax |
| **CJS** | CommonJS — the legacy Node.js module format using require/module.exports |
| **LRU cache** | Least Recently Used cache — evicts the oldest unused entries when capacity is reached |
| **Bun** | A fast all-in-one JavaScript runtime and toolkit that replaces Node.js + npm + tsc |
| **Hono** | A lightweight web framework built on Web Standard APIs, compatible with Bun, Deno and Cloudflare Workers |

---

*Saizu · saizu.dev · Apache 2.0*
