# Bach Money dApp Developer Guide

Quick reference guide for developers working on the Bach Money decentralized application.

## 🏗️ Project Structure

```
bach-money-app/
├── app/                      # Next.js App Router
│   ├── api/                 # API Routes
│   │   └── create-onramp-session/
│   │       └── route.ts     # Stripe Onramp session creation
│   ├── buy-crypto/          # Buy Crypto page
│   │   └── page.tsx
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Home page
├── docs/                    # Documentation
│   ├── README.md            # Documentation index
│   ├── STRIPE_SETUP.md      # Stripe integration guide
│   └── DEVELOPER_GUIDE.md   # This file
├── public/                  # Static assets
├── .env.local              # Environment variables (not in git)
├── .env.example            # Environment template
└── package.json            # Dependencies
```

## 🚀 Development Setup

### Prerequisites

- Node.js 18+ (recommended: 20+)
- pnpm (preferred) or npm/yarn
- A Stripe account with Crypto Onramp enabled

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd bach-money-app

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env.local

# Add your Stripe keys to .env.local
# STRIPE_SECRET_KEY=sk_test_...
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Start development server
pnpm dev
```

### Development Server

```bash
# Standard development
pnpm dev              # Runs on http://localhost:3000

# Production build testing
pnpm build
pnpm start            # Runs on http://localhost:3000

# Production on custom port
pnpm start-bachmoneyapp  # Runs on http://localhost:3017
```

## 🔑 Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `STRIPE_SECRET_KEY` | Stripe secret key (server-side) | `sk_test_...` or `sk_live_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (client-side) | `pk_test_...` or `pk_live_...` |

### Configuration

Create `.env.local` in the project root:

```env
STRIPE_SECRET_KEY=sk_test_your_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
```

**Important**: 
- Use `NEXT_PUBLIC_` prefix for client-side variables
- Never commit `.env.local` to version control
- Use test keys during development
- Switch to live keys for production

## 🎨 Tech Stack

| Technology | Purpose | Version |
|------------|---------|---------|
| Next.js | React framework | 15.3+ |
| React | UI library | 19.1+ |
| TypeScript | Type safety | 5.8+ |
| Tailwind CSS | Styling | 4.1+ |
| Stripe | Payment processing | Latest |

## 📁 Key Files

### API Routes

#### `/app/api/create-onramp-session/route.ts`

Server-side API endpoint for creating Stripe Crypto Onramp sessions.

**Endpoint**: `POST /api/create-onramp-session`

**Request**:
```json
{
  "wallet_address": "SolanaWalletAddress...",
  "destination_currency": "sol",
  "destination_network": "solana"
}
```

**Response**:
```json
{
  "client_secret": "cos_***_secret_***"
}
```

### Pages

#### `/app/buy-crypto/page.tsx`

Client-side Buy Crypto page with Stripe Onramp integration.

**Features**:
- Wallet address input and validation
- Cryptocurrency selection (SOL, USDC, USDT)
- Stripe SDK initialization
- Onramp widget mounting
- Error handling and user feedback

## 🔧 Common Development Tasks

### Adding a New Page

```typescript
// Create: app/my-page/page.tsx
export default function MyPage() {
  return (
    <div>
      <h1>My New Page</h1>
    </div>
  );
}
```

### Adding a New API Route

```typescript
// Create: app/api/my-endpoint/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  return NextResponse.json({ success: true });
}
```

### Using Environment Variables

```typescript
// Server-side (API routes)
const secretKey = process.env.STRIPE_SECRET_KEY;

// Client-side (pages/components)
const publicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
```

## 🧪 Testing

### Manual Testing

1. **Test Buy Crypto Flow**:
   ```bash
   pnpm dev
   # Navigate to http://localhost:3000/buy-crypto
   # Enter a test Solana address
   # Use Stripe test card: 4242 4242 4242 4242
   ```

2. **Validate Wallet Address**:
   - Valid: `7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU`
   - Invalid: `not-a-valid-address`

### Stripe Test Cards

| Card Number | Scenario |
|-------------|----------|
| 4242 4242 4242 4242 | Successful payment |
| 4000 0000 0000 9995 | Declined payment |

See [Stripe Testing Docs](https://stripe.com/docs/testing) for more.

## 🎯 Code Style

### TypeScript

- Use TypeScript for all new files
- Define interfaces for API responses
- Use proper typing, avoid `any` when possible

```typescript
interface OnrampSession {
  client_secret: string;
}

interface CreateSessionRequest {
  wallet_address: string;
  destination_currency: string;
  destination_network: string;
}
```

### React Components

- Use functional components
- Use hooks for state management
- Keep components focused and reusable

```typescript
"use client";

import { useState } from "react";

export default function MyComponent() {
  const [value, setValue] = useState("");
  
  return <div>{value}</div>;
}
```

### CSS/Tailwind

- Use Tailwind utility classes
- Keep custom CSS minimal
- Use responsive design patterns

```tsx
<div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
  <h1 className="text-2xl md:text-4xl font-bold">
    Responsive Title
  </h1>
</div>
```

## 🐛 Debugging

### Common Issues

**1. API Key Not Found**
```
Error: STRIPE_SECRET_KEY is not configured
```
**Solution**: Ensure `.env.local` exists with correct keys

**2. Stripe SDK Not Loading**
```
Error: window.Stripe is not defined
```
**Solution**: Check internet connection and browser console for script loading errors

**3. Invalid Wallet Address**
```
Error: Please enter a valid Solana wallet address
```
**Solution**: Use a valid Solana base58 address (32-44 chars)

### Debug Mode

Add console logging for debugging:

```typescript
console.log("Wallet address:", walletAddress);
console.log("Stripe loaded:", !!window.Stripe);
console.log("Onramp loaded:", !!window.StripeOnramp);
```

## 🚢 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# Settings → Environment Variables
```

### Manual Build

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

### Environment Variables in Production

Set these in your hosting platform:
- `STRIPE_SECRET_KEY` (use live key)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (use live key)

## 📚 Resources

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [Stripe Crypto Onramp](https://stripe.com/docs/crypto/onramp)
- [Solana Docs](https://docs.solana.com)
- [Tailwind CSS](https://tailwindcss.com/docs)

### Internal Docs
- [Stripe Setup Guide](STRIPE_SETUP.md)
- [Documentation Index](README.md)

### External Links
- [Bach Money](https://bach.money)
- [Bach Money Whitepaper](https://bach.money/whitepaper)

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Update documentation if needed
5. Submit a pull request

## 📝 Notes

- Always use test mode during development
- Keep API keys secure
- Follow TypeScript best practices
- Write clean, documented code
- Test cross-browser compatibility

---

**Last Updated**: 2024  
**Maintainer**: Bach Money Team