import dotenv from "dotenv";
import path from "path";
import { AVAILABLE_TOKENS, Chain, CHAIN_NAMES, Token } from "./mappings";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

interface Config {
  PROVIDER_API_KEY: string;

  SWAP_IN_CHAINID: Chain;
  SWAP_IN_AMOUNT: string;

  SLIPPAGE_TOLERANCE: number;

  SWAP_OUT_CHAINID: Chain;

  PRIVATE_KEY: string;

  SWAP_IN_TOKEN: Token;
  SWAP_OUT_TOKEN: Token;

  SYMBIOSIS_API_BASE_URL: string;
  SYMBIOSIS_API_TX_MAX_POLLS: number;
  SYMBIOSIS_API_TX_POLL_INTERVAL_MS: number;
}

function loadConfig(): Config {
  let config: Config = {
    PROVIDER_API_KEY: process.env.PROVIDER_API_KEY as string,

    SWAP_IN_CHAINID: process.env.SWAP_IN_CHAINID as unknown as Chain,

    SWAP_IN_AMOUNT: process.env.SWAP_IN_AMOUNT as string,

    SLIPPAGE_TOLERANCE: parseFloat(process.env.SLIPPAGE_TOLERANCE ?? ("300" as string)),

    SWAP_OUT_CHAINID: process.env.SWAP_OUT_CHAINID as unknown as Chain,

    PRIVATE_KEY: process.env.PRIVATE_KEY as string,

    SWAP_IN_TOKEN: {} as Token,
    SWAP_OUT_TOKEN: {} as Token,

    SYMBIOSIS_API_BASE_URL:
      process.env.SYMBIOSIS_API_BASE_URL ?? ("https://api.symbiosis.finance/crosschain" as string),
    SYMBIOSIS_API_TX_MAX_POLLS: parseInt(process.env.SYMBIOSIS_API_TX_POLL_INTERVAL ?? "15"), // txs take ~10m to be published by Symbiosis API
    SYMBIOSIS_API_TX_POLL_INTERVAL_MS: parseInt(
      process.env.SYMBIOSIS_API_TX_POLL_INTERVAL_MS ?? "60000",
    ),
  };

  if (config.SWAP_IN_CHAINID === undefined) {
    throw new Error("SWAP_IN_CHAINID is required");
  }

  if (config.SWAP_IN_AMOUNT === undefined) {
    throw new Error("SWAP_IN_AMOUNT is required");
  }

  if (config.SWAP_OUT_CHAINID === undefined) {
    throw new Error("SWAP_OUT_CHAINID is required");
  }

  if (config.SWAP_OUT_CHAINID === undefined) {
    throw new Error("SWAP_OUT_CHAINID is required");
  }

  if (config.PRIVATE_KEY === "") {
    throw new Error("PRIVATE_KEY is required");
  }

  if (config.PROVIDER_API_KEY === "") {
    throw new Error("PROVIDER_API_KEY is required");
  }

  const swapInTokenSymbol = process.env.SWAP_IN_TOKEN_SYMBOL as string;

  const swapInToken = AVAILABLE_TOKENS[config.SWAP_IN_CHAINID]?.[swapInTokenSymbol];
  if (swapInToken === undefined) {
    throw new Error(`${CHAIN_NAMES[config.SWAP_IN_CHAINID]} ${swapInTokenSymbol} is not available`);
  } else {
    config.SWAP_IN_TOKEN = swapInToken;
  }

  const swapOutTokenSymbol = process.env.SWAP_OUT_TOKEN_SYMBOL as string;

  const swapOutToken = AVAILABLE_TOKENS[config.SWAP_OUT_CHAINID]?.[swapOutTokenSymbol];

  if (swapOutToken === undefined) {
    throw new Error(
      `${CHAIN_NAMES[config.SWAP_OUT_CHAINID]} ${swapOutTokenSymbol} is not available`,
    );
  } else {
    config.SWAP_OUT_TOKEN = swapOutToken;
  }

  return config;
}

export const config = loadConfig();
