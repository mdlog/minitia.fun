import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useInterwovenKit } from "@initia/interwovenkit-react";
import { APPCHAIN, APPCHAIN_RPC_AVAILABLE } from "@/lib/initia";
import { useToast } from "@/components/ui/Toast";

const MSG_EXECUTE_JSON = "/initia.move.v1.MsgExecuteJSON";

export interface CommentRow {
  /** 0-indexed thread position. Newest = highest index. */
  index: number;
  author: string;
  body: string;
  /** Event-derived tx block height (enriched from tx_search). */
  blockHeight: number;
  /** Tx hash that emitted the CommentPosted event. */
  hash: string;
}

interface MoveEventAttr {
  key?: string;
  value?: string;
}
interface MoveEvent {
  type?: string;
  attributes?: MoveEventAttr[];
}

/** Fetches recent comments for a ticker by scanning CommentPosted events.
 *  Using tx_search instead of the on-chain `recent_comments` view gives us
 *  real tx hashes + block heights for each row (the Move struct has no way
 *  to expose those natively). */
type TxRow = {
  hash?: string;
  height?: string;
  tx_result?: { code?: number; events?: MoveEvent[] };
};

async function fetchByAction(action: string, perPage: number): Promise<TxRow[]> {
  const query = encodeURIComponent(`"message.action='${action}'"`);
  const url = `${APPCHAIN.rpc}/tx_search?query=${query}&per_page=${perPage}&order_by=%22desc%22`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return [];
  const json = (await res.json()) as { result?: { txs?: TxRow[] } };
  return json.result?.txs ?? [];
}

async function fetchComments(ticker: string, limit: number): Promise<CommentRow[]> {
  if (!APPCHAIN_RPC_AVAILABLE || !ticker) return [];
  const perPage = Math.max(100, limit * 4);
  const [direct, wrapped] = await Promise.all([
    fetchByAction("/initia.move.v1.MsgExecuteJSON", perPage),
    fetchByAction("/cosmos.authz.v1beta1.MsgExec", perPage),
  ]);
  const txs = [...direct, ...wrapped].sort(
    (a, b) => Number(b.height ?? 0) - Number(a.height ?? 0),
  );
  const out: CommentRow[] = [];
  for (const tx of txs) {
    if ((tx.tx_result?.code ?? 1) !== 0) continue;
    const events = tx.tx_result?.events ?? [];
    for (const ev of events) {
      if (ev.type !== "move") continue;
      const attrs: Record<string, string> = {};
      for (const a of ev.attributes ?? []) {
        if (a.key && a.value !== undefined) attrs[a.key] = a.value;
      }
      if (!attrs.type_tag?.endsWith("::comments::CommentPosted")) continue;
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(attrs.data ?? "{}") as Record<string, unknown>;
      } catch {
        continue;
      }
      const evTicker = String(data.ticker ?? "").toUpperCase();
      if (evTicker !== ticker.toUpperCase()) continue;
      out.push({
        index: Number(data.index ?? 0),
        author: String(data.author ?? ""),
        body: String(data.body ?? ""),
        blockHeight: Number(tx.height ?? 0),
        hash: tx.hash ?? "",
      });
      if (out.length >= limit) return out;
    }
  }
  return out;
}

export function useComments(ticker: string, limit = 30, pollMs = 12_000) {
  return useQuery({
    queryKey: ["comments", APPCHAIN.rpc, ticker, limit],
    queryFn: () => fetchComments(ticker, limit),
    enabled: APPCHAIN_RPC_AVAILABLE && Boolean(ticker),
    refetchInterval: pollMs,
    staleTime: 6_000,
    retry: 1,
  });
}

export function useCommentPost() {
  const kit = useInterwovenKit();
  const toast = useToast();
  const [isPending, setPending] = useState(false);

  const post = useCallback(
    async (ticker: string, body: string): Promise<boolean> => {
      if (!APPCHAIN_RPC_AVAILABLE) {
        toast.push({ tone: "error", title: "Appchain RPC unavailable" });
        return false;
      }
      if (!kit.isConnected || !kit.initiaAddress) {
        toast.push({ tone: "info", title: "Connect a wallet to post" });
        kit.openConnect();
        return false;
      }
      const trimmed = body.trim();
      if (!trimmed) return false;
      if (trimmed.length > 280) {
        toast.push({ tone: "error", title: "Max 280 characters" });
        return false;
      }

      const pendingId = toast.push({
        tone: "loading",
        title: `Posting to $${ticker.toUpperCase()}`,
        description: "Signing comments::post…",
      });
      setPending(true);
      try {
        const messages = [
          {
            typeUrl: MSG_EXECUTE_JSON,
            value: {
              sender: kit.initiaAddress,
              moduleAddress: APPCHAIN.deployedAddress,
              moduleName: "comments",
              functionName: "post",
              typeArgs: [],
              args: [
                `"${APPCHAIN.deployedAddress}"`,
                JSON.stringify(ticker.toUpperCase()),
                JSON.stringify(trimmed),
              ],
            },
          },
        ];
        const memo = JSON.stringify({
          app: "minitia.fun",
          action: "comment",
          ticker: ticker.toUpperCase(),
          ts: Date.now(),
        });
        const result = await kit.requestTxBlock({
          chainId: APPCHAIN.chainId,
          messages,
          memo,
        });
        if (result.code !== 0) {
          throw new Error(result.rawLog || `code ${result.code}`);
        }
        const explorerUrl = `${APPCHAIN.rpc}/tx?hash=0x${result.transactionHash}`;
        toast.update(pendingId, {
          tone: "success",
          title: "Comment posted",
          description: `height ${result.height}`,
          link: { href: explorerUrl, label: "View tx" },
        });
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        toast.update(pendingId, {
          tone: "error",
          title: "Post failed",
          description: msg.slice(0, 240),
        });
        return false;
      } finally {
        setPending(false);
      }
    },
    [kit, toast],
  );

  return { post, isPending };
}
