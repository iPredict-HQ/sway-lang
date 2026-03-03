// Stub module for unused peer dependencies of @fuels/connectors.
// @fuels/connectors bundles Solana and EVM connectors that we don't use.
// This file provides a minimal export so webpack can resolve the imports
// without pulling in @solana/web3.js, @wagmi/connectors, rpc-websockets, etc.

const handler = {
  get(_, prop) {
    if (prop === "__esModule") return true;
    if (prop === "default") return new Proxy({}, handler);
    // Return a constructor-like function for classes (e.g. PublicKey)
    return function StubClass() {
      return new Proxy({}, handler);
    };
  },
  apply() {
    return new Proxy({}, handler);
  },
  construct() {
    return new Proxy({}, handler);
  },
};

module.exports = new Proxy(function () {}, handler);
module.exports.default = module.exports;
