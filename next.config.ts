import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Il n'y a plus de page commune aux quatre agents : une page par agent.
  async redirects() {
    return [{ source: "/agents", destination: "/", permanent: false }];
  },
};

export default nextConfig;
