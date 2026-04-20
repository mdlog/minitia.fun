import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";

const Discovery = lazy(() => import("@/pages/Discovery"));
const Launchpad = lazy(() => import("@/pages/Launchpad"));
const Trade = lazy(() => import("@/pages/Trade"));
const Graduation = lazy(() => import("@/pages/Graduation"));
const Airdrops = lazy(() => import("@/pages/Airdrops"));
const Explorer = lazy(() => import("@/pages/Explorer"));
const TxDetail = lazy(() => import("@/pages/TxDetail"));
const BlockDetail = lazy(() => import("@/pages/BlockDetail"));
const UserProfile = lazy(() => import("@/pages/UserProfile"));

function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex items-center gap-3 rounded-xl surface-card px-5 py-3 ghost-border text-on-surface-variant">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="font-mono text-[0.68rem] uppercase tracking-[0.22em]">Loading…</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppShell>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Discovery />} />
          <Route path="/launchpad" element={<Launchpad />} />
          <Route path="/trade/:symbol" element={<Trade />} />
          <Route path="/graduation/:symbol" element={<Graduation />} />
          <Route path="/graduation" element={<Navigate to="/graduation/MOVE" replace />} />
          <Route path="/airdrops" element={<Airdrops />} />
          <Route path="/explorer" element={<Explorer />} />
          <Route path="/tx/:hash" element={<TxDetail />} />
          <Route path="/block/:height" element={<BlockDetail />} />
          <Route path="/u/:address" element={<UserProfile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}
