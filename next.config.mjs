/** @type {import('next').NextConfig} */
const nextConfig = {
  // Type safety is still enforced by `tsc` during `next build`. ESLint is run
  // in the editor / CI rather than as a hard build gate (the existing codebase
  // uses many intentional `any` casts for Fabric.js / pdf.js interop).
  eslint: { ignoreDuringBuilds: true },
  webpack: (config) => {
    // Required for pdf-lib, fabric.js, and canvas
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
  // Allow cross-origin for Google Fonts
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;
