import { createConfig } from "fuels";

export default createConfig({
  // Path to the Sway workspace containing all contracts
  workspace: "../contracts",
  // Output directory for generated TypeScript bindings
  output: "./src/sway-api",
  // Fuel provider URL — overridden by NEXT_PUBLIC_FUEL_PROVIDER_URL at runtime
  providerUrl: "https://testnet.fuel.network/v1/graphql",
});
