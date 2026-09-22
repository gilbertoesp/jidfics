import type { NextConfig } from "next";

// Note: Next 16 no longer runs ESLint during `next build` (the old
// `eslint.ignoreDuringBuilds` option was removed). Lint gates live in CI
// (`bun run lint`) and the pre-commit hook (lint-staged) instead.
const nextConfig: NextConfig = {};

export default nextConfig;
