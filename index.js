require('dotenv').config();
const fs = require('fs');
const axios = require('axios');
const { ethers } = require('ethers');
const { HttpsProxyAgent } = require('https-proxy-agent');

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  white: '\x1b[37m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
};

const CHAIN_ID = 84532;
const RPC_URL = 'https://base-sepolia-rpc.publicnode.com/89e4ff0f587fe2a94c7a2c12653f4c55d2bda1186cb6c1c95bd8d8408fbdc014';
const EXPLORER_URL = 'https://base-sepolia.blockscout.com/';

const PRIOR_TOKEN_ADDRESS = '0xeFC91C5a51E8533282486FA2601dFfe0a0b16EDb';
const USDC_TOKEN_ADDRESS = '0xdB07b0b4E88D9D5A79A08E91fEE20Bb41f9989a2';
const SWAP_ROUTER_ADDRESS = '0x8957e1988905311EE249e679a29fc9deCEd4D910';

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

function displayBanner() {
  const bannerWidth = 54;
  const line = '-'.repeat(bannerWidth);
  console.log(`${colors.cyan}${line}${colors.reset}`);
  console.log(`${colors.cyan}PRIOR TESTNET BOT - AIRDROP INSIDERS${colors.reset}`);
  console.log(`${colors.cyan}${line}${colors.reset}`);
}

function loadWallets() {
  const wallets = [];
  let i = 1;
  
  while (process.env[`WALLET_PK_${i}`]) {
    wallets.push(process.env[`WALLET_PK_${i}`]);
    i++;
  }
  
  if (wallets.length === 0) {
    throw new Error('No wallet private keys found in .env file');
  }
  
  console.log(`${colors.green}✅ Loaded ${wallets.length} wallets from .env${colors.reset}`);
  return wallets;
}

function loadProxies() {
  try {
    const proxyFile = fs.readFileSync('./proxies.txt', 'utf8');
    const proxies = proxyFile.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
    
    console.log(`${colors.green}✅ Loaded ${proxies.length} proxies from proxies.txt${colors.reset}`);
    return proxies;
  } catch (error) {
    console.log(`${colors.yellow}⚠️ No proxies.txt file found or error loading proxies: ${error.message}${colors.reset}`);
    return [];
  }
}

function createAxiosInstance(proxy = null) {
  const config = {
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'
    }
  };
  
  if (proxy) {
    let proxyUrl = proxy;

    if (proxy.includes('@') && !proxy.startsWith('http')) {
      proxyUrl = `http://${proxy}`;
    } 
    else if (!proxy.includes('@') && !proxy.startsWith('http')) {
      proxyUrl = `http://${proxy}`;
    }
    
    config.httpsAgent = new HttpsProxyAgent(proxyUrl);
    console.log(`${colors.cyan}ℹ️ Using proxy: ${proxy}${colors.reset}`);
  }
  
  return axios.create(config);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

async function countdown(seconds) {
  console.log(`\n${colors.yellow}⏱️ Starting countdown for ${formatTime(seconds)}${colors.reset}`);
  
  for (let i = seconds; i > 0; i--) {
    process.stdout.write(`\r${colors.yellow}⏱️ Time remaining: ${formatTime(i)} until next swap session${colors.reset}`);
    await sleep(1000);
  }
  
  console.log(`\n${colors.green}✅ Countdown completed. Starting new swap session.${colors.reset}`);
}

async function checkAndApproveToken(wallet, provider, walletIndex, proxy = null) {
  const signer = new ethers.Wallet(wallet, provider);
  const address = signer.address;
  const shortAddress = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;

  console.log(`\n${colors.cyan}${'-'.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}🔹 WALLET #${walletIndex+1}: ${shortAddress}${colors.reset}`);
  console.log(`${colors.cyan}${'-'.repeat(60)}${colors.reset}`);

  const priorToken = new ethers.Contract(PRIOR_TOKEN_ADDRESS, ERC20_ABI, signer);
  
  try {
    const decimals = await priorToken.decimals();
    const balance = await priorToken.balanceOf(address);
    const formattedBalance = ethers.utils.formatUnits(balance, decimals);
    
    console.log(`${colors.white}💰 Balance: ${formattedBalance} PRIOR${colors.reset}`);

    const swapAmount = ethers.utils.parseUnits('0.1', decimals);
    if (balance.lt(swapAmount)) {
      console.log(`${colors.red}❌ Insufficient PRIOR balance. Required: 0.1 PRIOR${colors.reset}`);
      return false;
    }

    const allowance = await priorToken.allowance(address, SWAP_ROUTER_ADDRESS);

    if (allowance.lt(swapAmount)) {
      console.log(`${colors.yellow}⏳ Approving PRIOR token...${colors.reset}`);

      const maxApproval = ethers.constants.MaxUint256;
      const tx = await priorToken.approve(SWAP_ROUTER_ADDRESS, maxApproval);
      
      console.log(`${colors.yellow}🔄 Approval transaction sent: ${tx.hash}${colors.reset}`);
      await tx.wait();
      console.log(`${colors.green}✅ Approval confirmed${colors.reset}`);
    } else {
      console.log(`${colors.green}✅ PRIOR token already approved${colors.reset}`);
    }
    
    return true;
  } catch (error) {
    console.error(`${colors.red}❌ Error in checkAndApproveToken: ${error.message}${colors.reset}`);
    return false;
  }
}

async function executeSwap(wallet, provider, swapCount, walletIndex, proxy = null) {
  const signer = new ethers.Wallet(wallet, provider);
  const address = signer.address;
  const shortAddress = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  
  try {
    const priorToken = new ethers.Contract(PRIOR_TOKEN_ADDRESS, ERC20_ABI, signer);
    const decimals = await priorToken.decimals();
    const swapAmount = ethers.utils.parseUnits('0.1', decimals);
    
    console.log(`${colors.yellow}🔄 Executing swap #${swapCount} - Swapping 0.1 PRIOR to USDC...${colors.reset}`);

    const swapData = '0x8ec7baf1000000000000000000000000000000000000000000000000016345785d8a0000';

    const tx = await signer.sendTransaction({
      to: SWAP_ROUTER_ADDRESS,
      data: swapData,
      gasLimit: 300000, 
    });
    
    console.log(`${colors.yellow}🔄 Swap transaction sent: ${tx.hash}${colors.reset}`);
    const receipt = await tx.wait();
    console.log(`${colors.green}✅ Swap confirmed in block ${receipt.blockNumber}${colors.reset}`);

    await reportSwap(address, tx.hash, receipt.blockNumber, proxy);
    
    return true;
  } catch (error) {
    console.error(`${colors.red}❌ Error in executeSwap: ${error.message}${colors.reset}`);
    if (error.transaction) {
      console.error(`${colors.red}Transaction details: ${JSON.stringify(error.transaction)}${colors.reset}`);
    }
    return false;
  }
}

async function reportSwap(walletAddress, txHash, blockNumber, proxy = null) {
  try {
    const apiUrl = "https://prior-protocol-testnet-priorprotocol.replit.app/api/transactions";
    const axiosInstance = createAxiosInstance(proxy);
    
    const payload = {
      userId: walletAddress.toLowerCase(),
      type: "swap",
      txHash: txHash,
      fromToken: "PRIOR",
      toToken: "USDC",
      fromAmount: "0.1",
      toAmount: "0.20",  
      status: "completed",
      blockNumber: blockNumber
    };
    
    const response = await axiosInstance.post(apiUrl, payload, {
      headers: {
        "accept": "application/json",
        "cache-control": "no-cache, no-store, must-revalidate",
        "pragma": "no-cache",
        "sec-ch-ua": "\"Brave\";v=\"135\", \"Not-A.Brand\";v=\"8\", \"Chromium\";v=\"135\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Windows\"",
        "Referer": "https://testnetpriorprotocol.xyz/",
        "Referrer-Policy": "strict-origin-when-cross-origin"
      }
    });
    
    console.log(`${colors.green}✅ Swap reported to API: ${response.status}${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}❌ Error reporting swap to API: ${error.message}${colors.reset}`);
  }
}

async function completeAllSwaps(wallets, proxies, provider) {
  const MAX_SWAPS = 5;
  let totalSwapsCompleted = 0;
  
  console.log(`\n${colors.bright}${colors.cyan}=== Starting swap session at ${new Date().toLocaleString()} ===${colors.reset}`);
  console.log(`${colors.yellow}🎯 Target: ${MAX_SWAPS} swaps${colors.reset}`);

  while (totalSwapsCompleted < MAX_SWAPS) {
    let swapsCompletedThisRound = 0;

    for (let i = 0; i < wallets.length && totalSwapsCompleted < MAX_SWAPS; i++) {
      const wallet = wallets[i];
      const proxy = proxies.length > 0 ? proxies[i % proxies.length] : null;

      const isApproved = await checkAndApproveToken(wallet, provider, i, proxy);
      
      if (isApproved) {
        const swapSuccessful = await executeSwap(wallet, provider, totalSwapsCompleted + 1, i, proxy);
        
        if (swapSuccessful) {
          totalSwapsCompleted++;
          swapsCompletedThisRound++;
        }

        if (totalSwapsCompleted < MAX_SWAPS && i < wallets.length - 1) {
          console.log(`${colors.yellow}⏳ Waiting 15 seconds before next swap...${colors.reset}`);
          await sleep(15000);
        }
      }

      if (totalSwapsCompleted >= MAX_SWAPS) {
        console.log(`\n${colors.green}🎉 Completed all ${MAX_SWAPS} swaps successfully${colors.reset}`);
        break;
      }
    }

    if (swapsCompletedThisRound === 0) {
      const waitTime = 5 * 60; 
      console.log(`${colors.yellow}⚠️ No swaps completed in this round. Waiting ${waitTime/60} minutes before trying again...${colors.reset}`);
      console.log(`${colors.cyan}ℹ️ Current progress: ${totalSwapsCompleted}/${MAX_SWAPS} swaps completed${colors.reset}`);
      await sleep(waitTime * 1000);
    }
  }
  
  return totalSwapsCompleted;
}

async function main() {
  try {
    const wallets = loadWallets();
    const proxies = loadProxies();

    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    
    console.log(`\n${colors.cyan}${'-'.repeat(60)}${colors.reset}`);
    console.log(`${colors.cyan}🔹 CHAIN INFO${colors.reset}`);
    console.log(`${colors.cyan}${'-'.repeat(60)}${colors.reset}`);
    console.log(`${colors.white}🔗 Network: Base Sepolia Testnet${colors.reset}`);
    console.log(`${colors.white}🔄 Swap Router: ${SWAP_ROUTER_ADDRESS}${colors.reset}`);
    console.log(`${colors.white}💠 PRIOR Token: ${PRIOR_TOKEN_ADDRESS}${colors.reset}`);
    console.log(`${colors.white}💵 USDC Token: ${USDC_TOKEN_ADDRESS}${colors.reset}`);
    console.log(`${colors.cyan}${'-'.repeat(60)}${colors.reset}\n`);
    
    while (true) {
      const swapsCompleted = await completeAllSwaps(wallets, proxies, provider);
      
      console.log(`\n${colors.bright}${colors.green}=== Swap session completed ===${colors.reset}`);
      console.log(`${colors.green}🎉 Total swaps completed: ${swapsCompleted}${colors.reset}`);
      
      await countdown(24 * 60 * 60); 
    }
  } catch (error) {
    console.error(`${colors.red}❌ Main process error: ${error}${colors.reset}`);
    console.log(`${colors.yellow}⏳ Restarting bot in 1 minute...${colors.reset}`);
    await sleep(60000);
    main();
  }
}

displayBanner();

main().catch(error => {
  console.error(`${colors.red}❌ Fatal error: ${error}${colors.reset}`);
});