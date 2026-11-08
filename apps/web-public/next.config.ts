import type { NextConfig } from "next";

/**
 * Вітрина збирається у чисту статику (`out/`), яку роздає Spring Boot з classpath:/static/.
 * Жодного SSR / Route Handlers / Server Actions — лише те, що підтримує `output: "export"`.
 */
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ["@zwf/ui", "@zwf/i18n"],
  reactStrictMode: true,
};

export default nextConfig;
