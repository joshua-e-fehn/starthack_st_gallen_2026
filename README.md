# TradeTales

A modern full-stack web application built with Next.js, Convex, and Better Auth. Dark-first, data-driven UI inspired by Palantir's design language.

**Production:** [munichminds.vercel.app](https://munichminds.vercel.app)

---

## Tech Stack

| Layer              | Technology                            |
| ------------------ | ------------------------------------- |
| Framework          | Next.js 16 (App Router, Turbopack)    |
| Language           | TypeScript 5.9                        |
| Runtime            | Bun                                   |
| Backend / Database | Convex                                |
| Authentication     | Better Auth + @convex-dev/better-auth |
| AI Engine          | Gemini AI (Google GenAI SDK)          |
| UI Components      | shadcn/ui + Radix UI                  |
| Styling            | Tailwind CSS v4                       |
| Animation          | Framer Motion                         |
| API Framework      | Hono                                  |
| Validation         | Zod                                   |
| Data Fetching      | React Query (REST) / Convex (real-time) |
| Linter / Formatter | Biome                                 |
| Hosting            | Vercel                                |

---

## Prerequisites

- [Bun](https://bun.sh/) 1.3+
- A [Convex](https://convex.dev/) account
- (Optional) OAuth credentials for GitHub, Google, and/or Apple sign-in

---

## Getting Started

### 1. Install dependencies

```bash
bun install
```

### 2. Set up environment variables

Create a `.env.local` file in the project root:

```env
CONVEX_DEPLOYMENT=dev:<your-convex-deployment>
NEXT_PUBLIC_CONVEX_URL=https://<your-deployment>.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://<your-deployment>.convex.site
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# AI Features
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

Run these in two separate terminals:

```bash
# Terminal 1 — Convex dev server
bunx convex dev

# Terminal 2 — Next.js dev server
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
app/                              # Next.js App Router pages
  layout.tsx                      # Root layout (providers + auth guard)
  page.tsx                        # Landing page
  sign-in/page.tsx                # Sign-in page
  sign-up/page.tsx                # Sign-up page
  dashboard/                      # Protected dashboard area
  api/auth/[...all]/route.ts      # Better Auth proxy route
  api/[[...route]]/               # Hono API catch-all
    route.ts                      # Hono app + route registration
    health.ts                     # Health check endpoint

components/                       # Atomic Design pattern
  ui/                             # Atoms — shadcn/ui primitives
  molecules/                      # Molecules — small composites
  organisms/                      # Organisms — complex sections
  providers/                      # Context/provider wrappers

convex/                           # Convex backend
  schema.ts                       # App-level database schema
  auth.ts                         # getCurrentUser query
  http.ts                         # HTTP router
  betterAuth/                     # Better Auth Convex component

hooks/                            # React hooks
  convex/                         # Convex query/mutation hooks
  use-mobile.ts                   # Mobile detection

lib/
  auth-client.ts                  # Client-side Better Auth instance
  auth-server.ts                  # Server-side auth helpers (SSR)
  auth-middleware.ts              # Hono auth middleware
  hono.ts                        # Typed Hono RPC client
  utils.ts                       # Utility functions
  api/                            # Client-side fetch wrappers
  types/                          # Shared TypeScript types
```

### Component Architecture (Atomic Design)

| Layer         | Directory               | Description                         |
| ------------- | ----------------------- | ----------------------------------- |
| **Atoms**     | `components/ui/`        | shadcn/ui primitives                |
| **Molecules** | `components/molecules/` | Small composites combining atoms    |
| **Organisms** | `components/organisms/` | Complex sections (sidebar, header)  |
| **Providers** | `components/providers/` | React context wrappers (layouts only) |

- Atoms never import molecules or organisms
- Molecules can import atoms but never organisms
- Organisms can import both atoms and molecules

---

## Scripts

```bash
# Development
bun dev                    # Start Next.js dev server (Turbopack)
bunx convex dev            # Start Convex dev server (keep running)

# Code Quality
bun lint                   # Lint with Biome (no auto-fix)
bun format                 # Format with Biome (writes changes)
bun check                  # Lint + format combined (writes changes)
bun typecheck              # TypeScript type checking (tsc --noEmit)

# Build & Deploy
bun run build              # Deploy Convex functions + build Next.js
bunx convex deploy         # Deploy Convex to production
```

---

## Authentication

Auth is handled by Better Auth running inside Convex. Supported providers:

- **Email + Password**
- **GitHub OAuth**
- **Google OAuth**
- **Apple Sign In**

Client usage:

```tsx
import { authClient } from "@/lib/auth-client"

// OAuth
await authClient.signIn.social({ provider: "github", callbackURL: "/dashboard" })

// Email
await authClient.signUp.email({ email, password, name })
await authClient.signIn.email({ email, password })

// Session hook
const { data: session } = authClient.useSession()
```

---

## API Routes (Hono)

Hono runs as a Next.js catch-all route at `/api/[[...route]]`. To add a new endpoint:

1. Create a route file in `app/api/[[...route]]/`
2. Register it in `route.ts`

Use the typed RPC client for end-to-end type safety:

```ts
import { honoClient } from "@/lib/hono"
const res = await honoClient.api.health.$get()
```

For client-side data fetching from Hono endpoints, follow the 3-layer pattern:

1. **Hono Route** — server-side logic
2. **API Function** (`lib/api/`) — client-side fetch wrapper
3. **React Query Hook** (`hooks/`) — caching + loading states

> Convex data uses Convex hooks directly — never wrap Convex queries in React Query.

---

## Code Quality

**Biome** handles both linting and formatting (replaces ESLint + Prettier).

**Pre-commit hooks** (Husky + lint-staged) automatically run `biome check --write` on staged files. Unfixable lint errors block the commit.

VS Code is configured with Biome as the default formatter with format-on-save enabled.

---

## Adding UI Components

```bash
bunx shadcn@latest add <component-name>
```

Components are placed in `components/ui/`. See [DESIGN.md](DESIGN.md) for visual guidelines.

---

## Environments

Dev and production use **separate Convex deployments** with isolated databases.

| Environment | Convex Deployment          | App URL                            |
| ----------- | -------------------------- | ---------------------------------- |
| Dev         | `cheerful-woodpecker-140`  | `http://localhost:3000`            |
| Prod        | `befitting-stingray-580`   | `https://munichminds.vercel.app`   |

---

## License

Private
