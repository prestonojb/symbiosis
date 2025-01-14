import { ethers } from "ethers";
import { toReadableAmount } from "./conversion";
import { BalanceReport, CHAIN_CONFIG, CHAIN_NAMES, RPC_PROVIDER_BY_CHAIN, Token } from "./mappings";
import { fetchSymbiosisSwap, waitSymbiosisTransactionSuccess } from "./symbiosis_api";
import { config } from "./config";
import { getTokenBalance, getTokenTransferApprovalOptional, sendTransaction } from "./providers";

const SWAP_IN_RPC_PROVIDER = new ethers.providers.JsonRpcProvider(
  `${RPC_PROVIDER_BY_CHAIN[config.SWAP_IN_CHAINID]}${config.PROVIDER_API_KEY}`,
);

const SWAP_OUT_RPC_PROVIDER = new ethers.providers.JsonRpcProvider(
  `${RPC_PROVIDER_BY_CHAIN[config.SWAP_OUT_CHAINID]}${config.PROVIDER_API_KEY}`,
);

const SWAP_IN_WALLET = new ethers.Wallet(config.PRIVATE_KEY, SWAP_IN_RPC_PROVIDER);

const WALLET_ADDRESS = SWAP_IN_WALLET.address;

async function getBalanceReport(): Promise<BalanceReport> {
  const swapInBalance = await getTokenBalance(
    SWAP_IN_RPC_PROVIDER,
    WALLET_ADDRESS,
    config.SWAP_IN_TOKEN,
  );

  const swapOutBalance = await getTokenBalance(
    SWAP_OUT_RPC_PROVIDER,
    WALLET_ADDRESS,
    config.SWAP_OUT_TOKEN,
  );

  return {
    in: {
      token: config.SWAP_IN_TOKEN,
      amount: swapInBalance,
      readableAmount: toReadableAmount(swapInBalance, config.SWAP_IN_TOKEN.decimals),
    },
    out: {
      token: config.SWAP_OUT_TOKEN,
      amount: swapOutBalance,
      readableAmount: toReadableAmount(swapOutBalance, config.SWAP_OUT_TOKEN.decimals),
    },
  };
}

async function printBalances() {
  const balanceReport = await getBalanceReport();

  console.log(
    `wallet balance:`,
    `[in] ${CHAIN_NAMES[balanceReport.in.token.chain]} chain: ${balanceReport.in.readableAmount}${
      balanceReport.in.token.symbol
    };`,
    `[out] ${CHAIN_NAMES[balanceReport.out.token.chain]} chain: ${
      balanceReport.out.readableAmount
    }${balanceReport.out.token.symbol}`,
  );

  console.log();
}

async function approveTokenSpending(to: string) {
  const receipt = await getTokenTransferApprovalOptional(
    SWAP_IN_RPC_PROVIDER,
    config.SWAP_IN_TOKEN,
    SWAP_IN_WALLET,
    to,
    config.SWAP_IN_AMOUNT,
  );

  if (receipt === null) {
    console.log(
      `no token approval required for ${config.SWAP_IN_AMOUNT}${config.SWAP_IN_TOKEN.symbol} (${config.SWAP_IN_TOKEN.chain} chain) token spending`,
    );
    return;
  }

  if (receipt.status === 1) {
    console.log(
      `approved ${config.SWAP_IN_AMOUNT}${config.SWAP_IN_TOKEN.symbol} (${
        CHAIN_NAMES[config.SWAP_IN_TOKEN.chain]
      } chain) token transfer allowance, tx hash=${receipt.transactionHash}}`,
    );
  } else {
    throw new Error(`token approval tx failed, tx hash=${receipt.transactionHash}`);
  }
}

async function executeSwap(txData: string, txValue: string, txTo: string) {
  const chainConfig = CHAIN_CONFIG[config.SWAP_IN_CHAINID];

  const txReq: ethers.providers.TransactionRequest = {
    data: txData,
    value: txValue,
    from: WALLET_ADDRESS,
    to: txTo,
    gasLimit: chainConfig.gasLimit,
    maxFeePerGas: chainConfig.maxFeesPerGas,
    maxPriorityFeePerGas: chainConfig.maxFeesPerGas,
  };

  const receipt = await sendTransaction(txReq, SWAP_IN_WALLET);
  if (receipt.status === 1) {
    console.log(
      `executed swap tx on ${CHAIN_NAMES[config.SWAP_IN_TOKEN.chain]} with hash: ${
        receipt.transactionHash
      }, pending settlement from Symbiosis API`,
    );

    // swap is omnichain hence rely on symbiosis API to determine finality of swap
    const swapSucceeded = await waitSymbiosisTransactionSuccess(
      config.SWAP_IN_CHAINID,
      receipt.transactionHash,
    );
    if (!swapSucceeded) {
      throw new Error(`cross-chain swap not registered on Symbiosis API, may be stucked`);
    }

    return;
  } else {
    throw new Error(
      `swap tx failed on chain: ${config.SWAP_IN_TOKEN.chain} with hash: ${receipt.transactionHash}`,
    );
  }
}

function sinceSeconds(start: number): number {
  return (Date.now() - start) / 1000;
}

async function main() {
  console.log(
    `executing cross-chain swap for wallet ${WALLET_ADDRESS}:
        [in] ${config.SWAP_IN_AMOUNT}${config.SWAP_IN_TOKEN.symbol} (${
      CHAIN_NAMES[config.SWAP_IN_TOKEN.chain]
    } chain) -> [out] ${config.SWAP_OUT_TOKEN.symbol} (${
      CHAIN_NAMES[config.SWAP_OUT_TOKEN.chain]
    } chain)`,
  );

  await printBalances();

  console.log(`fetch Symbiosis API swap data`);

  const swapResponse = await fetchSymbiosisSwap(
    config.SWAP_IN_TOKEN,
    config.SWAP_IN_AMOUNT,
    config.SWAP_OUT_TOKEN,
    WALLET_ADDRESS,
    WALLET_ADDRESS,
    config.SLIPPAGE_TOLERANCE,
  );

  console.log(
    `fetched Symbiosis API swap data,
    token in: ${config.SWAP_IN_AMOUNT}${config.SWAP_IN_TOKEN.symbol},
    suggested min token out: ${toReadableAmount(
      ethers.BigNumber.from(swapResponse.tokenAmountOutMin.amount),
      swapResponse.tokenAmountOutMin.decimals,
    )}${config.SWAP_OUT_TOKEN.symbol},
    estimated time: ${swapResponse.estimatedTime}s`,
  );

  console.log();

  const approvalStartedAt = Date.now();

  console.log(
    `approve token spending for ${config.SWAP_IN_AMOUNT}${config.SWAP_IN_TOKEN.symbol} (${
      CHAIN_NAMES[config.SWAP_IN_TOKEN.chain]
    } chain) for address ${swapResponse.approveTo}`,
  );

  await approveTokenSpending(swapResponse.approveTo);

  console.log(`approved token spending, took ${sinceSeconds(approvalStartedAt)}s`);

  console.log();

  const swapStartedAt = Date.now();

  console.log("execute cross chain swap");

  await executeSwap(swapResponse.tx.data, swapResponse.tx.value, swapResponse.tx.to);

  console.log(`executed cross chain swap, took ${sinceSeconds(swapStartedAt)}s`);

  await printBalances();
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });
