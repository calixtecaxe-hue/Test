import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Il n'y a plus de page commune aux quatre agents : une page par agent.
  async redirects() {
    return [{ source: "/agents", destination: "/", permanent: false }];
  },
  // En-têtes de sécurité de base. La politique de contenu (CSP) reste à écrire : elle
  // demande de traiter les scripts intégrés de Next.js avec un nonce.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
