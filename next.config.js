/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // PGlite ships a wasm binary; keep it external so Next doesn't bundle it.
    serverComponentsExternalPackages: ["@electric-sql/pglite"],
  },
};

module.exports = nextConfig;
