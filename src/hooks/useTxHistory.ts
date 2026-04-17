import { useCallback, useEffect, useState } from "react";

export type TxKind = "deploy" | "buy" | "sell" | "claim" | "launch" | "other";

export interface TxRecord {
  hash: string;
  kind: TxKind;
  chainId: string;
  summary: string;
  timestamp: number;
  subdomain?: string;
}

const STORAGE_KEY = "minitia.tx_history.v1";
const MAX_RECORDS = 25;

function scopedKey(address: string | null | undefined) {
  return address ? `${STORAGE_KEY}:${address}` : STORAGE_KEY;
}

function load(address?: string | null): TxRecord[] {
  try {
    const raw = localStorage.getItem(scopedKey(address));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(address: string | null | undefined, records: TxRecord[]) {
  try {
    localStorage.setItem(scopedKey(address), JSON.stringify(records.slice(0, MAX_RECORDS)));
  } catch {
    /* quota exceeded — drop silently */
  }
}

/**
 * Persists recent transaction records per-address in localStorage so users can
 * re-visit their history after a reload. Bounded at 25 entries per address.
 */
export function useTxHistory(address?: string | null) {
  const [records, setRecords] = useState<TxRecord[]>(() => load(address));

  useEffect(() => {
    setRecords(load(address));
  }, [address]);

  const push = useCallback(
    (record: Omit<TxRecord, "timestamp"> & { timestamp?: number }) => {
      setRecords((prev) => {
        const next = [
          { ...record, timestamp: record.timestamp ?? Date.now() },
          ...prev.filter((r) => r.hash !== record.hash),
        ].slice(0, MAX_RECORDS);
        save(address, next);
        return next;
      });
    },
    [address],
  );

  const clear = useCallback(() => {
    save(address, []);
    setRecords([]);
  }, [address]);

  return { records, push, clear };
}
