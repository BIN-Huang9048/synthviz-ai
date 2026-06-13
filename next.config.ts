import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https" as const, hostname: "**" },
    ],
  },

  // Prisma 7 生成的客户端需外部化，避免 webpack 打包 node: 模块
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-pg",
    "pg",
  ],

  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },

  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize the generated Prisma client to avoid webpack
      // processing it (Prisma 7 uses node: protocol imports)
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        function ({ request }: { request?: string }, callback: any) {
          if (request?.startsWith("node:")) {
            // Strip node: prefix — use Node.js built-in
            return callback(null, `commonjs ${request.slice(5)}`);
          }
          callback();
        },
      ];
    }
    return config;
  },
};

export default nextConfig;
