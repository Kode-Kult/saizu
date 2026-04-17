# Saizu Product Requirements Document

## 1. Overview

### 1.1 Product Description
Saizu is a blazingly fast npm package analyzer that provides comprehensive insights into npm package metrics. Built with Bun and Hono, it offers real-time analysis of package sizes, dependencies, and performance metrics to help developers make informed decisions about package dependencies.

### 1.2 Vision
To become the definitive tool for npm package analysis, providing developers with accurate, real-time insights to optimize their project dependencies and improve application performance.

### 1.3 Target Audience
- **Frontend Developers**: Need to understand bundle impact of dependencies
- **Backend Developers**: Care about install sizes and dependency trees
- **DevOps Engineers**: Monitor package metrics for CI/CD optimization
- **Technical Leads**: Make informed decisions about package selection
- **Open Source Contributors**: Analyze before contributing to packages

## 2. User Stories

### 2.1 Package Analysis User Stories
- **As a developer**, I want to analyze any npm package to understand its real install size and gzip size so I can make informed decisions about adding it to my project.
- **As a developer**, I want to see a breakdown of file types (.js, .d.ts, .mjs, etc.) in a visual distribution chart to understand what I'm actually shipping.
- **As a developer**, I want to see the full dependency tree of a package so I can understand the full impact on my project.
- **As a developer**, I want to see download time estimates across different network conditions (4G, Wi-Fi, Gbit) to understand the real-world impact.
- **As a developer**, I want to know if a package supports ESM, CommonJS, and TypeScript types at a glance.
- **As a developer**, I want to see the package license information directly from the manifest to ensure compliance.

### 2.2 Comparison User Stories
- **As a developer**, I want to compare two packages side by side with detailed metrics to choose the best option for my project.
- **As a developer**, I want to compare an npm package with a GitHub repository version to decide whether to use the published package or source.
- **As a developer**, I want to see a detailed diff of all metrics between packages to make informed decisions.

### 2.3 GitHub Repository User Stories
- **As a developer**, I want to analyze a GitHub repository before it's published to understand its metrics.
- **As a developer**, I want to analyze specific branches and subpaths (for monorepos) of GitHub repositories.
- **As a developer**, I want to see the same level of detail for repositories as I do for npm packages.

### 2.4 API User Stories
- **As a developer**, I want to consume package metrics programmatically through a REST API.
- **As a developer**, I want to integrate package analysis into my CI/CD pipeline.
- **As a developer**, I want to use the API to build custom tools and dashboards.

## 3. Functional Requirements

### 3.1 Core Package Analysis
- **FR1**: Analyze any npm package by name
- **FR2**: Analyze specific versions of packages
- **FR3**: Analyze scoped packages (e.g., @tanstack/react-query)
- **FR4**: Calculate real gzip size and install size
- **FR5**: Count and categorize files by type (.js, .d.ts, .mjs, .cjs, .ts, .tsx, .json, .md, etc.)
- **FR6**: Extract and display full dependency tree
- **FR7**: Calculate download time across 4G, Wi-Fi, and Gbit networks
- **FR8**: Detect module format (ESM, CommonJS)
- **FR9**: Detect TypeScript types availability
- **FR10**: Extract license information from package manifest

### 3.2 Comparison Functionality
- **FR11**: Compare two npm packages side by side
- **FR12**: Compare npm package with GitHub repository
- **FR13**: Display detailed diff of all metrics
- **FR14**: Highlight differences in size, dependencies, and format

### 3.3 GitHub Repository Analysis
- **FR15**: Analyze GitHub repositories by owner/repo
- **FR16**: Analyze specific branches of repositories
- **FR17**: Analyze subpaths within repositories (for monorepos)
- **FR18**: Pre-publish analysis for repositories

### 3.4 API Endpoints
- **FR19**: Provide package analysis endpoint (`/api/v1/package/:name`)
- **FR20**: Support version parameter for package analysis
- **FR21**: Provide repository analysis endpoint (`/api/v1/repo/:owner/:repo`)
- **FR22**: Support branch and subpath parameters for repositories
- **FR23**: Provide comparison endpoint (`/api/v1/compare`)
- **FR24**: Provide health check endpoint (`/api/v1/health`)
- **FR25**: Provide API documentation endpoint
- **FR26**: Enable CORS for all origins
- **FR27**: Implement rate limiting (30 requests per minute per IP)

### 3.5 User Interface
- **FR28**: Display package name, version, and description
- **FR29**: Show gzip size and install size in human-readable format
- **FR30**: Display interactive file type distribution bar
- **FR31**: Show dependency tree with recursive exploration capability
- **FR32**: Display download time estimates for different network conditions
- **FR33**: Show module format indicators (ESM, CommonJS, TypeScript)
- **FR34**: Display license information
- **FR35**: Generate and display GitHub badges in Markdown and HTML
- **FR36**: Side-by-side comparison interface
- **FR37**: Detailed metrics comparison with visual indicators

## 4. Non-Functional Requirements

### 4.1 Performance
- **NFR1**: Analysis should complete within 5 seconds for typical packages
- **NFR2**: API response time should be under 200ms for cached results
- **NFR3**: Server should handle concurrent requests efficiently
- **NFR4**: In-memory caching should minimize redundant analysis

### 4.2 Reliability
- **NFR5**: Service should be available 99.9% of the time
- **NFR6**: Error handling should be graceful and informative
- **NFR7**: Package analysis should be isolated to prevent cross-contamination
- **NFR8**: Temp directories should be properly cleaned up

### 4.3 Security
- **NFR9**: Package analysis should run in isolated environments
- **NFR10**: No persistent storage of analyzed packages
- **NFR11**: Rate limiting to prevent abuse
- **NFR12**: Input validation for all API endpoints

### 4.4 Scalability
- **NFR13**: Architecture should handle increased traffic without performance degradation
- **NFR14**: In-memory cache should efficiently manage memory usage
- **NFR15**: Should be able to analyze packages of any size

## 5. Technical Requirements

### 5.1 Architecture
- Built with Bun for performance
- Uses Hono web framework
- Single lightweight process
- No external dependencies or databases
- In-memory caching only
- Temporary directories for package installation

### 5.2 Technology Stack
- Runtime: Bun
- Framework: Hono
- Language: TypeScript
- Tools: Biome for linting and formatting
- Module system: ES modules

### 5.3 Data Storage
- No persistent database
- In-memory cache for results
- Temporary directories for package analysis
- Automatic cleanup after analysis

### 5.4 API Design
- RESTful API design
- JSON response format
- Standard HTTP status codes
- CORS enabled
- Rate limiting headers

## 6. Metrics and Analytics

### 6.1 Package Metrics
- Gzip size (bytes)
- Install size (bytes)
- File count
- File type distribution
- Dependency count
- Dependency tree depth
- Download time (ms) across different networks
- Module format support
- TypeScript types availability
- License type

### 6.2 Performance Metrics
- Analysis time
- Cache hit rate
- API response time
- Error rate
- Concurrent request handling

## 7. Success Criteria

### 7.1 User Experience
- Users can quickly find package information within 3 clicks
- Comparison interface is intuitive and easy to use
- API is well-documented and easy to integrate
- Visualizations are clear and informative

### 7.2 Performance
- 95% of package analyses complete within 5 seconds
- API maintains 99.9% uptime
- Cache hit rate above 80%
- Error rate below 1%

### 7.3 Adoption
- 1000+ daily active users
- 100+ GitHub stars
- Positive user feedback on developer experience
- Integration with popular development tools

## 8. Future Enhancements

### 8.1 Phase 2 Features
- Historical analysis and trend tracking
- Package security vulnerability scanning
- Bundle size estimation for specific frameworks
- Browser extension for quick package lookup
- CLI tool for command-line analysis

### 8.2 Phase 3 Features
- Integration with package managers (yarn, pnpm)
- Team analytics and usage reports
- API key authentication for higher limits
- Multi-language package analysis (pip, gems, etc.)
- Performance regression detection

## 9. Test Scenarios

### 9.1 Package Analysis Tests
- Test analysis of a simple package with no dependencies
- Test analysis of a package with complex dependencies
- Test analysis of scoped packages
- Test analysis of packages with different module formats
- Test error handling for non-existent packages
- Test version-specific analysis

### 9.2 Comparison Tests
- Test comparison of two similar packages
- Test comparison of packages with different characteristics
- Test comparison between npm package and GitHub repo
- Test error handling for invalid comparison inputs

### 9.3 API Tests
- Test all API endpoints with valid inputs
- Test API rate limiting
- Test CORS headers
- Test error responses for invalid inputs
- Test API response formats
- Test concurrent API requests

### 9.4 Performance Tests
- Test analysis of large packages
- Test concurrent analysis requests
- Test cache performance
- Test memory usage during analysis
- Test response time under load

### 9.5 Security Tests
- Test isolation between package analyses
- Test cleanup of temporary directories
- Test input validation
- Test rate limiting effectiveness
- Test error handling for malicious inputs