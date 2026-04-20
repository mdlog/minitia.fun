import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import ExplorerApp from "./ExplorerApp";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToastProvider } from "./components/ui/Toast";
import { Web3Providers } from "./providers/Web3Providers";
import "./index.css";

/**
 * Entry point for the standalone explorer surface (explorer.minitia.fun).
 * Runs on its own port (vite.explorer.config.ts -> 5175 by default) and
 * ships a limited route tree focused on block / tx / address lookups.
 * Shares every provider + design primitive with the main app via file
 * imports, so keeping the two deploys in sync requires no duplication.
 */
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Web3Providers>
        <ToastProvider>
          <BrowserRouter>
            <ExplorerApp />
          </BrowserRouter>
        </ToastProvider>
      </Web3Providers>
    </ErrorBoundary>
  </React.StrictMode>,
);
