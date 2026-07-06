// Truth Coin (TRC) — on-chain contract config.
// Fill in ADDRESS after `forge create` completes on Base Sepolia.
// While empty, the UI shows an "awaiting deploy" state instead of a fake readout.

export const TRC_CONTRACT = {
  address: "0x85b1C3c32B4Da3203b3B3c3B670Cb90e67410b78" as `0x${string}` | "",
  chainId: 84532, // Base Sepolia
  chainName: "Base Sepolia",
  rpcUrl: "https://sepolia.base.org",
  explorer: "https://sepolia.basescan.org",
  decimals: 18,
  symbol: "TRC",
};

export const TRC_ABI = [
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "MANIFESTO_HASH",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function",
    name: "transfersEnabled",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bool" }],
  },
] as const;

export function explorerAddressUrl(address: string) {
  return `${TRC_CONTRACT.explorer}/address/${address}`;
}
