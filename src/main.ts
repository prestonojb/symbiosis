import { BigNumber, ethers } from 'ethers';

interface TokenAmount {
  address: string;
  amount: string;
  chainId: number;
  decimals: number;
}

interface TokenOut {
  chainId: number;
  address: string;
  symbol: string;
  decimals: number;
}

interface SwapRequest {
  tokenAmountIn: TokenAmount;
  tokenOut: TokenOut;
  from: string;
  to: string;
  slippage: number;
}

interface Transaction {
  chainId: number;
  to: string;
  data: string;
  value: string;
}

interface Token {
  address: string;
  chainId: number;
  chainIdFrom: number;
  decimals: number;
  symbol: string;
  icon: string;
  amount?: string;
}

interface Fee extends Token {
  amount: string;
}

interface FeesProvider {
  provider: string;
  value: Fee;
  save: Fee;
  description: string;
}

interface TokenDetails {
  address: string;
  chainId: number;
  chainIdFrom: number;
  decimals: number;
  symbol: string;
  icon: string;
  amount: string;
}

interface TransactionDetails {
  hash: string;
  chainId: number;
  tokenAmount: TokenDetails;
  time: string;
  address: string;
}

interface TransactionStatus {
  code: number;
  text: string;
}

interface TransactionResponse {
  status: TransactionStatus;
  tx: TransactionDetails;
  txIn: TransactionDetails;
  transitTokenSent: TokenDetails;
}

interface Route {
  provider: string;
  tokens: Token[];
}

interface SwapResponse {
  tx: Transaction;
  fee: Fee;
  fees: FeesProvider[];
  route: Token[];
  routes: Route[];
  priceImpact: string;
  tokenAmountOut: Token & { amount: string };
  tokenAmountOutMin: Token & { amount: string };
  amountInUsd: Token & { amount: string };
  rewards: Token[];
  approveTo: string;
  inTradeType: string;
  outTradeType: string;
  type: string;
  kind: string;
  estimatedTime: number;
}

async function requestSwap(params: SwapRequest): Promise<SwapResponse> {
  const url = 'https://api.symbiosis.finance/crosschain/v1/swap';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Basic runtime validation
    if (!data || typeof data !== 'object' || !('tx' in data)) {
      throw new Error('Invalid response format');
    }

    return data as SwapResponse;
  } catch (error) {
    console.error('Error requesting swap:', error);
    throw error;
  }
}


async function getTransaction(chainID: string, txHash: string): Promise<TransactionResponse> {
  const url = `https://api.symbiosis.finance/crosschain/v1/${chainID}/${txHash}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Basic runtime validation
    if (!data || typeof data !== 'object' || !('tx' in data)) {
      throw new Error('Invalid response format');
    }

    return data as TransactionResponse;
  } catch (error) {
    console.error('Error requesting swap:', error);
    throw error;
  }
}

const walletAddress = "0xf93d011544e89a28b5bdbdd833016cc5f26e82cd";


// Example usage:
const swapParams: SwapRequest = {
  tokenAmountIn: {
    address: "",
    amount: "50000000000000000",
    chainId: 1, // ETH MAINET
    decimals: 18
  },
  tokenOut: {
    chainId: 5000, // MANTLE MAINNET
    address: "0xdEAddEaDdeadDEadDEADDEAddEADDEAddead1111",
    symbol: "WETH",
    decimals: 18
  },
  from: walletAddress,
  to: walletAddress,
  slippage: 300
};

export enum TransactionState {
  Failed = 'Failed',
  New = 'New',
  Rejected = 'Rejected',
  Sending = 'Sending',
  Sent = 'Sent',
}

const PROVIDER_API_KEY = "4_d6C_4P0bSJOxk4oSBAb48GG2iPqaYO";

const l1Provider = new ethers.providers.JsonRpcProvider(`https://eth-mainnet.g.alchemy.com/v2/${PROVIDER_API_KEY}`);
const l2Provider = new ethers.providers.JsonRpcProvider(`https://mantle-mainnet.g.alchemy.com/v2/${PROVIDER_API_KEY}`);

const privateKey = "";

const l1Wallet = new ethers.Wallet(privateKey, l1Provider);
const l2Wallet = new ethers.Wallet(privateKey, l2Provider);

function createWallet(): ethers.Wallet {
  return new ethers.Wallet(privateKey, l1Provider)
}

async function sendTransaction(
  transaction: ethers.providers.TransactionRequest
): Promise<TransactionState> {
  const provider = l2Provider;

  if (!provider) {
    return TransactionState.Failed
  }

  if (transaction.value) {
    transaction.value = BigNumber.from(transaction.value)
  }

  const txRes = await l2Wallet.sendTransaction(transaction)
  let receipt = null

  while (receipt === null) {
    try {
      receipt = await provider.getTransactionReceipt(txRes.hash)

      if (receipt === null) {
        continue
      }
    } catch (e) {
      console.log(`Receipt error:`, e)
      break
    }
  }

  if (receipt) {
    return TransactionState.Sent
  } else {
    return TransactionState.Failed
  }
}

(async () => {
  try {
    const response = await requestSwap(swapParams);
    console.log('Swap response:', response);
  } catch (error) {
    console.error('Error:', error);
  }
})();
