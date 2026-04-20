import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { ExplorerShell } from "@/components/layout/ExplorerShell";

const ExplorerHome = lazy(() => import("@/pages/ExplorerHome"));
const TxDetail = lazy(() => import("@/pages/TxDetail"));
const BlockDetail = lazy(() => import("@/pages/BlockDetail"));
const UserProfile = lazy(() => import("@/pages/UserProfile"));

function Fallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex items-center gap-3 rounded-xl surface-card px-5 py-3 ghost-border text-on-surface-variant">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="font-mono text-[0.68rem] uppercase tracking-[0.22em]">Loading…</span>
      </div>
    </div>
  );
}

/**
 * Explorer-only router. Every route resolves under explorer.minitia.fun
 * (or localhost:5175 in dev). `/` is the explorer landing; `/tx/:hash`,
 * `/block/:height`, and `/u/:address` are the drill-down surfaces.
 * Unknown paths redirect to the landing instead of showing a 404 — users
 * landing here often arrived from deep links that may no longer resolve
 * after an RPC reset.
 */
export default function ExplorerApp() {
  return (
    <ExplorerShell>
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route path="/" element={<ExplorerHome />} />
          <Route path="/explorer" element={<Navigate to="/" replace />} />
          <Route path="/tx/:hash" element={<TxDetail />} />
          <Route path="/block/:height" element={<BlockDetail />} />
          <Route path="/u/:address" element={<UserProfile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ExplorerShell>
  );
}
