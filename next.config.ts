import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the dev server to accept requests from a phone on the LAN (and tunnels).
  // Add your tunnel host here too if you use one, e.g. 'xxxx.trycloudflare.com'.
  allowedDevOrigins: ["192.168.1.167", "*.trycloudflare.com", "*.ngrok-free.app", "*.loca.lt"],
};

export default nextConfig;
