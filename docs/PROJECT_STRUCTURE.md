# Bach Money dApp Project Structure

Visual overview of the project directory structure for the Buy Crypto feature.

## 📁 Complete Project Tree

```
bach-money-app/
├── app/                                # Next.js App Router
│   ├── api/                           # API Routes
│   │   └── create-onramp-session/     # Stripe Onramp API
│   │       └── route.ts               # Session creation endpoint
│   ├── buy-crypto/                    # Buy Crypto feature
│   │   └── page.tsx                   # Main Buy Crypto page
│   ├── favicon.ico                    # Site favicon
│   ├── globals.css                    # Global styles
│   ├── layout.tsx                     # Root layout component
│   └── page.tsx                       # Homepage (with Buy Crypto button)
│
├── docs/                              # Documentation
│   ├── README.md                      # Documentation index
│   ├── QUICK_START.md                 # 5-minute setup guide
│   ├── STRIPE_SETUP.md                # Stripe integration guide
│   ├── DEVELOPER_GUIDE.md             # Developer reference
│   ├── IMPLEMENTATION_SUMMARY.md      # Implementation overview
│   ├── USER_FLOW.md                   # Visual user flow guide
│   ├── CHANGES.md                     # Complete changelog
│   └── PROJECT_STRUCTURE.md           # This file
│
├── public/                            # Static assets
│   ├── file.svg                       # File icon
│   ├── globe.svg                      # Globe icon
│   ├── next.svg                       # Next.js logo
│   ├── vercel.svg                     # Vercel logo
│   └── window.svg                     # Window icon
│
├── .env.example                       # Environment variable template
├── .env.local                         # Your secrets (not in git)
├── .gitignore                         # Git ignore rules
├── .npmrc                             # npm configuration
├── .nvmrc                             # Node version specification
├── LICENSE                            # Project license
├── README.md                          # Project README
├── next.config.ts                     # Next.js configuration
├── package.json                       # Dependencies and scripts
├── pnpm-lock.yaml                     # pnpm lock file
├── postcss.config.mjs                 # PostCSS configuration
└── tsconfig.json                      # TypeScript configuration
```

## 🎯 Key Directories

### `/app` - Application Code

The main application directory using Next.js App Router.

```
app/
├── api/                    # Server-side API routes
│   └── create-onramp-session/
│       └── route.ts        # POST endpoint for Stripe sessions
│
├── buy-crypto/            # Buy Crypto feature
│   └── page.tsx           # Client-side React component
│
├── globals.css            # Tailwind and global styles
├── layout.tsx             # Root layout (fonts, metadata)
└── page.tsx               # Homepage with Buy Crypto CTA
```

**Purpose**: Contains all application code, pages, and API routes.

### `/docs` - Documentation

Comprehensive documentation for the Buy Crypto feature.

```
docs/
├── README.md                      # Documentation hub
├── QUICK_START.md                 # Get started in 5 minutes
├── STRIPE_SETUP.md                # Stripe configuration
├── DEVELOPER_GUIDE.md             # Development reference
├── IMPLEMENTATION_SUMMARY.md      # What was built
├── USER_FLOW.md                   # User experience guide
├── CHANGES.md                     # Complete changelog
└── PROJECT_STRUCTURE.md           # This file
```

**Purpose**: Developer documentation, setup guides, and implementation details.

### `/public` - Static Assets

Static files served directly by Next.js.

```
public/
├── file.svg               # Icon for documentation
├── globe.svg              # Icon for external links
├── next.svg               # Next.js branding
├── vercel.svg             # Vercel branding
└── window.svg             # Icon for windows/apps
```

**Purpose**: Icons, images, and static assets.

## 📄 Key Files

### Application Files

#### `/app/buy-crypto/page.tsx`
- **Type**: Client-side React component
- **Lines**: ~400
- **Purpose**: Buy Crypto user interface
- **Features**:
  - Wallet address input and validation
  - Cryptocurrency selection
  - Stripe SDK integration
  - Onramp widget embedding
  - Error handling and loading states
  - Responsive design

#### `/app/api/create-onramp-session/route.ts`
- **Type**: Server-side API route
- **Lines**: ~73
- **Purpose**: Create Stripe Onramp sessions
- **Features**:
  - Wallet address validation
  - Stripe API authentication
  - Session creation
  - Error handling
  - Returns client secret

#### `/app/page.tsx`
- **Type**: Server-side React component
- **Modified**: Added Buy Crypto button
- **Purpose**: Homepage and entry point

#### `/app/layout.tsx`
- **Type**: Root layout component
- **Purpose**: Global layout, fonts, metadata
- **Fonts**: Geist Sans, Geist Mono

### Configuration Files

#### `.env.local` (Not in Git)
```env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```
**Purpose**: Store sensitive API keys securely.

#### `.env.example`
**Purpose**: Template for required environment variables.

#### `next.config.ts`
**Purpose**: Next.js framework configuration.

#### `tsconfig.json`
**Purpose**: TypeScript compiler configuration.

#### `tailwind.config.js`
**Purpose**: Tailwind CSS configuration (if exists).

#### `package.json`
```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "start-bachmoneyapp": "next start -p 3017",
    "lint": "next lint"
  }
}
```
**Purpose**: Dependencies and npm scripts.

## 🔍 File Size Overview

### Application Code
| File | Size | Type |
|------|------|------|
| `/app/buy-crypto/page.tsx` | ~11 KB | Component |
| `/app/api/create-onramp-session/route.ts` | ~2 KB | API Route |
| `/app/page.tsx` | ~2 KB | Component |
| `/app/layout.tsx` | ~1 KB | Layout |

### Documentation
| File | Size | Type |
|------|------|------|
| `docs/USER_FLOW.md` | ~16 KB | Guide |
| `docs/CHANGES.md` | ~12 KB | Changelog |
| `docs/IMPLEMENTATION_SUMMARY.md` | ~10 KB | Summary |
| `docs/DEVELOPER_GUIDE.md` | ~8 KB | Guide |
| `docs/STRIPE_SETUP.md` | ~6 KB | Guide |
| `docs/QUICK_START.md` | ~6 KB | Guide |
| `docs/README.md` | ~4 KB | Index |
| `docs/PROJECT_STRUCTURE.md` | ~3 KB | Reference |

### Build Output
```
Route (app)                              Size     First Load JS
├ ○ /                                   5.5 kB   111 kB
├ ƒ /api/create-onramp-session          136 B    102 kB
└ ○ /buy-crypto                        5.66 kB   111 kB
```

## 🗺️ Route Map

### Public Routes
```
/                          → Homepage (Static)
/buy-crypto                → Buy Crypto page (Static)
```

### API Routes
```
POST /api/create-onramp-session  → Create Stripe session (Dynamic)
```

## 📦 Dependencies

### Production
- `next@^15.3.4` - React framework
- `react@^19.1.0` - UI library
- `react-dom@^19.1.0` - React DOM renderer

### Development
- `@tailwindcss/postcss@^4.1.10` - Tailwind CSS
- `@types/node@^20.19.1` - Node.js types
- `@types/react@^19.1.8` - React types
- `@types/react-dom@^19.1.6` - React DOM types
- `tailwindcss@^4.1.10` - Utility-first CSS
- `typescript@^5.8.3` - Type safety

### External (CDN)
- `Stripe.js` - Payment processing SDK
- `Stripe Crypto Onramp SDK` - Crypto purchase widget

## 🔐 Environment Variables

### Required
```
STRIPE_SECRET_KEY                       # Server-side only
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY     # Client-side
```

### Location
- Development: `.env.local` (gitignored)
- Production: Set in hosting platform
- Template: `.env.example` (committed)

## 🎨 Styling Structure

### Global Styles
```
app/globals.css
├── @tailwind base
├── @tailwind components
└── @tailwind utilities
```

### Component Styles
- Tailwind utility classes (primary method)
- CSS-in-JS with `<style jsx>` (for Stripe widget)
- Inline styles (minimal, for dynamic values)

### Design Tokens
```
Colors:
├── Primary: Blue (#2563EB) to Purple (#9333EA)
├── Background: Gray-50 to White gradient
├── Text: Gray-900 (primary), Gray-600 (secondary)
└── Borders: Gray-200

Fonts:
├── Sans: Geist Sans (body text)
└── Mono: Geist Mono (code)

Spacing:
└── Tailwind default scale (0.25rem increments)
```

## 🚀 Build Process

### Development
```bash
pnpm dev
├── Starts Next.js dev server
├── Enables hot module replacement
├── Runs on http://localhost:3000
└── Uses .env.local for secrets
```

### Production Build
```bash
pnpm build
├── Compiles TypeScript
├── Optimizes React components
├── Generates static pages
├── Bundles JavaScript/CSS
└── Creates production artifacts in .next/
```

### Production Server
```bash
pnpm start
├── Serves production build
├── Runs on http://localhost:3000
└── Requires environment variables
```

## 📊 Code Statistics

### Total Lines of Code
- Application code: ~500 lines
- Documentation: ~1,800 lines
- Configuration: ~50 lines
- **Total**: ~2,350 lines

### File Count
- Application files: 4 (3 new, 1 modified)
- Documentation files: 8
- Configuration files: 1
- **Total**: 13 files

### Languages
- TypeScript/TSX: ~90%
- Markdown: ~10%
- CSS: <1%

## 🔗 Navigation Flow

```
User Entry Points:
├── Homepage (/)
│   └── "Buy Crypto" button
│       └── Navigates to /buy-crypto
│
└── Direct URL (/buy-crypto)
    ├── Enter wallet address
    ├── Select cryptocurrency
    ├── Click "Buy Crypto"
    └── Stripe widget appears
        ├── Complete payment
        └── Receive crypto
```

## 📚 Documentation Structure

```
Entry Point: docs/README.md
├── Quick Start: QUICK_START.md (5-min setup)
├── Setup: STRIPE_SETUP.md (detailed config)
├── Development: DEVELOPER_GUIDE.md (dev reference)
├── Architecture: IMPLEMENTATION_SUMMARY.md (what/why)
├── UX: USER_FLOW.md (user journey)
├── History: CHANGES.md (changelog)
└── Structure: PROJECT_STRUCTURE.md (this file)
```

## 🎯 Feature Map

```
Buy Crypto Feature
├── Frontend (/buy-crypto)
│   ├── Input Form
│   │   ├── Wallet address validation
│   │   └── Currency selection
│   ├── Stripe Integration
│   │   ├── SDK loading
│   │   └── Widget embedding
│   └── Error Handling
│       ├── Validation errors
│       └── Network errors
│
├── Backend (/api/create-onramp-session)
│   ├── Request validation
│   ├── Stripe API call
│   ├── Session creation
│   └── Response handling
│
└── Documentation (/docs)
    ├── Setup guides
    ├── Developer reference
    └── User flows
```

## ✅ Completeness Checklist

### Application
- [x] Buy Crypto page created
- [x] API endpoint implemented
- [x] Homepage updated with CTA
- [x] Environment variables configured
- [x] Build successful
- [x] No TypeScript errors
- [x] Responsive design working

### Documentation
- [x] Quick Start guide
- [x] Stripe Setup guide
- [x] Developer Guide
- [x] Implementation Summary
- [x] User Flow Guide
- [x] Changes document
- [x] Project Structure (this file)
- [x] Documentation index

### Testing
- [x] Development server runs
- [x] Production build succeeds
- [x] Pages accessible
- [x] API endpoint functional
- [x] Validation working
- [x] Responsive design verified

## 🎓 Learning Path

### For New Developers
1. Start with `README.md` (project overview)
2. Read `docs/QUICK_START.md` (get running)
3. Review `docs/PROJECT_STRUCTURE.md` (this file)
4. Study `docs/DEVELOPER_GUIDE.md` (development patterns)
5. Explore source code in `app/`

### For Integrators
1. Read `docs/STRIPE_SETUP.md` (Stripe configuration)
2. Review `docs/IMPLEMENTATION_SUMMARY.md` (architecture)
3. Study `docs/USER_FLOW.md` (understand UX)
4. Check `app/buy-crypto/page.tsx` (implementation)

### For Users
1. Read main `README.md`
2. Visit `/buy-crypto` page
3. Follow on-screen instructions

## 📞 Support Resources

### Internal
- Documentation: `/docs` folder
- Code comments: In-file documentation
- Type definitions: TypeScript interfaces

### External
- Stripe Docs: https://stripe.com/docs/crypto/onramp
- Next.js Docs: https://nextjs.org/docs
- Solana Docs: https://docs.solana.com
- Bach Money: https://bach.money

---

**Last Updated**: January 2025  
**Maintained By**: Bach Money Development Team  
**Status**: Production Ready (Test Mode)