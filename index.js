require('dotenv').config();
const ethers = require('ethers');
const readline = require('readline');

const PRIOR_ADDRESS = '0xc19Ec2EEBB009b2422514C51F9118026f1cD89ba';
const USDT_ADDRESS = '0x014397DaEa96CaC46DbEdcbce50A42D5e0152B2E';
const USDC_ADDRESS = '0x109694D75363A75317A8136D80f50F871E81044e';

const RPC_URL = 'https://base-sepolia-rpc.publicnode.com/89e4ff0f587fe2a94c7a2c12653f4c55d2bda1186cb6c1c95bd8d8408fbdc014';

const CHAIN_ID = 84532;

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)"
];

const ROUTER_ADDRESS = '0x0f1DADEcc263eB79AE3e4db0d57c49a8b6178B0B';

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const SYMBOLS = {
  info: '📋',
  success: '✅',
  error: '❌',
  warning: '⚠️',
  pending: '⏳',
  wallet: '💳',
  eth: '💎',
  prior: '🔶',
  usdt: '💵',
  usdc: '💰',
  swap: '🔄',
  approve: '🔑',
  wait: '⌛',
};

function loadWallets() {
  const wallets = [];
  let index = 1;
  
  while (process.env[`PRIVATE_KEY_${index}`]) {
    const privateKey = process.env[`PRIVATE_KEY_${index}`];
    wallets.push({
      privateKey,
      wallet: new ethers.Wallet(privateKey, provider),
      label: `Wallet ${index}`
    });
    index++;
  }
  
  if (wallets.length === 0 && process.env.PRIVATE_KEY) {
    wallets.push({
      privateKey: process.env.PRIVATE_KEY,
      wallet: new ethers.Wallet(process.env.PRIVATE_KEY, provider),
      label: 'Default Wallet'
    });
  }
  
  return wallets;
}

function getRandomAmount() {
  return (Math.random() * 0.001 + 0.001).toFixed(6); 
}

function getRandomToken() {
  return Math.random() < 0.5 ? 'USDT' : 'USDC';
}

async function approvePrior(walletObj, amount) {
  const { wallet, label } = walletObj;
  const priorContract = new ethers.Contract(PRIOR_ADDRESS, ERC20_ABI, wallet);
  
  try {
    const amountInWei = ethers.utils.parseUnits(amount, 18);

    const currentAllowance = await priorContract.allowance(wallet.address, ROUTER_ADDRESS);
    
    if (currentAllowance.gte(amountInWei)) {
      console.log(`${SYMBOLS.info} ${label} | Allowance for PRIOR already sufficient: ${ethers.utils.formatUnits(currentAllowance, 18)}`);
      return true;
    }

    console.log(`${SYMBOLS.pending} ${label} | Approving PRIOR...`);
    
    const tx = await priorContract.approve(ROUTER_ADDRESS, amountInWei, {
      gasLimit: 60000
    });
    
    console.log(`${SYMBOLS.pending} ${label} | Approval transaction sent: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`${SYMBOLS.success} ${label} | Approval confirmed in block ${receipt.blockNumber}`);
    
    return true;
    
  } catch (error) {
    console.log(`${SYMBOLS.error} ${label} | Error approving PRIOR: ${error.message}`);
    return false;
  }
}

async function swapPrior(walletObj, amount, tokenType) {
  const { wallet, label } = walletObj;
  
  try {
    const amountInWei = ethers.utils.parseUnits(amount, 18);

    const approved = await approvePrior(walletObj, amount);
    if (!approved) {
      console.log(`${SYMBOLS.warning} ${label} | Approval failed, aborting swap`);
      return false;
    }

    let txData;
    if (tokenType === 'USDT') {
      txData = '0x03b530a3' + ethers.utils.defaultAbiCoder.encode(['uint256'], [amountInWei]).slice(2);
    } else {
      txData = '0xf3b68002' + ethers.utils.defaultAbiCoder.encode(['uint256'], [amountInWei]).slice(2);
    }

    console.log(`${SYMBOLS.pending} ${label} | Swapping ${amount} PRIOR for ${tokenType}...`);
    
    const tx = await wallet.sendTransaction({
      to: ROUTER_ADDRESS,
      data: txData,
      gasLimit: ethers.utils.hexlify(500000)
    });
    
    console.log(`${SYMBOLS.pending} ${label} | Swap transaction sent: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`${SYMBOLS.success} ${label} | Swap confirmed in block ${receipt.blockNumber}`);
    
    return true;
    
  } catch (error) {
    console.log(`${SYMBOLS.error} ${label} | Error swapping PRIOR for ${tokenType}: ${error.message}`);
    return false;
  }
}

async function checkBalances(walletObj) {
  const { wallet, label } = walletObj;
  const priorContract = new ethers.Contract(PRIOR_ADDRESS, ERC20_ABI, wallet);
  const usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, wallet);
  const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, wallet);
  
  try {
    console.log(`\n${SYMBOLS.wallet} ${label} (${wallet.address.substring(0, 6)}...${wallet.address.substring(38)}):`);
    
    const priorBalance = await priorContract.balanceOf(wallet.address);
    const usdtBalance = await usdtContract.balanceOf(wallet.address);
    const usdcBalance = await usdcContract.balanceOf(wallet.address);
    const ethBalance = await provider.getBalance(wallet.address);
    
    console.log(`  ${SYMBOLS.eth} ETH: ${ethers.utils.formatEther(ethBalance)}`);
    console.log(`  ${SYMBOLS.prior} PRIOR: ${ethers.utils.formatUnits(priorBalance, 18)}`);
    console.log(`  ${SYMBOLS.usdt} USDT: ${ethers.utils.formatUnits(usdtBalance, 6)}`);
    console.log(`  ${SYMBOLS.usdc} USDC: ${ethers.utils.formatUnits(usdcBalance, 6)}`);
    
  } catch (error) {
    console.log(`${SYMBOLS.error} ${label} | Error checking balances: ${error.message}`);
  }
}

function delay() {
  console.log(`${SYMBOLS.wait} Waiting for 10 seconds...`);
  return new Promise(resolve => setTimeout(resolve, 10000));
}

async function runWalletSwaps(walletObj, count) {
  const { label } = walletObj;
  console.log(`\n${SYMBOLS.info} Starting ${count} swap operations for ${label}...`);
  await checkBalances(walletObj);
  
  let successCount = 0;
  
  for (let i = 0; i < count; i++) {
    const amount = getRandomAmount();
    const token = getRandomToken();
    
    console.log(`\n${SYMBOLS.swap} ${label} | Swap ${i+1}/${count}: ${amount} PRIOR for ${token}`);
    
    const success = await swapPrior(walletObj, amount, token);
    if (success) successCount++;
    
    if (i < count - 1) {
      await delay();
    }
  }
  
  console.log(`\n${SYMBOLS.info} ${label} | Completed ${successCount}/${count} swap operations successfully`);
  await checkBalances(walletObj);
  return successCount;
}

async function runAllWallets(swapsPerWallet) {
  const wallets = loadWallets();
  let totalSuccess = 0;
  let totalSwaps = swapsPerWallet * wallets.length;
  
  console.log(`\n${SYMBOLS.info} Found ${wallets.length} wallet(s)`);
  
  for (let i = 0; i < wallets.length; i++) {
    const walletObj = wallets[i];
    console.log(`\n${SYMBOLS.wallet} Processing wallet ${i+1}/${wallets.length}: ${walletObj.label}`);
    const successes = await runWalletSwaps(walletObj, swapsPerWallet);
    totalSuccess += successes;
    
    if (i < wallets.length - 1) {
      await delay();
    }
  }
  
  console.log(`\n${SYMBOLS.info} All wallets processed. Total success: ${totalSuccess}/${totalSwaps}`);
}

async function main() {
  const cyan = '\x1b[36m';
  const reset = '\x1b[0m';
  
  const banner = `
${cyan}==========================================${reset}
${cyan} PRIOR TESTNET AUTO BOT - AIRDROP INSIDERS ${reset}         
${cyan}==========================================${reset}
  `;
  
  console.log(banner);
  console.log(`${SYMBOLS.info} Bot started on ${new Date().toISOString()}`);
  
  const wallets = loadWallets();
  if (wallets.length === 0) {
    console.log(`${SYMBOLS.error} No wallets found. Please check your .env file.`);
    console.log(`Format should be:`);
    console.log(`PRIVATE_KEY_1=your_private_key_1`);
    console.log(`PRIVATE_KEY_2=your_private_key_2`);
    process.exit(1);
  }
  
  console.log(`${SYMBOLS.wallet} Loaded ${wallets.length} wallet(s):`);
  wallets.forEach((w, i) => {
    console.log(`  ${i+1}. ${w.label} (${w.wallet.address.substring(0, 6)}...${w.wallet.address.substring(38)})`);
  });
  
  rl.question(`\n${SYMBOLS.info} How many swaps to perform per wallet? `, async (answer) => {
    const swapCount = parseInt(answer);
    
    if (isNaN(swapCount) || swapCount <= 0) {
      console.log(`${SYMBOLS.error} Please provide a valid number of swaps`);
      rl.close();
      process.exit(1);
    }
    
    console.log(`${SYMBOLS.info} Will perform ${swapCount} swaps for each of ${wallets.length} wallet(s) (total: ${swapCount * wallets.length})`);
    rl.question(`${SYMBOLS.info} Proceed? (y/n) `, async (confirm) => {
      if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
        await runAllWallets(swapCount);
      } else {
        console.log(`${SYMBOLS.info} Operation canceled`);
      }
      rl.close();
    });
  });
}

if (require.main === module) {
  main().catch(error => {
    console.log(`${SYMBOLS.error} Fatal error: ${error.message}`);
    process.exit(1);
  });
}