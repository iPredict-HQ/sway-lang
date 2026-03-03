"use client";

import React from "react";
import { Provider } from "fuels";
import { FuelProvider } from "@fuels/react";
import {
  FuelWalletConnector,
  FueletWalletConnector,
  FuelWalletDevelopmentConnector,
  BurnerWalletConnector,
} from "@fuels/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@/hooks/useToast";

// Shim: @fuels/connectors 0.36 expects Provider.create() which was removed in
// fuels 0.100+.  Re-add it so BurnerWalletConnector (and others) work at runtime.
if (typeof (Provider as any).create !== "function") {
  (Provider as any).create = (url: string, opts?: any) =>
    Promise.resolve(new Provider(url, opts));
}

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <FuelProvider
        fuelConfig={{
          connectors: [
            new FuelWalletConnector(),
            new FueletWalletConnector(),
            new FuelWalletDevelopmentConnector(),
            new BurnerWalletConnector({ fuelProvider: undefined }),
          ],
        }}
      >
        <ToastProvider>{children}</ToastProvider>
      </FuelProvider>
    </QueryClientProvider>
  );
}
