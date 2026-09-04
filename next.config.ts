import type { NextConfig } from "next";

const worldpayFrameAncestors =
  "frame-ancestors 'self' https://*.worldpay.com https://*.cardinalcommerce.com https://*.cardinaltrusted.com";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/api/worldpay/return",
        headers: [
          {
            key: "Content-Security-Policy",
            value: worldpayFrameAncestors,
          },
        ],
      },
      {
        source: "/api/orders/complete-return",
        headers: [
          {
            key: "Content-Security-Policy",
            value: worldpayFrameAncestors,
          },
        ],
      },
      {
        source: "/worldpay/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: worldpayFrameAncestors,
          },
        ],
      },
      {
        source: "/((?!api/worldpay/return|api/orders/complete-return|worldpay/).*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
