/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lets a production build run in its own folder while `next dev` is running
  // (NEXT_DIST_DIR=.next-build npm run build), so it cannot corrupt the dev cache.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // esbuild is a native binary used by the server-side validator; never bundle it.
  serverExternalPackages: ["esbuild"],
};
export default nextConfig;
