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
    // reactCompiler: true,

    reactCompiler: {
      compilationMode: 'annotation',
    },
    viewTransition: true,
    optimizePackageImports: [
      "lucide-react",
      "cloudstore",
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
};

export default bundleAnalyzer(nextConfig);
