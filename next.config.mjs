/** @type {import('next').NextConfig} */
const nextConfig = {
  // firebase-admin relies on native Node.js modules that Next.js's default
  // bundling can't handle for serverless functions — this tells Next.js
  // to leave it alone and require() it at runtime instead.
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
