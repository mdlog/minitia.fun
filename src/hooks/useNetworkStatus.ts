import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { APPCHAIN, APPCHAIN_RPC_AVAILABLE, INITIA } from "@/lib/initia";
import type { BlockMeta } from "./useRecentBlocks";

export interface NetworkStatus {
  blockHeight: number;
  blockTimeMs: number;
  chainId: string;
  healthy: boolean;
  source: "appchain" | "l1";
}

async function fetchStatus(rpc: string, source: "appchain" | "l1"): Promise<NetworkStatus> {
  const res = await fetch(`${rpc}/status`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`rpc status ${res.status}`);
  const json = (await res.json()) as {
    result?: {
      sync_info?: { latest_block_height?: string; latest_block_time?: string };
      node_info?: { network?: string };
    };
  };
  const sync = json.result?.sync_info;
  const height = Number(sync?.latest_block_height ?? 0);
  const blockTime = sync?.latest_block_time ? new Date(sync.latest_block_time).getTime() : 0;
  const healthy = height > 0 && Date.now() - blockTime < 120_000;
  return {
    blockHeight: height,
    blockTimeMs: blockTime,
    chainId: json.result?.node_info?.network ?? (source === "appchain" ? APPCHAIN.chainId : INITIA.chainId),
    healthy,
    source,
  };
}

function wsUrlFromRpc(rpc: string): string {
  try {
    const u = new URL(rpc);
    u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
    u.pathname = u.pathname.replace(/\/+$/, "") + "/websocket";
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    return "";
  }
}

/**
 * Polls the primary network for live block height + health.
 * Prefers the Minitia.fun appchain rollup (when VITE_APPCHAIN_RPC is set)
 * so the Network card reflects OUR own chain; falls back to L1 testnet.
 *
 * On appchain, also subscribes to the Tendermint `NewBlock` event so
 * block height + the `recentBlocks` cache update in realtime (no polling gap).
 */
export function useNetworkStatus(pollMs = 15_000) {
  const useAppchain = APPCHAIN_RPC_AVAILABLE;
  const rpc = useAppchain ? APPCHAIN.rpc : INITIA.rpc;
  const source: "appchain" | "l1" = useAppchain ? "appchain" : "l1";
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["networkStatus", rpc, source],
    queryFn: () => fetchStatus(rpc, source),
    refetchInterval: pollMs,
    staleTime: 2_000,
    retry: 1,
  });

  useEffect(() => {
    if (!useAppchain) return;
    const url = wsUrlFromRpc(rpc);
    if (!url) return;

    let ws: WebSocket | null = null;
    let closed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (closed) return;
      ws = new WebSocket(url);

      ws.onopen = () => {
        ws?.send(
          JSON.stringify({
            jsonrpc: "2.0",
            method: "subscribe",
            id: 1,
            params: { query: "tm.event='NewBlock'" },
          }),
        );
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          const value = msg?.result?.data?.value;
          const block = value?.block;
          const blockId = value?.block_id;
          if (!block?.header) return;

          const height = Number(block.header.height ?? 0);
          if (!height) return;

          const timeIso = block.header.time ?? "";
          const blockTimeMs = timeIso ? new Date(timeIso).getTime() : Date.now();

          queryClient.setQueryData<NetworkStatus>(
            ["networkStatus", rpc, source],
            (prev) => ({
              blockHeight: height,
              blockTimeMs,
              chainId: prev?.chainId ?? APPCHAIN.chainId,
              healthy: true,
              source,
            }),
          );

          const meta: BlockMeta = {
            height,
            hash: blockId?.hash ?? "",
            time: timeIso,
            numTxs: Array.isArray(block?.data?.txs) ? block.data.txs.length : 0,
            proposerAddress: block.header.proposer_address ?? "",
          };

          const entries = queryClient.getQueriesData<BlockMeta[]>({
            queryKey: ["recentBlocks", rpc],
          });
          for (const [key, list] of entries) {
            const count = Number((key as unknown[])[2]) || 20;
            const arr = list ?? [];
            if (arr.some((b) => b.height === meta.height)) continue;
            queryClient.setQueryData(key, [meta, ...arr].slice(0, count));
          }
        } catch {
          /* ignore malformed frames */
        }
      };

      ws.onclose = () => {
        if (closed) return;
        reconnectTimer = setTimeout(connect, 2000);
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [queryClient, rpc, source, useAppchain]);

  return query;
}
