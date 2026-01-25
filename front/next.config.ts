import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  // バックエンドへのプロキシ設定
  async rewrites() {
    // Docker内部ネットワークではサービス名でアクセス
    const backendUrl = process.env.INTERNAL_BACKEND_URL || "http://back:8080";

    return [
      // REST API のプロキシ
      {
        source: "/api/backend/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
