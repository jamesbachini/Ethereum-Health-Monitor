# Ethereum-Health-Monitor

A monitoring application on NodeJS to track core Ethereum infrastructure

![Ethereum Health Monitor](https://jamesbachini.com/misc/ethmonitor.jpg "EthMonitor.js")

Built to keep an eye on the network during the merge update.

Tracks:
- infura
- alchemy
- etherscan (web & API)
- flashbots relay
- block transactions
- gas price
- Binance ETH/USDT bid price
- FTX ETH/USD bid price

Console based but all data is stored in a single object so could be extracted to JSON fairly easily.

```
npm install
node ethmonitor.js
```