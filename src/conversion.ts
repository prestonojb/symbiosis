import { BigNumber, ethers } from "ethers";

export function fromReadableAmount(readableAmount: string, decimals: number): BigNumber {
  return ethers.utils.parseUnits(readableAmount, decimals);
}

export function toReadableAmount(rawAmount: BigNumber, decimals: number): string {
  return ethers.utils.formatUnits(rawAmount, decimals);
}
