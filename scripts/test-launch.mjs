import { SigningStargateClient, GasPrice, AminoTypes, defaultRegistryTypes } from "@cosmjs/stargate";
import { Registry, DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { stringToPath } from "@cosmjs/crypto";
import { MsgExecuteJSON } from "@initia/initia.proto/initia/move/v1/tx.js";
import { aminoConverters, protoRegistry } from "@initia/amino-converter";

// Use Gas Station mnemonic with cosmos derivation (coin_type 118) to test cosmjs path.
// Note: this won't match init1czna... (which uses coin_type 60 / eth_secp256k1)
// but it'll prove the encoding works without wallet popup.

const MNEMONIC = "youth tortoise income submit pony useless fly garage reveal weekend make cook wild basic tuition door pull apple throw raise vessel page portion account";
const RPC = "https://rpc.minitia.fun";

(async () => {
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(MNEMONIC, {
    prefix: "init",
    hdPaths: [stringToPath("m/44'/118'/0'/0/0")],
  });
  const [account] = await wallet.getAccounts();
  console.log("Sender:", account.address);

  const registry = new Registry([...defaultRegistryTypes, ...protoRegistry]);
  registry.register("/initia.move.v1.MsgExecuteJSON", MsgExecuteJSON);
  const aminoTypes = new AminoTypes({ ...aminoConverters });

  const client = await SigningStargateClient.connectWithSigner(RPC, wallet, {
    registry, aminoTypes,
    gasPrice: GasPrice.fromString("0.15umin"),
  });

  const msg = {
    typeUrl: "/initia.move.v1.MsgExecuteJSON",
    value: MsgExecuteJSON.fromPartial({
      sender: account.address,
      moduleAddress: "0xC0A7DD6C8EA3CCB58831B2878FB7365AF7BE5B80",
      moduleName: "token_factory",
      functionName: "launch",
      typeArgs: [],
      args: ['"0xC0A7DD6C8EA3CCB58831B2878FB7365AF7BE5B80"', '"NODEJS"', '"Node JS Proof"', '"Direct cosmjs broadcast end-to-end test"'],
    }),
  };

  console.log("Broadcasting...");
  try {
    const result = await client.signAndBroadcast(account.address, [msg], "auto", "test from node");
    console.log("HASH:", result.transactionHash);
    console.log("CODE:", result.code);
    console.log("HEIGHT:", result.height);
    if (result.code !== 0) console.log("LOG:", result.rawLog);
  } catch (e) {
    console.error("FAIL:", e.message);
  }
})();
