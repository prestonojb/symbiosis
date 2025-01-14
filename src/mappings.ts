import { BigNumber, ethers } from "ethers";

export enum Chain {
  ETH_MAINNET = 1,
  MANTLE_MAINNET = 5000,
}

export interface Token {
  chain: Chain;
  address: string;
  decimals: number;
  symbol: string;
}

export interface TokenAmount {
  token: Token;
  amount: BigNumber;
  readableAmount: string;
}

export interface BalanceReport {
  in: TokenAmount;
  out: TokenAmount;
}

export interface ChainConfig {
  gasLimit: string;
  maxFeesPerGas?: string;
  maxPriorityFeePerGas?: string;
}

export const CHAIN_NAMES: { [key in Chain]: string } = {
  [Chain.ETH_MAINNET]: "Ethereum",
  [Chain.MANTLE_MAINNET]: "Mantle",
};

export const CHAIN_CONFIG: { [key in Chain]: ChainConfig } = {
  [Chain.ETH_MAINNET]: {
    gasLimit: "500000", // 200000 failed for Symbiosis
    maxFeesPerGas: "20000000000", // 20 gwei
    maxPriorityFeePerGas: "20000000000", // 20 gwei
  },
  [Chain.MANTLE_MAINNET]: {
    // source: https://docs.mantle.xyz/network/system-information/fee-mechanism#fee-optimization
    gasLimit: "2000000000", // min: 2000000000, max: 200000000000
    maxFeesPerGas: "50000000",
    // `priorityFeePerGas` not recommended for MANTLE_MAINNET
  },
};

export const RPC_PROVIDER_BY_CHAIN: { [key in Chain]: string } = {
  [Chain.ETH_MAINNET]: "https://eth-mainnet.g.alchemy.com/v2/",
  [Chain.MANTLE_MAINNET]: "https://mantle-mainnet.g.alchemy.com/v2/",
};

export const AVAILABLE_TOKENS: { [key in Chain]: { [key: string]: Token } } = {
  [Chain.ETH_MAINNET]: {
    ETH: {
      symbol: "ETH",
      address: ethers.constants.AddressZero,
      chain: Chain.ETH_MAINNET,
      decimals: 18,
    },
    USDC: {
      symbol: "USDC",
      address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      chain: Chain.ETH_MAINNET,
      decimals: 6,
    },
  },
  [Chain.MANTLE_MAINNET]: {
    MNT: {
      symbol: "MNT",
      address: ethers.constants.AddressZero,
      chain: Chain.MANTLE_MAINNET,
      decimals: 18,
    },
    USDC: {
      symbol: "USDC",
      address: "0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9",
      chain: Chain.MANTLE_MAINNET,
      decimals: 6,
    },
  },
};
