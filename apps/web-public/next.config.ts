import type { NextConfig } from "next";

/**
 * Вітрина збирається у чисту статику (`out/`), яку роздає Spring Boot з classpath:/static/.
 * Жодного SSR / Route Handlers / Server Actions — лише те, що підтримує `output: "export"`.
 */
const nextConfig: NextConfig = {
  output: "export",
  // D-16: демо на GitHub Pages — сайт під /<repo>/; у jar — у корені
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ["@zwf/ui", "@zwf/i18n"],
  reactStrictMode: true,
};

export default nextConfig;
