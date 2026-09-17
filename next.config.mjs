import { fileURLToPath } from "node:url";

/**
 * The `@/*` alias is set explicitly rather than inferred from tsconfig paths —
 * webpack did not pick the inferred form up reliably here, and an explicit
 * alias removes the guesswork.
 */
const src = fileURLToPath(new URL("./src", import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack(config) {
    config.resolve.alias = { ...(config.resolve.alias ?? {}), "@": src };
    return config;
  },
};

export default nextConfig;
