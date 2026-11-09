import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Next streams the title, description and link-preview tags into the page body for
  // clients it thinks run JavaScript (Googlebot included). Search engines, AI crawlers and
  // link previews read them from <head>, so always put them there. The metadata is static,
  // so this costs nothing.
  htmlLimitedBots: /.*/,
};

export default nextConfig;
