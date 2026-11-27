import withBundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
}); 

const nextConfig: NextConfig = {
  reactStrictMode: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
    reactCompiler: true,
    viewTransition: true,
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-icons",
      "date-fns",
      "recharts",
      "@tiptap/react",
      "@tiptap/core",
      "react-icons",
    ],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true
  },
  compress: true,
  // pptxgenjs imports "node:fs"/"node:https" behind runtime checks. Its package.json maps the bare
  // names to false for browsers, so strip the node: scheme on the client and let that mapping apply.
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource: { request: string }) => {
          resource.request = resource.request.replace(/^node:/, "");
        }),
      );
      config.resolve.fallback = { ...config.resolve.fallback, fs: false, https: false, http: false };
    }
    return config;
  },
};

export default bundleAnalyzer(nextConfig);
