import { BigNumber, ethers } from "ethers";
import { Token } from "./mappings";
import { fromReadableAmount } from "./conversion";
import ERC20_ABI from "./abis/erc20.json";

export async function getTokenTransferApprovalOptional(
  provider: ethers.providers.JsonRpcProvider,
  token: Token,
  from: ethers.Wallet,
  to: string,
  readableAmount: string,
): Promise<ethers.providers.TransactionReceipt | null> {
  // native tokens do not require allowance
  if (token.address == ethers.constants.AddressZero) {
    return null;
  }

  // technically non-ERC20 tokens can have allowance, and we assume they share the same allowance() ABI as ERC20
  const tokenContract = new ethers.Contract(token.address, ERC20_ABI, provider);

  if (await hasSufficientTokenAllowance(tokenContract, token, from, to, readableAmount)) {
    return null;
  }

  const receipt = await getTokenTransferApproval(tokenContract, token, from, to, readableAmount);

  return receipt;
}

export async function sendTransaction(
  tx: ethers.providers.TransactionRequest,
  signer: ethers.Signer,
): Promise<ethers.providers.TransactionReceipt> {
  const res = await signer.sendTransaction(tx);

  return await res.wait();
}

// returns actual balance returned by contract without conversion
export async function getTokenBalance(
  provider: ethers.providers.Provider,
  address: string,
  token: Token,
): Promise<BigNumber> {
  if (token.address == ethers.constants.AddressZero) {
    const balance = await provider.getBalance(address);
    return balance;
  }

  const tokenContract = new ethers.Contract(token.address, ERC20_ABI, provider);

  const balance = await tokenContract.balanceOf(address);
  return balance;
}

async function hasSufficientTokenAllowance(
  tokenContract: ethers.Contract,
  token: Token,
  from: ethers.Wallet,
  to: string,
  readableAmount: string,
): Promise<boolean> {
  try {
    const allowance = await tokenContract.allowance(from.address, to);

    return allowance.gte(fromReadableAmount(readableAmount, token.decimals));
  } catch (e) {
    console.log(`no allowance ABI in contract, assume no approvals required for token spending`);

    return true;
  }
}

async function getTokenTransferApproval(
  tokenContract: ethers.Contract,
  token: Token,
  from: ethers.Wallet,
  to: string,
  readableAmount: string,
): Promise<ethers.providers.TransactionReceipt> {
  const transaction = await tokenContract.populateTransaction.approve(
    to,
    fromReadableAmount(readableAmount, token.decimals).toString(),
  );

  const receipt = await sendTransaction({ ...transaction, from: from.address }, from);

  return receipt;
}
