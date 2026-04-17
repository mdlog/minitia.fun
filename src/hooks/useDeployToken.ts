import { useTxAction } from "@/hooks/useTxAction";

export interface DeployTokenPayload {
  name: string;
  ticker: string;
  description?: string;
}

/**
 * Thin wrapper over `useTxAction` — submits a `deploy_token` tx with
 * token metadata in memo. Uses MsgSend self-transfer as proof-of-pipeline
 * until the Move `token_factory::mint` entry function is wired.
 */
export function useDeployToken() {
  const { execute, isPending } = useTxAction();

  const deploy = async ({ name, ticker, description }: DeployTokenPayload) => {
    const cleanTicker = ticker.trim().toUpperCase();
    const subdomain = `${ticker.trim().toLowerCase() || "token"}.fun.init`;

    return execute({
      kind: "deploy",
      summary: `Deploy $${cleanTicker}`,
      memoAction: "deploy_token",
      metadata: {
        name: name.trim(),
        ticker: cleanTicker,
        subdomain,
        description: description?.trim() ?? "",
      },
    });
  };

  return { deploy, isPending };
}
