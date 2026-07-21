/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("chrome-aws-lambda", "puppeteer-core", "puppeteer-extra", "puppeteer-extra-plugin-stealth");
    }
    return config;
  },
};
module.exports = nextConfig;
