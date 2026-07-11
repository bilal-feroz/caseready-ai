/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep the native libSQL bindings external so they are traced into the
  // serverless function bundle correctly (needed for file:/tmp mode on Vercel).
  experimental: {
    serverComponentsExternalPackages: ["@libsql/client", "libsql"],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
};

export default nextConfig;
