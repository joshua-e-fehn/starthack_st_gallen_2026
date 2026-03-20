# TradeTales — The Investing Game

A medieval-themed finance simulator that teaches investing fundamentals through an engaging, story-driven experience. Players trade goods like wood, potatoes, and fish — metaphors for real asset classes — while racing to buy their farm before inflation erodes their goal.

Built for the **START Hack 2026** hackathon (St. Gallen) by **MunichMinds**.

**Live:** [munichminds.vercel.app](https://munichminds.vercel.app)

---

## Features

### Game

- **Turn-based simulation** — yearly rounds with income, trading, and market events
- **Three asset classes** — Wood (bonds/stable), Potatoes (equities/volatile), Fish (speculative/high-risk)
- **Dynamic market events** — droughts, trade booms, pirate raids, and more affect prices each year
- **Inflation-adjusted goal** — the farm price rises over time, teaching why holding cash loses value
- **Multiplayer lobbies** — create or join games with friends, compete on the same scenario
- **Real-time leaderboard** — animated race visualization after each round
- **Monte Carlo analysis** — 10,000-simulation "what-if" chart on the results page
- **AI chatbot (Connie the Coin)** — context-aware financial advisor powered by Gemini, with per-game chat history persisted in Convex

### Learning

- **Interactive lessons** — bite-sized modules on inflation, diversification, risk, and compound growth
- **Story-driven onboarding** — medieval narrative with illustrated characters and seller speech bubbles
- **AI-generated quotes** — dynamic landing page quotes from Gemini

### Platform

- **Guest play** — no sign-up required; guest identity stored locally
- **Full auth** — email/password + GitHub, Google, and Apple OAuth via Better Auth
- **Mobile-first** — responsive design optimized for phone screens
- **Dark & light themes** — system-aware with manual toggle
- **Analytics funnel** — step-level game event tracking

---

## Tech Stack

| Layer              | Technology                              |
| ------------------ | --------------------------------------- |
| Framework          | Next.js 16 (App Router, Turbopack)      |
| Language           | TypeScript 5.9                          |
| Runtime            | Bun                                     |
| Backend / Database | Convex (real-time)                      |
| Authentication     | Better Auth + @convex-dev/better-auth   |
| AI Engine          | Gemini (Google GenAI SDK)               |
| UI Components      | shadcn/ui + Radix UI                    |
| Styling            | Tailwind CSS v4                         |
| Animation          | Framer Motion                           |
| Charts             | Recharts                                |
| API Framework      | Hono                                    |
| Validation         | Zod                                     |
| Data Fetching      | React Query (REST) / Convex (real-time) |
| Linter / Formatter | Biome                                   |
| Hosting            | Vercel                                  |

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) 1.3+
- A [Convex](https://convex.dev/) account
- A [Gemini API key](https://aistudio.google.com/apikey) for AI features
- (Optional) OAuth credentials for GitHub, Google, and/or Apple sign-in

### 1. Install dependencies

```bash
bun install
```

### 2. Set up environment variables

Create `.env.local` in the project root:

```env
CONVEX_DEPLOYMENT=dev:<your-convex-deployment>
NEXT_PUBLIC_CONVEX_URL=https://<your-deployment>.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://<your-deployment>.convex.site
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# AI
GEMINI_API_KEY=<your-gemini-api-key>
GEMINI_MODEL=gemini-2.5-flash
```

Set Convex server-side environment variables:

```bash
bunx convex env set BETTER_AUTH_SECRET "<your-secret>"
bunx convex env set SITE_URL "http://localhost:3000"

# OAuth (optional)
bunx convex env set GITHUB_CLIENT_ID "<id>"
bunx convex env set GITHUB_CLIENT_SECRET "<secret>"
bunx convex env set GOOGLE_CLIENT_ID "<id>"
bunx convex env set GOOGLE_CLIENT_SECRET "<secret>"
```

### 3. Start development servers

```bash
# Terminal 1 — Convex
bunx convex dev

# Terminal 2 — Next.js
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
app/
  page.tsx                        # Landing page
  sign-in/ sign-up/               # Auth pages
  dashboard/                      # Protected dashboard (scenarios, competitions)
  game/
    page.tsx                      # Main game loop (trading UI, events, chatbot)
    lobby/                        # Multiplayer lobby (create/join)
    leaderboard/                  # Animated leaderboard race
    results/                      # End-game analysis (charts, Monte Carlo)
  learn/
    page.tsx                      # Lesson hub
    [lessonId]/                   # Individual lesson pages
    complete/                     # Lesson completion celebration
  api/
    auth/[...all]/                # Better Auth proxy
    [[...route]]/                 # Hono API catch-all

components/                       # Atomic Design
  ui/                             # Atoms — shadcn/ui primitives
  molecules/                      # Molecules — nav, chatbot, story elements
  organisms/                      # Organisms — sidebar, header, forms, story player
  providers/                      # Context wrappers (Convex, theme, auth guard)

convex/                           # Backend
  schema.ts                       # Database schema (games, sessions, chat, etc.)
  game.ts                         # Game queries & mutations
  auth.ts                         # Auth queries
  http.ts                         # HTTP router
  betterAuth/                     # Better Auth component

lib/
  ai/                             # Gemini integration (chatbot, prompts, quotes, images)
  game/                           # Game engine, events, Monte Carlo simulation
  lessons/                        # Lesson content data
  api/                            # Client-side fetch wrappers
  types/                          # Shared TypeScript types

hooks/                            # React hooks (game session, lesson progress, Convex)
```

### Component Architecture (Atomic Design)

| Layer         | Directory               | Description                          |
| ------------- | ----------------------- | ------------------------------------ |
| **Atoms**     | `components/ui/`        | shadcn/ui primitives                 |
| **Molecules** | `components/molecules/` | Small composites combining atoms     |
| **Organisms** | `components/organisms/` | Complex sections (sidebar, forms)    |
| **Providers** | `components/providers/` | Context wrappers (layouts only)      |

---

## Scripts

```bash
# Development
bun dev                    # Next.js dev server (Turbopack)
bunx convex dev            # Convex dev server

# Code Quality
bun lint                   # Lint (no auto-fix)
bun format                 # Format (writes changes)
bun check                  # Lint + format (writes changes)
bun typecheck              # TypeScript type checking

# Build & Deploy
bun run build              # Deploy Convex + build Next.js
```

Pre-commit hooks (Husky + lint-staged) automatically run `biome check --write` on staged files.

---

## Key Design Decisions

- **Medieval metaphor** — abstract financial concepts into intuitive trading goods to lower the barrier for finance beginners
- **Convex for real-time** — multiplayer game state, leaderboards, and chat sync instantly across clients
- **Gemini AI chatbot** — "Connie the Coin" provides contextual financial advice based on the player's current portfolio, market state, and game history
- **Monte Carlo on results** — 10,000 simulations show players how luck vs. strategy shaped their outcome
- **Guest-first** — no account required to play; guest identity persists via localStorage
- **Mobile-first** — primary target is phone users at a hackathon demo

---

## Documentation

| File                          | Purpose                                           |
| ----------------------------- | ------------------------------------------------- |
| [STORY.md](STORY.md)         | Product vision, gameplay rules, educational goals  |
| [DESIGN.md](DESIGN.md)       | UI/UX design system, colors, typography, animation |
| [agents.md](agents.md)       | Full technical reference for AI coding agents      |

---

## Environments

| Environment | Convex Deployment         | App URL                          |
| ----------- | ------------------------- | -------------------------------- |
| Dev         | `cheerful-woodpecker-140` | `http://localhost:3000`          |
| Prod        | `befitting-stingray-580`  | `https://munichminds.vercel.app` |

---

## Team

**MunichMinds** — START Hack St. Gallen 2026

---

## License

Private
