#!/usr/bin/env bash
# Deploy minitia.fun v2 Move modules + initialize all registries to the
# freshly-launched rollup. Run after `weave rollup launch` is complete and
# the chain is producing blocks at localhost:36657.
#
# Reuses the existing gas-station key (same bech32 as v1). Because weave
# pre-funded gas-station with 10M MIN at genesis, no extra faucet step is
# needed.
#
# Usage:
#   bash scripts/deploy-v2.sh [CHAIN_ID] [RPC_URL]
#
# Defaults target the v2 local rollup.

set -euo pipefail

CHAIN_ID="${1:-minitia-fun-v2-1}"
RPC="${2:-tcp://localhost:36657}"

MINIMOVE_DIR="$HOME/.weave/data/minimove@v1.1.11"
export LD_LIBRARY_PATH="$MINIMOVE_DIR:${LD_LIBRARY_PATH:-}"
MINI="$MINIMOVE_DIR/minitiad"

REGISTRY='"0xC0A7DD6C8EA3CCB58831B2878FB7365AF7BE5B80"'
SCRIPT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
CONTRACTS_DIR="$SCRIPT_DIR/../contracts"

echo "=== 0. sanity check ==="
$MINI status --home ~/.minitia --node "$RPC" 2>&1 | grep -o 'network":"[^"]*' | head -1
$MINI keys show gas-station --keyring-backend test --home ~/.minitia --output json | python3 -c 'import json,sys;a=json.load(sys.stdin);print("gas-station:",a["address"])'

echo
echo "=== 1. build Move modules ==="
cd "$CONTRACTS_DIR"
$MINI move build

echo
echo "=== 2. publish modules to $CHAIN_ID ==="
$MINI move deploy \
  --from gas-station \
  --chain-id "$CHAIN_ID" \
  --keyring-backend test \
  --home ~/.minitia \
  --node "$RPC" \
  --gas auto --gas-adjustment 1.4 \
  -y

echo
echo "=== 3. initialize token_factory ==="
$MINI tx move execute 0xC0A7DD6C8EA3CCB58831B2878FB7365AF7BE5B80 token_factory initialize \
  --from gas-station \
  --chain-id "$CHAIN_ID" \
  --keyring-backend test \
  --home ~/.minitia \
  --node "$RPC" \
  --gas auto --gas-adjustment 1.4 \
  -y
sleep 3

echo
echo "=== 4. initialize bonding_curve ==="
$MINI tx move execute 0xC0A7DD6C8EA3CCB58831B2878FB7365AF7BE5B80 bonding_curve initialize \
  --from gas-station \
  --chain-id "$CHAIN_ID" \
  --keyring-backend test \
  --home ~/.minitia \
  --node "$RPC" \
  --gas auto --gas-adjustment 1.4 \
  -y
sleep 3

echo
echo "=== 5. initialize bonding_curve custody vault ==="
$MINI tx move execute 0xC0A7DD6C8EA3CCB58831B2878FB7365AF7BE5B80 bonding_curve initialize_custody \
  --from gas-station \
  --chain-id "$CHAIN_ID" \
  --keyring-backend test \
  --home ~/.minitia \
  --node "$RPC" \
  --gas auto --gas-adjustment 1.4 \
  -y
sleep 3

echo
echo "=== 6. initialize liquidity_migrator ==="
$MINI tx move execute 0xC0A7DD6C8EA3CCB58831B2878FB7365AF7BE5B80 liquidity_migrator initialize \
  --from gas-station \
  --chain-id "$CHAIN_ID" \
  --keyring-backend test \
  --home ~/.minitia \
  --node "$RPC" \
  --gas auto --gas-adjustment 1.4 \
  -y
sleep 3

echo
echo "=== 7. verify with a view call ==="
$MINI query move view 0xC0A7DD6C8EA3CCB58831B2878FB7365AF7BE5B80 token_factory count \
  --args "address:$REGISTRY" \
  --node "$RPC" 2>&1 | head -20 || true

echo
echo "=== DONE ==="
echo "chain:    $CHAIN_ID"
echo "rpc:      $RPC"
echo "modules:  0xC0A7DD6C8EA3CCB58831B2878FB7365AF7BE5B80 (token_factory, bonding_curve, liquidity_migrator)"
echo
echo "Next: update src/lib/initia.ts with chain_id=$CHAIN_ID (if different from current),"
echo "then reload the frontend."
