# Prior Testnet Auto Bot

An automated bot for interacting with Prior Protocol's testnet on Base Sepolia. This bot helps users participate in the Prior Protocol testnet by automating the process of swapping PRIOR tokens to USDC.

## 🔍 Features

- Automatically swaps PRIOR tokens to USDC on Prior Protocol's testnet
- Supports multiple wallets for batch processing
- Optional proxy support for IP rotation
- Automatic reporting of swap transactions to Prior Protocol's API
- 24-hour cycle timer to maintain consistent activity
- Error handling and automatic retries

## 🛠️ Prerequisites

- Node.js (v14 or higher)
- Prior tokens in your wallet(s) on Base Sepolia testnet
- Private keys for your wallet(s)

## ⚙️ Installation

1. Clone the repository:
```bash
git clone https://github.com/airdropinsiders/Prior-Testnet-Auto-Bot.git
```

2. Navigate to the project directory:
```bash
cd Prior-Testnet-Auto-Bot
```

3. Install dependencies:
```bash
npm install
```

4. Create a `.env` file in the root directory with your wallet private keys:
```
WALLET_PK_1=your_private_key_1
WALLET_PK_2=your_private_key_2
# Add as many wallets as you need
```

5. (Optional) Create a `proxies.txt` file with your proxies (one per line):
```
user:pass@ip:port
ip:port
http://user:pass@ip:port
```

## 🚀 Usage

Start the bot by running:
```bash
node index.js
```

The bot will:
1. Load all wallets from your `.env` file
2. Check PRIOR token balances
3. Approve PRIOR token for swapping (if not already approved)
4. Execute swaps of 0.1 PRIOR to USDC
5. Report successful swaps to Prior Protocol's API
6. Wait 24 hours before starting the next swap session

## ⚠️ Important Notes

- Each wallet needs at least 0.1 PRIOR tokens for swapping
- Make sure you have enough Base Sepolia ETH for gas fees
- The bot targets 5 swaps per session before waiting for the next cycle
- Keep your private keys secure and never share your `.env` file

## 🔗 Network Information

- Network: Base Sepolia Testnet
- Prior Token: 0xeFC91C5a51E8533282486FA2601dFfe0a0b16EDb
- USDC Token: 0xdB07b0b4E88D9D5A79A08E91fEE20Bb41f9989a2
- Swap Router: 0x8957e1988905311EE249e679a29fc9deCEd4D910

## 📋 Configuration

You can modify the following parameters in the code:
- MAX_SWAPS: Number of swaps to perform per session (default: 5)
- Swap amount: Amount of PRIOR to swap (default: 0.1)
- Countdown timer: Time between swap sessions (default: 24 hours)

## 📝 License

MIT

## ⚠️ Disclaimer

This bot is for educational purposes only. Use at your own risk. The developers are not responsible for any financial losses or other damages that may result from using this bot.