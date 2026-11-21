import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Next streams the title, description and link-preview tags into the page body for
  // clients it thinks run JavaScript (Googlebot included). Search engines, AI crawlers and
  // link previews read them from <head>, so always put them there. The metadata is static,
  // so this costs nothing.
  htmlLimitedBots: /.*/,
  // The old agency site's pages are still in search results; send them to their nearest page here.
  async redirects() {
    return [
      { source: "/about", destination: "/o-nas", permanent: true },
      { source: "/contact", destination: "/?povprasevanje", permanent: true },
      { source: "/photo", destination: "/", permanent: true },
      { source: "/video", destination: "/", permanent: true },
      // Inotherm was placed in Zagreb by mistake; its HQ and showroom are in Prigorica (Ribnica).
      // The Inotherm tour's credit and shared embed codes still link the old address.
      { source: "/sprehod/inotherm-zagreb", destination: "/sprehod/inotherm-ribnica", permanent: true },
    ];
  },
};

export default nextConfig;
