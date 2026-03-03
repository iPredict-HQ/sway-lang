import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  webpack: (config, { webpack }) => {
    // @fuels/connectors barrel export pulls in @web3modal/solana and
    // @web3modal/wagmi which have Solana/EVM peer deps we don't need.
    // Replace them all (including subpaths) with a proxy stub module.
    const stub = path.resolve(__dirname, "src/stubs/empty-module.js");
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /^(@solana\/web3\.js|rpc-websockets|@wagmi\/(connectors|core)|porto(\/.*)?|pino-pretty|viem|@walletconnect\/.*|@web3modal\/(?!fuel).*)(\/.*)?\s*$/,
        (resource) => {
          resource.request = stub;
        }
      )
    );
    return config;
  },
};

export default nextConfig;
