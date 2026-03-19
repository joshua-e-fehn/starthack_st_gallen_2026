# MunichMinds — Project Reference

## Tech Stack

| Layer                           | Technology                            | Version        |
| ------------------------------- | ------------------------------------- | -------------- |
| Framework                       | Next.js (Turbopack)                   | 16.1.6         |
| Language                        | TypeScript                            | 5.9            |
| Runtime                         | Bun                                   | 1.3+           |
| Backend / Database              | Convex                                | 1.32           |
| Authentication                  | Better Auth + @convex-dev/better-auth | 1.5.5 / 0.11.1 |
| AI Engine                       | Gemini (Google GenAI SDK)             | 1.46           |
| UI Components                   | shadcn/ui + Radix UI                  | 4.0 / 1.4      |
| Styling                         | Tailwind CSS v4                       | 4.1            |
| Animation                       | Framer Motion                         | 12.x           |
| Linter / Formatter              | Biome                                 | 2.4            |
| API Framework                   | Hono                                  | 4.12           |
| Validation                      | Zod                                   | 4.3            |
| Data Fetching (non Convex data) | React Query (@tanstack/react-query)   | 5.x            |
| Hosting                         | Vercel                                | —              |

## Project Structure

```
app/                            # Next.js App Router pages
  layout.tsx                    # Root layout (ConvexClientProvider + ThemeProvider + AuthGuard)
  page.tsx                      # Home / landing page
  sign-in/page.tsx              # Sign-in page
  sign-up/page.tsx              # Sign-up page
  dashboard/layout.tsx          # Dashboard layout (sidebar + header)
  dashboard/page.tsx            # Dashboard home (protected)
  not-found.tsx                 # Custom 404 page
  api/auth/[...all]/route.ts    # Better Auth proxy route handler
  api/[[...route]]/              # Hono API catch-all
    route.ts                    # Hono app + route registration
    health.ts                   # Example route (public + auth-protected)

components/                     # Atomic Design pattern
  ui/                           # ATOMS — shadcn/ui primitives (button, input, card, etc.)
  molecules/                    # MOLECULES — small composites (nav-main, nav-user, team-switcher)
  organisms/                    # ORGANISMS — complex sections (app-sidebar, header, login-form, public-header)
  providers/                    # PROVIDERS — context wrappers (convex-client-provider, theme-provider, auth-guard)

convex/                         # Convex backend
  auth.ts                       # getCurrentUser query
  auth.config.ts                # Convex auth config (Better Auth provider)
  convex.config.ts               # App config (registers betterAuth component)
  http.ts                       # HTTP router (auth routes)
  schema.ts                     # App-level Convex schema

  betterAuth/                   # Better Auth Convex component (local install)
    convex.config.ts             # Component definition
    auth.ts                      # Better Auth instance + options
    schema.ts                    # Auto-generated auth tables (user, session, account, etc.)
    adapter.ts                   # DB adapter functions

hooks/                          # React hooks
  convex/                       # Convex-specific hooks (queries, mutations)
  use-mobile.ts                 # Mobile detection hook

lib/
  api/                          # Client-side API functions (fetch wrappers)
  types/                        # Shared TypeScript types
  auth-client.ts                # Client-side Better Auth instance (React hooks)
  auth-server.ts                # Server-side helpers (SSR, getToken, preloadAuthQuery)
  auth-middleware.ts            # Hono middleware (session resolution + requireAuth)
  hono.ts                       # Typed Hono RPC client (hc<AppType>)
  utils.ts                      # Utility functions (cn)
```

### Component Architecture (Atomic Design)

Components follow the **Atomic Design** pattern:

| Layer         | Directory               | Description                                             | Examples                                    |
| ------------- | ----------------------- | ------------------------------------------------------- | ------------------------------------------- |
| **Atoms**     | `components/ui/`        | Smallest UI primitives from shadcn/ui                   | Button, Input, Card, Label, Avatar          |
| **Molecules** | `components/molecules/` | Small composites combining atoms                        | NavMain, NavUser, TeamSwitcher, NavProjects |
| **Organisms** | `components/organisms/` | Complex page sections combining molecules + atoms       | AppSidebar, Header, PublicHeader, LoginForm |
| **Providers** | `components/providers/` | React context/provider wrappers (not visual components) | ConvexClientProvider, ThemeProvider         |

**Rules:**

- Atoms **never** import from molecules or organisms
- Molecules can import atoms but **never** organisms
- Organisms can import both atoms and molecules
- Providers are standalone wrappers, imported only in layouts
- New shadcn/ui components go in `components/ui/` (atoms)
- Import paths use `@/components/{layer}/{component}`

## API Architecture (Hono)

### Overview

Hono runs as a Next.js API route at `/api/[[...route]]`. All non-auth API endpoints go through Hono. Auth endpoints (`/api/auth/*`) remain as a separate Better Auth proxy route (more specific routes take priority over the catch-all).

### Adding a New API Route

1. Create a route file in `app/api/[[...route]]/`:

```ts
// app/api/[[...route]]/example.ts
import { Hono } from "hono"
import { requireAuth } from "@/lib/auth-middleware"

const app = new Hono()
app.get("/", requireAuth, (c) => {
  const user = c.get("user")
  return c.json({ message: `Hello ${user!.name}` })
})
export default app
```

2. Register it in `route.ts`:

```ts
const routes = app
  .route("/health", health)
  .route("/example", example)  // add here
```

### Auth Middleware

- `authMiddleware` — resolves session for all routes (set automatically via `app.use("*")`)
- `requireAuth` — returns 401 if no session; use on protected endpoints
- Session data accessible via `c.get("user")` and `c.get("session")`

### Typed RPC Client

`lib/hono.ts` exports a typed Hono client (`honoClient`) for end-to-end type-safe API calls:

```ts
import { honoClient } from "@/lib/hono"
const res = await honoClient.api.health.$get()
const data = await res.json()
```

### Project Conventions

| Layer             | Directory                   | Purpose                                 |
| ----------------- | --------------------------- | --------------------------------------- |
| **Hono routes**   | `app/api/[[...route]]/*.ts` | Server-side API endpoints               |
| **API functions** | `lib/api/`                  | Client-side fetch wrappers              |
| **Types**         | `lib/types/`                | Shared TypeScript types                 |
| **Hooks**         | `hooks/`                    | React Query hooks (for Hono API calls)  |
| **Convex hooks**  | `hooks/convex/`             | Convex query/mutation hooks (real-time) |

### Data Fetching Pattern (3-Layer)

For **Hono API** data, follow the 3-layer pattern:

1. **Hono Route** (`app/api/[[...route]]/example.ts`) — server-side logic
2. **API Function** (`lib/api/example.ts`) — client-side fetch wrapper
3. **React Query Hook** (`hooks/example.ts`) — caching, loading states, refetch

```ts
// 1. lib/types/example.ts — shared types
export type Widget = { id: string; name: string }

// 2. lib/api/example.ts — fetch wrapper
import type { Widget } from "@/lib/types/example"

export async function getWidgets(): Promise<Widget[]> {
  const res = await fetch("/api/widgets")
  if (!res.ok) throw new Error("Failed to fetch widgets")
  return res.json()
}

// 3. hooks/example.ts — React Query hook
import { useQuery } from "@tanstack/react-query"
import * as exampleApi from "@/lib/api/example"

export const exampleKeys = {
  all: ["widgets"] as const,
  list: () => [...exampleKeys.all, "list"] as const,
}

export function useWidgets() {
  return useQuery({
    queryKey: exampleKeys.list(),
    queryFn: exampleApi.getWidgets,
  })
}
```

For **Convex** data, use Convex hooks directly (`hooks/convex/`):

```ts
// hooks/convex/user.ts
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

export function useCurrentUser() {
  return useQuery(api.auth.currentUser)
}
```

> **Rule:** React Query is for Hono/REST API calls. Convex has its own real-time subscriptions — never wrap Convex queries in React Query.

## Code Quality

### Biome (Linter + Formatter)

Biome replaces ESLint and Prettier as the single tool for linting and formatting. Configuration lives in `biome.json`.

**Key settings:**

- Indent: 2 spaces
- Line width: 100
- Quotes: double
- Semicolons: as needed (omitted where optional)
- CSS files are excluded (Tailwind v4 `@theme` syntax is unsupported)
- `convex/_generated/` and `convex/betterAuth/_generated/` are excluded from lint/format
- `components/ui/` has relaxed rules (shadcn generated code)

**Scripts:**

```bash
bun lint       # Lint only (no auto-fix)
bun format     # Format only (writes changes)
bun check      # Lint + format combined (writes changes) — the all-in-one command
bun typecheck  # TypeScript type checking (tsc --noEmit)
```

### Pre-Commit Hook (Husky + lint-staged)

Every `git commit` automatically runs `biome check --write` on staged files. If Biome finds unfixable lint errors, the commit is **rejected**.

- **Husky** manages the git pre-commit hook (`.husky/pre-commit`)
- **lint-staged** runs Biome only on staged `*.{js,ts,jsx,tsx,json,jsonc}` files
- Auto-fixable issues (formatting, import ordering) are fixed and included in the commit
- Unfixable lint violations block the commit entirely

This means code quality is enforced even if a contributor doesn't have the Biome VS Code extension installed.

### VS Code Integration

- `.vscode/settings.json` sets Biome as the default formatter with format-on-save
- `.vscode/extensions.json` recommends the `biomejs.biome` extension
- `.editorconfig` provides baseline settings for non-VS Code editors

## Authentication

### Providers Configured

- **Email + Password** — works out of the box
- **GitHub OAuth** — requires `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET`
- **Google OAuth** — requires `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`
- **Apple Sign In** — requires `APPLE_CLIENT_ID` + `APPLE_CLIENT_SECRET`

### How Auth Works

Better Auth runs **inside Convex** (not on the Next.js server). The flow:

1. Client calls `authClient.signIn.social({ provider: "github" })` or `authClient.signIn.email()`
2. Next.js API route at `/api/auth/[...all]` proxies the request to Convex
3. Convex handles the OAuth flow / credential validation via Better Auth
4. On success, a session is created in the Convex database
5. `ConvexBetterAuthProvider` manages the auth token on the client

### Client-Side Usage

```tsx
import { authClient } from "@/lib/auth-client";

// OAuth sign in
await authClient.signIn.social({ provider: "github", callbackURL: "/dashboard" });
await authClient.signIn.social({ provider: "google", callbackURL: "/dashboard" });

// Email sign up / sign in
await authClient.signUp.email({ email, password, name });
await authClient.signIn.email({ email, password });

// Session (React hook)
const { data: session } = authClient.useSession();

// Sign out
await authClient.signOut();
```

### Server-Side Usage

```tsx
// In Convex queries/mutations
const identity = await ctx.auth.getUserIdentity();

// In Next.js server components
import { isAuthenticated, getToken, preloadAuthQuery } from "@/lib/auth-server";
const hasToken = await isAuthenticated();
```

### OAuth Callback URLs

Each OAuth provider must have the correct callback URL configured:

| Provider | Dev Callback                                     | Prod Callback                                             |
| -------- | ------------------------------------------------ | --------------------------------------------------------- |
| GitHub   | `http://localhost:3000/api/auth/callback/github` | `https://munichminds.vercel.app/api/auth/callback/github` |
| Google   | `http://localhost:3000/api/auth/callback/google` | `https://munichminds.vercel.app/api/auth/callback/google` |
| Apple    | `http://localhost:3000/api/auth/callback/apple`  | `https://munichminds.vercel.app/api/auth/callback/apple`  |

> **Note:** GitHub only allows one callback URL per OAuth App. Create a separate OAuth App for dev vs prod if needed. Google supports multiple redirect URIs in a single app.

## Environments

### Dev vs Prod — Separate Convex Deployments

Dev and prod use **completely separate Convex deployments** with independent databases.

- A user created on `localhost:3000` does **not** exist on `munichminds.vercel.app`
- All data (users, sessions, app data) is isolated per deployment
- This prevents test data from polluting production
- Use `bunx convex export` / `bunx convex import` to copy data between deployments if needed

### Environment Variables

#### Dev (`.env.local` — used by `bun dev` + `bunx convex dev`)

```
CONVEX_DEPLOYMENT=dev:cheerful-woodpecker-140
NEXT_PUBLIC_CONVEX_URL=https://cheerful-woodpecker-140.eu-west-1.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://cheerful-woodpecker-140.eu-west-1.convex.site
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

#### Prod (Vercel environment variables)

```
NEXT_PUBLIC_CONVEX_URL=https://befitting-stingray-580.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://befitting-stingray-580.convex.site
NEXT_PUBLIC_SITE_URL=https://munichminds.vercel.app
CONVEX_DEPLOY_KEY=prod:befitting-stingray-580|<key>
```

#### Convex Deployment Env Vars (set via `bunx convex env set`)

These run on the Convex server, **not** in `.env.local`:

| Variable               | Description                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `BETTER_AUTH_SECRET`   | Encryption/hashing secret (auto-generated)                                           |
| `SITE_URL`             | App URL (`http://localhost:3000` for dev, `https://munichminds.vercel.app` for prod) |
| `GITHUB_CLIENT_ID`     | GitHub OAuth App client ID                                                           |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret                                                       |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID                                                               |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret                                                           |
| `APPLE_CLIENT_ID`      | Apple Services ID                                                                    |
| `APPLE_CLIENT_SECRET`  | Apple generated JWT secret                                                           |

## Commands

```bash
# Development
bun dev                          # Start Next.js dev server
bunx convex dev                  # Start Convex dev server (keep running)

# Code Quality
bun lint                         # Lint with Biome (no auto-fix)
bun format                       # Format with Biome (writes changes)
bun check                        # Lint + format with Biome (writes changes)
bun typecheck                    # TypeScript type checking

# Build & Deploy
bun run build                    # Build Next.js
bunx convex deploy               # Deploy to prod Convex deployment
vercel --prod                    # Deploy to Vercel production

# Convex Management
bunx convex env set KEY value    # Set env var on dev deployment
bunx convex env set --prod KEY value  # Set env var on prod deployment
bunx convex env list             # List dev env vars
bunx convex env list --prod      # List prod env vars
bunx convex dev --once           # Push functions once without watching

# Auth Schema
bunx auth generate --config ./convex/betterAuth/auth.ts --output ./convex/betterAuth/schema.ts
```

## Deployment

- **Production URL:** https://munichminds.vercel.app
- **Dev Convex Deployment:** `cheerful-woodpecker-140` (EU West — Ireland)
- **Prod Convex Deployment:** `befitting-stingray-580`
- **Convex Dashboard:** https://dashboard.convex.dev/t/joshua-fehn/munichminds
- **Vercel Project:** joshuas-projects-dc895e08/munichminds
- **GitHub Repo:** Connected via Vercel (auto-deploys on push)

### CI/CD

Vercel builds automatically deploy Convex functions to the prod deployment via `CONVEX_DEPLOY_KEY`.
Local `bunx convex dev` always targets the dev deployment (`cheerful-woodpecker-140`).
Manual prod deploy: `bunx convex deploy` (or push to GitHub for auto-deploy).

**Pre-commit hooks** enforce code quality locally — every commit runs Biome via Husky + lint-staged. Contributors must have clean lint/format to commit.

## UI/UX Design System

All frontend design decisions are governed by **`DESIGN.md`** in the project root. The design language blends **professional financial credibility** with **playful gamification**, centered around the mascot **Gildi the Goldvreneli** (an anthropomorphized Swiss gold coin). This file defines:

- **Mascot guide** — Gildi the Goldvreneli: roles, animation states, design rules, and scale guidelines
- **Branding** — "Wealth Manager Arena: The Investing Game" with gold-primary, Alpine blue secondary palette
- **Color palette** — Gold (`#FFD700`) as primary, Alpine Blue (`#B3E5FC`) as secondary, Success Green, Alert Red (maps to CSS tokens in `globals.css`)
- **Typography** — Montserrat for all text; monospace for financial data
- **Iconography** — Flat/soft shadow style with Lucide React; Gildi integrated into graphs, cards, and notifications
- **Design principles** — Professional credibility, playful learning, clean & minimal, data-forward, feedback everywhere, quick onboarding, mobile-first, accessible, both themes supported
- **Component conventions** — Cards with gold accents, gamified buttons, Gildi in empty/loading states
- **Animation patterns** — Framer Motion for rich interactions (including Gildi celebrate/empathy/idle), CSS for simple states, gold glow pulses
- **Tone of voice** — Friendly, encouraging, non-judgmental, professionally credible
- **Landing page direction** — Gold gradient hero with Gildi, animated stats, sparkle effects
- **Anti-patterns** — "Do NOT" list (no arbitrary colors, no childish mascot, no gold-on-gold, etc.)

> **Rule:** Any time frontend UI is created or modified, `DESIGN.md` must be consulted and followed.

## Product Story

Product vision, user journey, simulation rules, and educational framing are governed by **`STORY.md`** in the project root. This file defines:

- **Core vision** — medieval finance simulator where the player aims to buy their farm
- **User journey** — yearly turn loop, progression, decision points, and end goal
- **Educational goals** — investing, inflation, diversification, volatility, and long-term thinking
- **Simulation mapping** — wood, potatoes, and fish as metaphors for asset classes
- **Economic systems** — inflation, market phases, and random events
- **Product constraints** — clarity over realism, strategy over complexity, asynchronous multiplayer
- **AI integration** — Gemini powers chatbot assistance and landing page quotes

> **Rule:** Any time gameplay, content, progression, onboarding flow, or economic logic is created or modified, `STORY.md` must be consulted and followed.

## Documentation Rules

- For UI, visual language, motion, branding, responsive behavior, and tone in the interface, consult `DESIGN.md`
- For gameplay flow, user journey, learning goals, narrative framing, and balancing direction, consult `STORY.md`
- Preserve the medieval metaphor across product, copy, and features unless explicitly asked to change it
- Keep the experience understandable for finance beginners and favor clarity over realism
