# Cross-chain swaps

## Overview

This tool programatically moves funds between Ethereum and Mantle using Symbiosis (a multi-chain liquidity protocol). `USDC` bridging between Ethereum <> Mantle are battle-tested with mainnet.

## Getting Started

To run the tool,

in `.env`, update the chain/token to swap, as well as the wallet private key and RPC provider (Alchemy API key), make sure there are enough funds for gas and swap

then, on development env:

```bash
npm run dev
```

alternatively, with compiled `.js` on production env:

```bash
npm run build
npm run start
```

or with docker image:

```bash
docker build -t symbiosis-bridge .
docker run --env-file .env symbiosis-bridge
```

### USDC (Mantle -> Ethereum)

`.env` setup:

```env
SWAP_IN_CHAINID=5000
SWAP_IN_TOKEN_SYMBOL="USDC"
SWAP_IN_AMOUNT=10 # in readable amount, i.e 10USDC

SLIPPAGE_TOLERANCE=1000 # in bps, i.e 1000 = 1%

SWAP_OUT_CHAINID=1
SWAP_OUT_TOKEN_SYMBOL="USDC"

PRIVATE_KEY=<REDACTED> # wallet private key for cross-chain swap
PROVIDER_API_KEY=<REDACTED> # RPC provider API key
```

tool logs:

```txt
executing cross-chain swap for wallet 0x64fccaa8fA6403BcF0F8F65A4Bbd8033911D458A:
        [in] 10USDC (Mantle chain) -> [out] USDC (Ethereum chain)
wallet balance: [in] Mantle chain: 80.869465USDC; [out] Ethereum chain: 140.0USDC

fetch Symbiosis API swap data
fetched Symbiosis API swap data,
    suggested min token out (without gas fees): 7.842966USDC,
    estimated time: 50s

approve token spending for 10USDC (Mantle chain) for address 0xd92Ca299F1C2518E78E48C207b64591BA6E9b9a8
approved 10USDC (5000 chain) token transfer allowance, tx hash=0xb8cac9c0fa8b3c0c21e21c2f1f64af85e2ca374056ce9788bc189b9a3f450456
approved token spending, took 10.345s

execute cross chain swap
executed swap tx on Mantle with hash: 0x812ca943107a5da03831db6a1e11fb89a4d4849f2efe08e07735dfba89d738cc, pending settlement from Symbiosis API
remaining tx on non-source chains are not yet published by Symbiosis API, wait for 60s...
remaining tx on non-source chains are not yet published by Symbiosis API, wait for 60s...
<truncated>

swap tx on Ethereum with hash 0x41de96d6fb4212914c9976fda2b426b5e3bf445cef082ef8cd024c936809dfb2 is successful, cross-chain swap complete
executed cross chain swap, took 553.004s
wallet balance: [in] Mantle chain: 70.869465USDC; [out] Ethereum chain: 147.891424USDC
```

moving `USDC` from `Mantle` to `Ethereum` took `~560s` (in practice swap settlement happens sooner and closer to `~50s`), `10USDC` (Mantle) -> `~7.89USDC` (Ethereum), representing `21%` slippage.

Transactions:

1. https://mantlescan.info/tx/0x812ca943107a5da03831db6a1e11fb89a4d4849f2efe08e07735dfba89d738cc
2. https://etherscan.io/tx/0x41de96d6fb4212914c9976fda2b426b5e3bf445cef082ef8cd024c936809dfb2

### USDC (Ethereum -> Mantle)

`.env` setup:

```env
SWAP_IN_CHAINID=1
SWAP_IN_TOKEN_SYMBOL="USDC"
SWAP_IN_AMOUNT=10 # in readable amount, i.e 10USDC

SLIPPAGE_TOLERANCE=1000 # in bps, i.e 1000 = 1%

SWAP_OUT_CHAINID=5000
SWAP_OUT_TOKEN_SYMBOL="USDC"

PRIVATE_KEY=<REDACTED> # wallet private key for cross-chain swap
PROVIDER_API_KEY=<REDACTED> # RPC provider API key
```

tool logs:

```tx
executing cross-chain swap for wallet 0x64fccaa8fA6403BcF0F8F65A4Bbd8033911D458A:
        [in] 10USDC (Ethereum chain) -> [out] USDC (Mantle chain)
wallet balance: [in] Ethereum chain: 147.891424USDC; [out] Mantle chain: 70.869465USDC

fetch Symbiosis API swap data
fetched Symbiosis API swap data,
    token in: 10USDC,
    suggested min token out: 9.354868USDC,
    estimated time: 29s

approve token spending for 10USDC (Ethereum chain) for address 0xfCEF2Fe72413b65d3F393d278A714caD87512bcd
no token approval required for 10USDC (1 chain) token spending
approved token spending, took 0.78s

execute cross chain swap
executed swap tx on Ethereum with hash: 0x6acb401593c734b512f74bbf652262ec06a179425c94a7f974749020cfb1e4c8, pending settlement from Symbiosis API
remaining tx on non-source chains are not yet published by Symbiosis API, wait for 60s...
remaining tx on non-source chains are not yet published by Symbiosis API, wait for 60s...
remaining tx on non-source chains are not yet published by Symbiosis API, wait for 60s...
remaining tx on non-source chains are not yet published by Symbiosis API, wait for 60s...
remaining tx on non-source chains are not yet published by Symbiosis API, wait for 60s...
remaining tx on non-source chains are not yet published by Symbiosis API, wait for 60s...
remaining tx on non-source chains are not yet published by Symbiosis API, wait for 60s...
remaining tx on non-source chains are not yet published by Symbiosis API, wait for 60s...
remaining tx on non-source chains are not yet published by Symbiosis API, wait for 60s...
swap tx on Mantle with hash 0x1fac9b649b90ae9144c3817d505069155c66bf0dc8ccbfefe16959a908865531 is successful, cross-chain swap complete
executed cross chain swap, took 555.896s
wallet balance: [in] Ethereum chain: 137.891424USDC; [out] Mantle chain: 80.272851USDC
```

moving `USDC` from `Ethereum` to `Mantle` took `~560s` (in practice swap settlement happens sooner and closer to `~29s`), `10USDC` (Ethereum) -> `~9.40USDC` (Mantle), representing `6%` slippage.

Transactions

1. https://etherscan.io/tx/0x6acb401593c734b512f74bbf652262ec06a179425c94a7f974749020cfb1e4c8
2. https://mantlescan.info/tx/0x1fac9b649b90ae9144c3817d505069155c66bf0dc8ccbfefe16959a908865531

## Reflections

### Alternative bridging routes

There exists alternatives for bridging with lower slippage/faster settlement time such as:

1. official Mantle bridge contracts
2. Stargate (lower slippage but slower settlement compared to `Symbiosis`)

the best of both worlds is to adopt the cheapest routes for bridging:

1. `Ethereum` -> `Mantle`: official Mantle bridging contract provides minimal slippage and decent settlement time (`~30s`)
2. `Mantle` -> `Ethereum`: depending on liquidity of `Symbiosis` / `Stargate`, better alternative can be chosen and used

### Symbiosis edge cases

1. Polling Symbiosis API `/v1/tx` endpoint to decide if a cross-chain swap settled is fool-proof but suboptimal, since the delay is `~10m`. Work can be done to listen to destination wallet balances and determine if cross-chain swap settled correctly, which could cut down settlement time by 10x (~`10m` -> ~`1m`).

2. Stuck transactions on `Symbiosis` may happen and manual reversion is needed to retrieve stucked funds. This mechanism has yet to be implemented since stucked transactions did not happen throughout the lifecycle of development/testing for this tool.

## Future work

1. support cross-chain swapping for more token pairs
2. support cross-chain cross address transfers
3. leverage multiple routes (besides `Symbiosis`) to tap into greater liquidity for cross-chain swaps (thus less slippage)
4. enable `max_slippage` cross-chain; veto transaction if cross-chain slippage is too high (i.e. due to low liquidity of swapping pairs)
