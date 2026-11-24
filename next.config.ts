import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  serverExternalPackages: ["mongoose", "mongodb", "nodemailer"],
};
export default config;
