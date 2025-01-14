import { ethers } from "ethers";
import { config } from "./config";
import { fromReadableAmount } from "./conversion";
import { Chain, CHAIN_NAMES, Token } from "./mappings";

interface SwapRequest {
  tokenAmountIn: {
    chainId: number;
    address: string;
    decimals: number;
    amount: string;
  };
  tokenOut: {
    chainId: number;
    address: string;
    decimals: number;
  };
  from: string;
  to: string;
  slippage: number;
}

interface SwapResponse {
  tx: {
    chainId: number;
    to: string;
    data: string;
    value: string;
  };
  fee: number;
  priceImpact: string;
  tokenAmountOut: SwapResponseTokenAmountOut;
  tokenAmountOutMin: SwapResponseTokenAmountOut;
  amountInUsd: SwapResponseTokenAmountOut;
  approveTo: string;
  type: string;
  estimatedTime: number;
}

interface SwapResponseTokenAmountOut {
  chainId: number;
  address: string;
  decimals: number;
  symbol: string;
  amount: string;
}

interface TransactionResponse {
  status: TransactionStatus;
  tx: TransactionResponseTransactionDetails;
  txIn: TransactionResponseTransactionDetails;
}

interface TransactionStatus {
  code: TransactionStatusCode;
  text: string;
}

enum TransactionStatusCode {
  NOT_FOUND = -1,
  PENDING = 1,
  SUCCESS = 0,
  STUCKED = 2,
  REVERTED = 3,
}

interface TransactionResponseTransactionDetails {
  hash: string;
  chainId: number;
  tokenAmount: TransactionResponseCrossChainTokenAmount;
  time: string;
  address: string;
}

interface TransactionResponseCrossChainTokenAmount {
  address: string;
  chainId: number;
  chainIdFrom: number;
  decimals: number;
  symbol: string;
  amount: string;
}

const HTTP_HEADERS = {
  accept: "application/json",
  "Content-Type": "application/json",
};

export async function fetchSymbiosisSwap(
  tokenIn: Token,
  tokenInAmount: string,
  tokenOut: Token,
  from: string,
  to: string,
  slippageTolerance: number,
): Promise<SwapResponse> {
  const swapRequest: SwapRequest = {
    tokenAmountIn: {
      address: tokenIn.address !== ethers.constants.AddressZero ? tokenIn.address : "",
      chainId: tokenIn.chain,
      decimals: tokenIn.decimals,
      amount: fromReadableAmount(tokenInAmount, tokenIn.decimals).toString(),
    },
    tokenOut: {
      address: tokenOut.address !== ethers.constants.AddressZero ? tokenOut.address : "",
      chainId: tokenOut.chain,
      decimals: tokenOut.decimals,
    },
    from: from,
    to: to,
    slippage: slippageTolerance,
  };

  const url = `${config.SYMBIOSIS_API_BASE_URL}/v1/swap`;

  const response = await fetch(url, {
    method: "POST",
    headers: HTTP_HEADERS,
    body: JSON.stringify(swapRequest),
  });
  if (!response.ok) {
    throw new Error(`fetch POST url: ${url}, got non-OK status code: ${response.status}`);
  }

  const data = await response.json();

  return data as SwapResponse;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// returns false if transaction is stucked or timeout
// timeout ~= max_polls * poll_interval
export async function waitSymbiosisTransactionSuccess(
  chain: Chain,
  txHash: string,
): Promise<boolean> {
  const url = `${config.SYMBIOSIS_API_BASE_URL}/v1/tx/${chain}/${txHash}`;

  let pollCount = 0;

  while (pollCount <= config.SYMBIOSIS_API_TX_MAX_POLLS) {
    const response = await fetch(url, {
      method: "GET",
      headers: HTTP_HEADERS,
    });

    pollCount++;

    if (response.status == 404) {
      console.log(
        `remaining txs on non-source chains are not yet published by Symbiosis API, wait for ${
          config.SYMBIOSIS_API_TX_POLL_INTERVAL_MS / 1000
        }s...`,
      );

      await sleep(config.SYMBIOSIS_API_TX_POLL_INTERVAL_MS);

      continue;
    }

    if (!response.ok) {
      throw new Error(
        `fetch GET url: ${url}, got non-OK and non-404 status code: ${response.status}`,
      );
    }

    const res = (await response.json()) as TransactionResponse;

    if (
      res.status.code == TransactionStatusCode.NOT_FOUND ||
      res.status.code == TransactionStatusCode.PENDING
    ) {
      console.log(
        `remaining tx on non-source chains are not yet published by Symbiosis API, wait for ${
          config.SYMBIOSIS_API_TX_POLL_INTERVAL_MS / 1000
        }s...`,
      );

      await sleep(config.SYMBIOSIS_API_TX_POLL_INTERVAL_MS);
      continue;
    }

    if (res.status.code == TransactionStatusCode.SUCCESS) {
      console.log(
        `swap tx on ${CHAIN_NAMES[res.tx.chainId as Chain]} with hash ${
          res.tx.hash
        } is successful, cross-chain swap complete`,
      );

      return true;
    }

    if (res.status.code == TransactionStatusCode.STUCKED) {
      return false;
    }
  }

  return false;
}
