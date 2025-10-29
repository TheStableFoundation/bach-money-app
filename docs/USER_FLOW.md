# Buy Crypto User Flow Guide

This document provides a visual guide to the Buy Crypto feature user experience.

## 🎯 Overview

The Buy Crypto feature enables users to purchase cryptocurrency directly to their Solana wallet in a few simple steps.

## 🚶 User Journey

### Step 1: Entry Point
```
┌─────────────────────────────────┐
│      Bach Money Homepage        │
│                                 │
│  ┌───────────────────────────┐ │
│  │   [Buy Crypto] Button     │ │
│  │   (Blue/Purple Gradient)   │ │
│  └───────────────────────────┘ │
│                                 │
│  • Prominent call-to-action    │
│  • Matches brand colors        │
│  • Located on homepage         │
└─────────────────────────────────┘
                │
                ▼
```

### Step 2: Buy Crypto Page
```
┌─────────────────────────────────────────────┐
│         Buy Crypto Instantly                │
│                                             │
│  Purchase cryptocurrency directly to your   │
│  Solana wallet using credit card, debit     │
│  card, or bank transfer. Powered by Stripe. │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │ Your Solana Wallet Address            │ │
│  │ ┌─────────────────────────────────┐   │ │
│  │ │ Enter address...                │   │ │
│  │ └─────────────────────────────────┘   │ │
│  │ Enter your Solana wallet address to   │ │
│  │ receive crypto                         │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │ Select Cryptocurrency                  │ │
│  │ ┌─────────────────────────────────┐   │ │
│  │ │ ▼ Select currency              │   │ │
│  │ │   • Solana (SOL)               │   │ │
│  │ │   • USD Coin (USDC)            │   │ │
│  │ │   • Tether (USDT)              │   │ │
│  │ └─────────────────────────────────┘   │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │        [Buy Crypto]                   │ │
│  │    (Gradient Button)                  │ │
│  └───────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
                │
                ▼
```

### Step 3: Validation
```
┌─────────────────────────────────┐
│   Input Validation              │
│                                 │
│  ✓ Wallet address format        │
│  ✓ Address length (32-44 chars) │
│  ✓ Base58 encoding              │
│  ✓ Currency selection           │
│                                 │
│  If invalid:                    │
│  ┌───────────────────────────┐ │
│  │ ⚠️ Error message shown    │ │
│  │ User can correct input     │ │
│  └───────────────────────────┘ │
└─────────────────────────────────┘
                │
                ▼
```

### Step 4: Session Creation
```
┌─────────────────────────────────┐
│   Creating Session...           │
│                                 │
│  • Button shows loading state   │
│  • API call to backend          │
│  • Stripe session created       │
│  • Client secret returned       │
│                                 │
│  Backend Process:               │
│  ┌───────────────────────────┐ │
│  │ POST /api/create-onramp-  │ │
│  │      session              │ │
│  │                           │ │
│  │ → Stripe API call         │ │
│  │ ← client_secret           │ │
│  └───────────────────────────┘ │
└─────────────────────────────────┘
                │
                ▼
```

### Step 5: Stripe Onramp Widget
```
┌─────────────────────────────────────────────┐
│       Stripe Crypto Onramp Widget           │
│   ┌─────────────────────────────────────┐   │
│   │                                     │   │
│   │  [Stripe Hosted Experience]        │   │
│   │                                     │   │
│   │  • Payment method selection        │   │
│   │  • Amount input                    │   │
│   │  • Card details / Bank info        │   │
│   │  • Identity verification           │   │
│   │  • Transaction confirmation        │   │
│   │                                     │   │
│   │  Supported Payment Methods:        │   │
│   │  💳 Credit/Debit Cards            │   │
│   │  🏦 Bank Transfers                │   │
│   │  🍎 Apple Pay                     │   │
│   │  📱 Google Pay                    │   │
│   │                                     │   │
│   └─────────────────────────────────────┘   │
│                                             │
│  • Secure iframe environment               │
│  • PCI compliant                           │
│  • Centered on desktop                     │
│  • Full width on mobile                    │
└─────────────────────────────────────────────┘
                │
                ▼
```

### Step 6: Payment Processing
```
┌─────────────────────────────────┐
│   Payment Processing            │
│                                 │
│  1. User enters payment info    │
│  2. Stripe processes payment    │
│  3. KYC/AML checks if needed    │
│  4. Payment confirmed           │
│  5. Crypto purchase initiated   │
│                                 │
│  Status Updates:                │
│  • Processing payment...        │
│  • Verifying transaction...     │
│  • Preparing delivery...        │
└─────────────────────────────────┘
                │
                ▼
```

### Step 7: Crypto Delivery
```
┌─────────────────────────────────┐
│   Crypto Delivery               │
│                                 │
│  ┌───────────────────────────┐ │
│  │  Solana Blockchain        │ │
│  │                           │ │
│  │  • Crypto transferred     │ │
│  │  • Sent to user's wallet  │ │
│  │  • Transaction on-chain   │ │
│  └───────────────────────────┘ │
│                                 │
│  User receives:                 │
│  ✅ SOL / USDC / USDT          │
│  ✅ In their wallet            │
│  ✅ Transaction complete       │
└─────────────────────────────────┘
                │
                ▼
```

### Step 8: Completion
```
┌─────────────────────────────────┐
│   Transaction Complete! 🎉      │
│                                 │
│  ✅ Payment successful          │
│  ✅ Crypto delivered            │
│  ✅ Transaction recorded        │
│                                 │
│  User can:                      │
│  • View transaction in wallet   │
│  • Make another purchase        │
│  • Return to homepage           │
└─────────────────────────────────┘
```

## 🎨 Visual Elements

### Page Layout
```
┌────────────────────────────────────────────┐
│ Header: Bach Money | [← Back to Home]     │
├────────────────────────────────────────────┤
│                                            │
│              [Hero Section]                │
│          Buy Crypto Instantly              │
│                                            │
│        ┌────────────────────┐              │
│        │   Input Form       │              │
│        │   - Wallet Address │              │
│        │   - Currency       │              │
│        │   [Buy Crypto]     │              │
│        └────────────────────┘              │
│                                            │
│        ┌────────────────────┐              │
│        │  Onramp Widget     │              │
│        │  (Appears after    │              │
│        │   form submission) │              │
│        └────────────────────┘              │
│                                            │
│  ┌──────┐  ┌──────┐  ┌──────┐             │
│  │ 🔒  │  │ ⚡   │  │ 💳  │             │
│  │Secure│  │ Fast │  │ Multi│             │
│  └──────┘  └──────┘  └──────┘             │
│                                            │
└────────────────────────────────────────────┘
```

### Color Scheme
```
Primary Colors:
├─ Blue:   #2563EB (rgb(37, 99, 235))
├─ Purple: #9333EA (rgb(147, 51, 234))
└─ Gradient: from-blue-600 to-purple-600

Secondary Colors:
├─ Background: Gray-50 to White gradient
├─ Text: Gray-900 (primary), Gray-600 (secondary)
└─ Borders: Gray-200
```

## 📱 Responsive Behavior

### Desktop (≥768px)
```
┌────────────────────────────────────┐
│  Wide layout                       │
│  Max-width: 600px (widget)         │
│  Centered content                  │
│  3-column info cards               │
│  Full button width in form         │
└────────────────────────────────────┘
```

### Mobile (<768px)
```
┌──────────────┐
│ Stacked      │
│ layout       │
│              │
│ Full width   │
│ widget       │
│              │
│ 1-column     │
│ info cards   │
│              │
│ Touch-       │
│ friendly     │
│ buttons      │
└──────────────┘
```

## ⚠️ Error States

### Invalid Wallet Address
```
┌─────────────────────────────────┐
│ ⚠️ Error Box (Red background)   │
│                                 │
│ "Please enter a valid Solana    │
│  wallet address"                │
│                                 │
│ • Input border turns red        │
│ • User can correct immediately  │
│ • Validation on button click    │
└─────────────────────────────────┘
```

### Network Error
```
┌─────────────────────────────────┐
│ ⚠️ Error Box (Red background)   │
│                                 │
│ "Failed to initialize crypto    │
│  purchase. Please try again."   │
│                                 │
│ • Button returns to normal      │
│ • User can retry                │
└─────────────────────────────────┘
```

### Stripe Loading Error
```
┌─────────────────────────────────┐
│ ⚠️ Error Box (Red background)   │
│                                 │
│ "Failed to load payment system. │
│  Please refresh the page."      │
│                                 │
│ • Button disabled until loaded  │
│ • Shows "Loading..." state      │
└─────────────────────────────────┘
```

## ⏱️ Timing

| Action | Duration | Notes |
|--------|----------|-------|
| Page load | < 2s | Including SDK loading |
| Wallet validation | Instant | Client-side regex |
| Session creation | 1-3s | API call to backend |
| Widget mounting | 1-2s | Stripe iframe load |
| Payment processing | 30s-2m | Varies by payment method |
| Crypto delivery | 5-30m | Blockchain confirmation time |

## 🔄 User Actions

### Primary Actions
- Enter wallet address
- Select cryptocurrency
- Click "Buy Crypto"
- Complete payment in widget

### Secondary Actions
- Return to homepage
- Read information cards
- View error messages

## 📊 Success Metrics

### User Experience
- ✅ Clear, simple interface
- ✅ Minimal steps (3 clicks to payment)
- ✅ Real-time validation feedback
- ✅ Loading state indicators
- ✅ Error handling with recovery

### Technical
- ✅ Fast page load (< 2s)
- ✅ Responsive design
- ✅ Secure payment handling
- ✅ PCI compliance via Stripe

## 🎓 User Education

### Information Cards

**Card 1: Secure & Safe**
- 🔒 Icon
- Message: Stripe's security infrastructure
- Build trust

**Card 2: Fast Processing**
- ⚡ Icon
- Message: Quick delivery
- Set expectations

**Card 3: Multiple Payment Methods**
- 💳 Icon
- Message: Various payment options
- Show flexibility

## 🔗 External Links

Users can access:
- Bach Money homepage (header link)
- Bach Money website (footer)
- Whitepaper (from homepage)

---

**Last Updated**: January 2025  
**Document Type**: User Flow Guide  
**Related Docs**: [Developer Guide](DEVELOPER_GUIDE.md), [Stripe Setup](STRIPE_SETUP.md)