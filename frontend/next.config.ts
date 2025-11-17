import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async headers() {
    return [
      {
        source: "/(.*)", // apply to all routes
        headers: [
          {
            key: "Content-Security-Policy",
            value: `
              default-src 'self';
              connect-src 'self' https://stock-market-portfolio-website-code-base.onrender.com wss://stock-market-portfolio-website-code-base.onrender.com;
              img-src 'self' data:;
              script-src 'self';
              style-src 'self' 'unsafe-inline';
            `.replace(/\n/g, " "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
