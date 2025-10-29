# Stripe Crypto Onramp Setup Guide

This guide will help you set up the Buy Crypto feature in the Bach Money dApp using Stripe Crypto Onramp.

## Overview

The Buy Crypto feature allows users to purchase cryptocurrency directly to their Solana wallet using:
- Credit/Debit cards
- Bank transfers
- Apple Pay / Google Pay

Powered by [Stripe Crypto Onramp](https://stripe.com/docs/crypto/onramp).

## Prerequisites

1. A Stripe account with Crypto Onramp enabled
2. Node.js 18+ installed
3. A Next.js development environment

## Setup Instructions

### 1. Get Your Stripe API Keys

1. Go to the [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** → **API keys**
3. Copy your **Publishable key** (starts with `pk_test_` or `pk_live_`)
4. Copy your **Secret key** (starts with `sk_test_` or `sk_live_`)

> ⚠️ **Important**: Keep your secret key secure and never commit it to version control!

### 2. Enable Crypto Onramp

1. In the Stripe Dashboard, navigate to **Settings** → **Crypto Onramp**
2. Enable Crypto Onramp for your account
3. Configure your supported cryptocurrencies and networks
4. For Bach Money, ensure **Solana** is enabled

### 3. Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and add your Stripe keys:
   ```env
   STRIPE_SECRET_KEY=sk_test_your_actual_secret_key_here
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_publishable_key_here
   ```

3. For production deployment, use your live keys:
   ```env
   STRIPE_SECRET_KEY=sk_live_your_actual_secret_key_here
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_actual_publishable_key_here
   ```

### 4. Install Dependencies

```bash
npm install
# or
pnpm install
# or
yarn install
```

### 5. Run the Development Server

```bash
npm run dev
# or
pnpm dev
# or
yarn dev
```

Open [http://localhost:3000/buy-crypto](http://localhost:3000/buy-crypto) to test the feature.

## Features

### Supported Cryptocurrencies

- **SOL** - Solana
- **USDC** - USD Coin (on Solana)
- **USDT** - Tether (on Solana)

### Wallet Address Validation

The app validates Solana wallet addresses using:
- Base58 encoding check
- Length validation (32-44 characters)
- Format validation

### User Experience

1. User enters their Solana wallet address
2. User selects the cryptocurrency they want to buy
3. User clicks "Buy Crypto"
4. Stripe Crypto Onramp widget loads
5. User completes payment through Stripe
6. Cryptocurrency is sent directly to their wallet

## API Endpoints

### POST `/api/create-onramp-session`

Creates a new Stripe Crypto Onramp session.

**Request Body:**
```json
{
  "wallet_address": "YourSolanaWalletAddressHere",
  "destination_currency": "sol",
  "destination_network": "solana"
}
```

**Response:**
```json
{
  "client_secret": "cos_***_secret_***"
}
```

## Security Best Practices

1. **Never commit API keys** to version control
2. Always use environment variables for sensitive data
3. Use test keys during development
4. Rotate your keys if they are ever exposed
5. Enable webhook signature verification (recommended for production)
6. Monitor transactions in the Stripe Dashboard

## Testing

### Test Mode

Use Stripe's test mode to test the integration without real money:

1. Use test API keys (starting with `sk_test_` and `pk_test_`)
2. Use test card numbers from [Stripe's testing documentation](https://stripe.com/docs/testing)
3. Transactions will appear in your Stripe test dashboard

### Test Cards

Stripe provides test card numbers for different scenarios:
- **4242 4242 4242 4242** - Successful payment
- See [Stripe Testing Cards](https://stripe.com/docs/testing#cards) for more

## Production Deployment

### Environment Variables

Set your environment variables in your hosting platform:

**Vercel:**
1. Go to Project Settings → Environment Variables
2. Add `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

**Netlify:**
1. Go to Site Settings → Environment Variables
2. Add the same variables

**Other platforms:**
Consult your platform's documentation for setting environment variables.

### Pre-deployment Checklist

- [ ] Replace test keys with live keys
- [ ] Test the integration thoroughly in test mode
- [ ] Verify Crypto Onramp is enabled in production Stripe account
- [ ] Set up Stripe webhooks (optional, for order tracking)
- [ ] Enable monitoring and logging
- [ ] Review Stripe compliance requirements

## Troubleshooting

### Common Issues

**Error: "STRIPE_SECRET_KEY is not configured"**
- Ensure `.env.local` exists and contains your secret key
- Verify the environment variable name is correct
- Restart your development server after adding variables

**Error: "Failed to load payment system"**
- Check your internet connection
- Verify your publishable key is correct
- Check browser console for JavaScript errors

**Invalid wallet address**
- Ensure the address is a valid Solana address
- Address should be 32-44 characters long
- Only base58 characters allowed

**Onramp widget not loading**
- Check that Crypto Onramp is enabled in your Stripe account
- Verify you're using the correct API keys
- Check for CORS issues in the browser console

## Support and Resources

- [Stripe Crypto Onramp Documentation](https://stripe.com/docs/crypto/onramp)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Bach Money Documentation](https://docs.bach.money)
- [Solana Documentation](https://docs.solana.com)

## License

This integration is part of the Bach Money dApp and follows the same license terms.

## Contact

For issues or questions:
- Bach Money: [https://bach.money](https://bach.money)
- Stripe Support: [https://support.stripe.com](https://support.stripe.com)