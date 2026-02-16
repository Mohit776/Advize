# Advize - Influencer Marketing Platform

**Advize** is a two-sided marketplace platform that connects **brands/businesses** with **verified creators/influencers** for transparent, data-driven influencer marketing campaigns.

## 📋 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, React 18, TypeScript |
| **Styling** | Tailwind CSS, Radix UI components |
| **Backend/Auth** | Firebase (Firestore, Authentication) |
| **Forms** | React Hook Form + Zod validation |
| **Charts** | Recharts |
| **Hosting** | Firebase App Hosting |

## 👥 User Roles

1. **Creators** - Influencers who can:
   - Browse and apply to campaigns
   - Track earnings and analytics
   - Manage their profile and wallet
   - Message businesses

2. **Businesses** - Brands/companies who can:
   - Create and manage campaigns
   - Explore creators (with SmartMatch AI recommendations)
   - Track campaign performance and ROI
   - Message creators

## 🗂️ Project Structure

- `src/app/` - Next.js App Router pages
  - `business/` - Business dashboard (campaigns, explore, wallet, messages)
  - `creator/` - Creator dashboard (campaigns, wallet, messages, profile)
  - `campaigns/` - Public campaign marketplace
  - `login/` & `signup/` - Authentication pages
  - `settings/` - User settings
- `src/components/` - Reusable UI components (Radix-based)
- `src/firebase/` - Firebase config, hooks, and Firestore utilities
- `src/hooks/` - Custom React hooks
- `src/lib/` - Utility functions

## ✨ Core Features

- **Campaign Marketplace**: Central hub for searching and filtering campaigns.
- **Role-Based Dashboards**: Customized interfaces for Creators and Businesses.
- **Analytics & Tracking**: Real-time metrics on campaign performance and engagement.
- **SmartMatch AI**: AI-driven recommendations for matching creators to campaigns.
- **Messaging System**: Direct communication channel between parties.
- **Wallet & Payments**: Management of earnings and financial transactions.
- **Profile Management**: Tools for users to showcase their portfolio or brand.

## 🎨 Design Guidelines

- **Primary Color**: Subtle blue (`#72BCD4`)
- **Background**: Light gray (`#F0F4F7`)
- **Accent**: Deep blue (`#3F51B5`)
- **Typography**: PT Sans (body) + Space Grotesk (headlines)
- **Layout**: Rresponsive grid with smooth transitions.

## 🏃 Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) to view the application.
