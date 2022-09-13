require("dotenv").config();
const ethers = require('ethers');
const Web3 = require('web3');

const infuraProvider = new ethers.providers.InfuraProvider('homestead',process.env.INFURA_API_KEY);
const alchemyProvider = ethers.getDefaultProvider('homestead', { alchemy: process.env.ALCHEMY_API_KEY });
const puppeteer = require('puppeteer');

const health = {
  infuraStatus: 'OK',
  infuraBlockNo: 0,
  infuraLastSeen: 0,
  infuraResponse: 0,
  alchemyStatus: 'OK',
  alchemyBlockNo: 0,
  alchemyLastSeen: 0,
  alchemyResponse: 0,
  etherscanStatus: 'OK',
  etherscanLastSeen: 0,
  etherscanResponse: 0,
  etherscanAPIStatus: 'OK',
  etherscanAPILastSeen: 0,
  etherscanAPIResponse: 0,
  flashbotsStatus: 'OK',
  flashbotsLastSeen: 0,
  flashbotsResponse: 0,
  binanceStatus: 'OK',
  binanceLastSeen: 0,
  binanceResponse: 0,
  binancePrice: 0,
  ftxStatus: 'OK',
  ftxLastSeen: 0,
  ftxResponse: 0,
  ftxPrice: 0,
  gasPrice: 0,
  ethSupply: 0,
  ethStaked: 0,
  burntFees: 0,
  rpcNodes: [],
  minsToMerge: 0,
};


const checkInfura = async () => {
  const ts = new Date().getTime();
  health.infuraBlockNo = await infuraProvider.getBlockNumber();
  health.infuraResponse = new Date().getTime() - ts;
  //health.lastBlock = await infuraProvider.getBlock(health.infuraBlockNo);
  health.gasPrice = await infuraProvider.getGasPrice();
  health.infuraLastSeen = new Date().getTime();
};

const checkAlchemy = async () => {
  const ts = new Date().getTime();
  health.alchemyBlockNo = await alchemyProvider.getBlockNumber();
  health.alchemyResponse = new Date().getTime() - ts;
  //health.lastBlock = await alchemyProvider.getBlock(health.alchemyBlockNo);
  //health.gasPrice = await alchemyProvider.getGasPrice();
  health.alchemyLastSeen = new Date().getTime();
};

const checkEtherscan = async () => {
  const browser = await puppeteer.launch({headless: true});
  const page = await browser.newPage();
  const ts = new Date().getTime();
  await page.goto('https://etherscan.io/');
  health.etherscanResponse = new Date().getTime() - ts;
  health.etherscanLastSeen = new Date().getTime();
  await browser.close();
};

const checkEtherscanAPI = async () => {
  const ts = new Date().getTime();
  const response = await fetch(`https://api.etherscan.io/api?module=stats&action=ethsupply2&apikey=${process.env.ETHERSCAN_API_KEY}`);
  health.etherscanAPIResponse = new Date().getTime() - ts; 
  const data = await response.json();
  health.etherscanAPILastSeen = new Date().getTime();
  health.ethStakingRewards = Math.round(data.result.Eth2Staking / 1e18);
  health.burntFees = Math.round(data.result.BurntFees / 1e18);
  health.ethSupply = Math.round(data.result.EthSupply / 1e18) + health.ethStakingRewards - health.burntFees;
}

const checkBinance = async () => {
  const ts = new Date().getTime();
  const response = await fetch(`https://www.binance.com/api/v3/ticker/bookTicker?symbol=ETHUSDT`);
  health.binanceResponse = new Date().getTime() - ts;
  const data = await response.json();
  health.binanceLastSeen = new Date().getTime();
  health.binancePrice = data.bidPrice;
}

const checkFTX = async () => {
  const ts = new Date().getTime();
  const response = await fetch(`https://ftx.com/api/markets/ETH/USD/orderbook?depth=1`);
  health.ftxResponse = new Date().getTime() - ts;
  const data = await response.json();
  health.ftxLastSeen = new Date().getTime();
  health.ftxPrice = data.result.bids[0][0];
}

const checkFlashbots = async () => {
  const ts = new Date().getTime();
  // https://rpc.flashbots.net
  const response = await fetch('https://relay.flashbots.net', {
    method: 'post',
    headers: {'Content-Type': 'application/json'}
  });
  health.flashbotsResponse = new Date().getTime() - ts;
  const data = await response.json();
  health.flashbotsLastSeen = new Date().getTime();
};

const checkStatus = () => {
  const ts = new Date().getTime();
  health.infuraStatus = 'DOWN';
  health.alchemyStatus = 'DOWN';
  health.etherscanStatus = 'DOWN';
  health.etherscanAPIStatus = 'DOWN';
  health.flashbotsStatus = 'DOWN';
  if (health.infuraLastSeen > ts - 15000) health.infuraStatus = 'OK';
  if (health.alchemyLastSeen > ts - 15000) health.alchemyStatus = 'OK';
  if (health.etherscanLastSeen > ts - 15000) health.etherscanStatus = 'OK';
  if (health.etherscanAPILastSeen > ts - 15000) health.etherscanAPIStatus = 'OK';
  if (health.flashbotsLastSeen > ts - 15000) health.flashbotsStatus = 'OK';
  if (health.lastBlock) {
    const difficulty = ethers.BigNumber.from(health.lastBlock.difficulty);
    const totalDifficulty = ethers.BigNumber.from(health.lastBlock.totalDifficulty);
    const ttd = ethers.BigNumber.from('58750000000000000000000');
    const remaining = ttd.sub(totalDifficulty);
    const blocksRemaining = remaining.div(difficulty);
    health.minsToMerge = blocksRemaining.mul(14).div(60);
  }
}

const checkRPCNodes = () => {
  health.rpcNodes = [];
  const rpcNodes = [
    "https://rpc.ankr.com/eth",
    "https://eth-rpc.gateway.pokt.network",
    "https://cloudflare-eth.com"
  ];
  rpcNodes.forEach(async (rpcNode) => {
    try {
      const ts = new Date().getTime();
      const web3 = new Web3(rpcNode);
      const blockNo = await web3.eth.getBlockNumber();
      const responseTime = new Date().getTime() - ts;
      health.lastBlock = await web3.eth.getBlock(blockNo);
      health.rpcNodes.push([rpcNode.split('https://').join(''), `${responseTime}ms`]);
    } catch (e) {
      console.log(`Error on RPC Node: ${rpcNode}`);
    }
  });
}

const monitorHealth = async (req, res) => {
  try { checkInfura(); } catch(e) { console.log(e); }
  try { checkAlchemy(); } catch(e) { console.log(e); }
  try { checkFlashbots(); } catch(e) { console.log(e); }
  try { checkEtherscanAPI(); } catch(e) { console.log(e); }
  try { checkEtherscan(); } catch(e) { console.log(e); }
  try { checkBinance(); } catch(e) { console.log(e); }
  try { checkFTX(); } catch(e) { console.log(e); }
  try { checkRPCNodes(); } catch(e) { console.log(e); }
  await new Promise(r => setTimeout(r, 5000));
  for (let i = 0; i < 10; i++) {
    checkStatus();
    console.clear();
    print();
    await new Promise(r => setTimeout(r, 1000));
  }
  monitorHealth();
};
monitorHealth();



const print = () => {
console.log(`
░░░░░░░░░░░░░░░░░░████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
░░░░░░░░░░░░░░░░████████░░░░░░░░████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
░░░░░░██        ████████      ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
░░░░██          ██                ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
░░██          ██                    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
░░██        ████                      ░░░░░ ███████╗████████╗██╗░░██╗░███╗░░░███╗░█████╗░███╗░░██╗██╗████████╗░█████╗░██████╗ ░░░░░
░░██        ██      ████              ░░░░░ ██╔════╝╚══██╔══╝██║░░██║░████╗░████║██╔══██╗████╗░██║██║╚══██╔══╝██╔══██╗██╔══██╗ ░░░░
░░██        ██    ██████    ████    ██░░░░░ █████╗░░░░░██║░░░███████║░██╔████╔██║██║░░██║██╔██╗██║██║░░░██║░░░██║░░██║██████╔╝ ░░░░
░░████      ██    ████      ████    ██░░░░░ ██╔══╝░░░░░██║░░░██╔══██║░██║╚██╔╝██║██║░░██║██║╚████║██║░░░██║░░░██║░░██║██╔══██╗ ░░░░
░░████      ████              ██    ██░░░░░ ███████╗░░░██║░░░██║░░██║░██║░╚═╝░██║╚█████╔╝██║░╚███║██║░░░██║░░░╚█████╔╝██║░░██║ ░░░░
░░░░████    ██████    ██████      ████░░░░░ ╚══════╝░░░╚═╝░░░╚═╝░░╚═╝░╚═╝░░░░░╚═╝░╚════╝░╚═╝░░╚══╝╚═╝░░░╚═╝░░░░╚════╝░╚═╝░░╚═╝ ░░░░
░░░░██████  ████████    ██      ██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
░░░░██████████████████      ██████████░░░░░░░░░░░░░░░░░░░ Ethereum Core Infrastructure Health Monitor ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
░░░░░░████████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
░░░░░░░░██████░░████████░░░░░░██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    v0.0.1    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
░░░░░░░░░░████░░████████░░░░████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
░░
░░       INFURA: ${health.infuraStatus} (${health.infuraResponse}ms)
░░          BLOCK NO. ${health.infuraBlockNo}
░░
░░       ALCHEMY: ${health.alchemyStatus} (${health.alchemyResponse}ms)
░░          BLOCK NO. ${health.infuraBlockNo}
░░
░░       ETHERSCAN API: ${health.etherscanAPIStatus} (${health.etherscanAPIResponse}ms)
░░          ETH SUPPLY: ${health.ethSupply}
░░          ETH2 STAKING REWARDS: ${health.ethStakingRewards}
░░          FEES BURNT: ${health.burntFees}
░░
░░       ETHERSCAN: ${health.etherscanStatus} (${health.etherscanResponse}ms)
░░
░░       FLASHBOTS: ${health.flashbotsStatus} (${health.flashbotsResponse}ms)
░░
░░       TRANSACTIONS: ${health.lastBlock.transactions.length}
░░
░░       BLOCK SIZE: ${health.lastBlock.size}
░░
░░       BLOCK TIME: ${new Date(health.lastBlock.timestamp * 1000)}
░░
░░       TTD: ${ethers.BigNumber.from(health.lastBlock.totalDifficulty)} / 58750000000000000000000
░░
░░       MERGE IN: ${health.minsToMerge} mins
░░
░░       DIFFICULTY: ${ethers.BigNumber.from(health.lastBlock.difficulty)}
░░
░░       MINER: ${health.lastBlock.miner}
░░
░░       GAS PRICE: ${Math.round(ethers.utils.formatUnits(health.gasPrice, 'gwei'))}
░░
░░       Binance: ${health.binanceStatus} (${health.binanceResponse}ms)
░░          ETH PRICE: $${Number(health.binancePrice).toFixed(2)}
░░
░░       FTX: ${health.ftxStatus} (${health.ftxResponse}ms)
░░          ETH PRICE: $${Number(health.ftxPrice).toFixed(2)}
░░
░░       RPC NODES: ${health.rpcNodes.join(' ')}
░░
░░
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
`);
};
