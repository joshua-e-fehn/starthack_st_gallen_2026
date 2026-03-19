# UI/UX Design System — Trade Tales: The Investing Game

> **This file is the single source of truth for all frontend design decisions.**
> It is referenced any time UI code is created or modified.

---

## Role

Act as a world-class Creative Developer specializing in modern Next.js applications, gamified financial interfaces, and premium UX. The visual language blends **professional financial credibility** with **playful, approachable gamification** — think fintech meets educational game. Every screen should feel trustworthy and bank-aligned, yet warm, inviting, and encouraging. Gold as the hero color evokes wealth and trust; the mascot Gildi the Goldvreneli brings personality and emotional engagement.

---

## Tech Stack (do not deviate)

| Layer         | Technology                                                                      |
| ------------- | ------------------------------------------------------------------------------- |
| Framework     | Next.js 16+ (App Router, Turbopack)                                             |
| Language      | TypeScript 5.9                                                                  |
| Runtime       | Bun                                                                             |
| Auth          | Better Auth + Convex                                                            |
| Backend / DB  | Convex (real-time)                                                              |
| UI Components | shadcn/ui + Radix UI                                                            |
| Styling       | Tailwind CSS v4 (CSS-first config)                                              |
| Animation     | Framer Motion (hero sections, onboarding, page transitions, micro-interactions) |
| Icons         | Lucide React                                                                    |
| API           | Hono (REST endpoints)                                                           |
| Data Fetching | React Query (REST) / Convex hooks                                               |

### Animation Guidelines (Framer Motion)

Use Framer Motion **generously** on:

- Landing / marketing pages (scroll-triggered reveals, parallax, hero animations)
- Onboarding flows (step transitions, Gildi introductions, progress celebrations)
- Page transitions (`AnimatePresence` + layout animations)
- Micro-interactions (card hovers, button feedback, list reordering)
- Data visualizations (number counters, chart entrances, portfolio changes)
- Mascot reactions (Gildi bouncing, glowing, pointing, celebrating)

Use **CSS transitions only** for:

- Simple hover states on buttons/links
- Sidebar expand/collapse
- Skeleton shimmer (shadcn built-in)
- Tooltip/popover show/hide (Radix handles these)

**Motion rules:**

- Duration: 150–500ms (never exceed 600ms for UI elements; Gildi animations may be 300–500ms)
- Easing: `[0.25, 0.1, 0.25, 1]` (smooth) or `[0.33, 1, 0.68, 1]` (snappy exit)
- Stagger children: 50–80ms delay between items
- Respect `prefers-reduced-motion` — wrap animated content with a check or use Framer's built-in support
- Scroll animations use `whileInView` with `viewport={{ once: true, margin: "-100px" }}`

---

## Mascot: Gildi the Goldvreneli

### Description

Gildi is a living, anthropomorphized Swiss Goldvreneli coin:

- **Face:** Expressive eyes and friendly smile engraved on the coin surface
- **Limbs:** Small gold arms and legs for gestures and movement
- **Expressions:** Joyful, encouraging, playful, and dynamic
- **Accessories/props:** Optional tablet with graphs, mini coins, sparkles for emphasis

### Roles in UI / Game

| Context                    | Role                                                           |
| -------------------------- | -------------------------------------------------------------- |
| **Onboarding**             | Guide — introduces game mechanics step by step                 |
| **Tips & Events**          | Pop-up advisor — appears with speech bubbles during decisions  |
| **Portfolio Changes**      | Animated reactor — celebrates gains, empathizes with losses    |
| **Leaderboard**            | Commentator — highlights positions and rankings                |
| **Battle Mode**            | Hype commentator — spins, glows, sparkles for excitement       |
| **Empty / Loading States** | Idle companion — gentle bounce or sparkle to keep screen alive |

### Gildi Animation Guide

| Action                | Style / Effect                          | Duration  |
| --------------------- | --------------------------------------- | --------- |
| Idle                  | Gentle sparkle / float / subtle bounce  | Loop      |
| Success / Gain        | Jumping / glow / coin pile animation    | 300–500ms |
| Loss / Mistake        | Slight tilt / frown / shiver            | 300–400ms |
| Tip / Advice          | Pointing gesture / speech bubble appear | 200–400ms |
| Battle Mode Highlight | Spin / glow outline / sparkle burst     | 400–500ms |
| Achievement Unlocked  | Full spin + sparkle shower              | 500ms     |

### Design Rules for Gildi

- Always maintain the coin face, golden hue, and subtle facial expressions
- Consistent across all media: digital UI, print, workshop materials, event signage
- Animations: smooth and fast (300–500ms per action), no sudden or jarring movement
- Scale: small inline (24–32px) for tips, medium (48–64px) for reactions, large (128px+) for onboarding/hero

---

## Branding

| Property        | Value                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------- |
| **App Name**    | Trade Tales: The Investing Game                                                  |
| **Mascot**      | Gildi the Goldvreneli                                                                     |
| **Tagline**     | _Learn to invest. Play to understand._                                                    |
| **Tone**        | Friendly, approachable, encouraging, professionally credible                              |
| **Personality** | Trustworthy fintech meets playful educational game — warm gold, clean layouts, Gildi magic |
| **Visual Mood** | Premium financial credibility with gamified warmth — gold accents, Alpine calm, data joy   |

### Tone of Voice

- Friendly, approachable, and encouraging
- Non-judgmental and calm under "loss" situations
- Professional credibility — avoids slang or childish humor
- Example phrases:
  - "Markets go up and down. That's normal — let's see what you do."
  - "Diversification protects your portfolio over time."
  - "Well done! You stayed calm during a market drop."
  - "Gildi believes in your strategy. Keep going!"

---

## Color Palette

Colors are defined as CSS custom properties in `app/globals.css` using oklch.
Update them there — these docs describe the **intent** behind each token.

### Brand Colors (reference hex values)

| Element                  | Hex       | Role                                           |
| ------------------------ | --------- | ---------------------------------------------- |
| **Gold (primary)**       | `#FFD700` | Iconic coin color, warmth & trust, primary CTA |
| **Dark Gold / Bronze**   | `#C69C6D` | Shadows, depth, contrast on gold elements      |
| **Bright Yellow Accent** | `#FFEB3B` | Highlights, sparkles, UI cues, Gildi glow      |
| **Alpine Blue**          | `#B3E5FC` | Calm backgrounds, Swiss Alps inspiration       |
| **Neutral White**        | `#F5F5F5` | Light mode backgrounds, text areas             |
| **Text Dark Gray**       | `#333333` | Body text, readability, professional tone      |
| **Success Green**        | `#4CAF50` | Positive outcomes, profit, portfolio gains     |
| **Alert Red**            | `#F44336` | Losses, warnings, important alerts             |

### Theme Token Mapping

| Token                         | Role                            | Notes                                        |
| ----------------------------- | ------------------------------- | -------------------------------------------- |
| `--background`                | Page background                 | Near-white (light) / deep charcoal (dark)    |
| `--foreground`                | Primary text                    | Dark gray (light) / near-white (dark)        |
| `--primary`                   | Key actions, buttons, links     | Gold — the hero color                        |
| `--primary-foreground`        | Text on primary (gold) surfaces | Dark text for contrast on gold               |
| `--secondary`                 | Secondary actions, subtle fills | Alpine blue tint (light) / muted blue (dark) |
| `--secondary-foreground`      | Text on secondary surfaces      | Dark (light) / white (dark)                  |
| `--accent`                    | Hover states, highlights        | Bright yellow accent                         |
| `--accent-foreground`         | Text on accent surfaces         | Dark for readability                         |
| `--muted`                     | Disabled states, placeholders   | Light gray / dark muted                      |
| `--muted-foreground`          | Secondary text, captions        | Mid-tone gray                                |
| `--destructive`               | Errors, losses, delete actions  | Alert Red                                    |
| `--border`                    | Dividers, card outlines         | Subtle gold-tint / white-alpha               |
| `--card`                      | Card surfaces                   | White (light) / dark elevated (dark)         |
| `--ring`                      | Focus rings                     | Gold-tinted                                  |
| `--chart-1` to `--chart-5`    | Data visualization palette      | Gold to green to blue spectrum               |

### Semantic Colors

Custom semantic tokens defined in `globals.css`:

```css
--success:   /* Green — portfolio gains, positive outcomes   */
--warning:   /* Amber/gold — market volatility, caution      */
--info:      /* Alpine blue — informational, tips from Gildi */
--highlight: /* Bright yellow — sparkles, achievements       */
```

### Color Usage Rules

- **Golds** = mascot, primary branding, CTAs, key interactive elements
- **Alpine Blue / greens** = calm professional interface, backgrounds, secondary actions
- **Success Green** = profit, positive portfolio changes, good decisions
- **Alert Red** = losses, warnings, important alerts (use sparingly)
- **Bright Yellow** = sparkles, highlights, Gildi glow effects, achievement cues
- Backgrounds should remain near-neutral (white/charcoal) — gold and color accents pop against neutrals

> **To rebrand:** Change values in `globals.css` → `:root` / `.dark` blocks.
> All shadcn/ui components and Tailwind classes (`bg-primary`, `text-muted-foreground`, etc.)
> pick up new colors automatically. No find-and-replace needed.

---

## Typography

| Usage                | Font Style                                    | Notes                             |
| -------------------- | --------------------------------------------- | --------------------------------- |
| **Headlines**        | `Montserrat Bold` (700) via `var(--font-sans)` | Clean, modern, professional       |
| **Body**             | `Montserrat Regular` (400)                    | Legible for beginners             |
| **Tips / Pop-ups**   | Italic / Semi-bold (500i / 600)               | Friendly, guiding tone from Gildi |
| **Numbers / Charts** | Monospace Semi-bold (`font-mono 600`)          | Clear financial readability       |

| Property           | Value                                                    |
| ------------------ | -------------------------------------------------------- |
| **Font Family**    | `Montserrat` via `var(--font-sans)`                      |
| **Heading Weight** | `600` (semibold) – `700` (bold)                          |
| **Body Weight**    | `400` (regular)                                          |
| **Letter Spacing** | `tracking-tight` on headings, default on body            |
| **Line Height**    | Tailwind defaults (`leading-normal` / `leading-relaxed`) |
| **Heading Style**  | Short (max ~8 words), sentence case preferred            |

> Use monospace (`font-mono`) for portfolio values, currency amounts, percentages, and financial data.
> Tips from Gildi use semi-bold italic for a friendly, guiding feel.

---

## Iconography & Visual Language

- **Style:** Flat / soft shadows / minimalistic 3D touches
- **Icon set:** Lucide React (coins, charts, arrows, trending-up, piggy-bank, shield, target)
- **Mascot integration:** Small Gildi animations on graphs, cards, notifications, and event pop-ups
- **Charts:** Clear, colorful, line and bar charts with gentle entrance animations
- **Event Cards:** Small icon + short text snippet — avoid clutter
- **Sparkle effects:** Subtle particle/sparkle CSS or Framer Motion for achievements and Gildi highlights

---

## Design Principles

### 1. Professional Credibility

The interface must feel trustworthy and bank-aligned. Clean layouts, structured grids, and consistent spacing establish authority. Financial data is presented with precision. Users should feel they are using a serious tool, not a toy.

### 2. Playful Learning

Gamified cues make investing concepts approachable and emotionally engaging. Gildi's reactions, color-coded feedback, and achievement animations reward good decisions and soften losses. Learning happens through play, not lectures.

### 3. Clean & Minimal

Don't overload the player with information. Show essentials first, reveal complexity through interaction. Every element on screen must earn its place. Negative space is a feature, not waste.

### 4. Data-Forward

Portfolio values, charts, and market data are the stars. Use tables, metric cards, and graphs confidently. Let the data breathe with consistent padding. Financial numbers always use monospace for alignment and readability.

### 5. Feedback Everywhere

Always show a visual response to decisions:

- Charts animate to reflect portfolio changes
- Gildi reacts with appropriate emotion (celebrate gains, empathize with losses)
- Buttons show loading spinners during async operations
- Form fields show inline validation errors immediately
- Success/failure states confirmed with color shift + Gildi reaction
- Skeleton loaders for any data-dependent UI — never show blank screens

### 6. Quick Onboarding

Scan QR / 1–2 minute setup. Gildi guides the player through game mechanics with minimal friction. Keep forms short — split into steps if > 3 fields. Onboarding should feel guided, not gated.

### 7. Responsive & Mobile-First

Design for 375px first, then scale up intentionally for larger screens. The primary product experience should still work especially well on phones during workshops and events, but the interface is not mobile-only. Touch targets minimum 44px. Flows should work comfortably in short sessions, while desktop layouts should also feel clear and well-composed. Use `sm:` / `md:` / `lg:` breakpoints intentionally.

### 8. Accessible by Default

- All interactive elements reachable via keyboard
- Sufficient color contrast (WCAG AA minimum) — gold on white requires careful contrast checks
- Radix UI primitives handle ARIA roles, focus traps, and screen reader support
- Never rely on color alone to convey meaning — pair with icons or text labels
- `prefers-reduced-motion` respected in all Framer Motion animations

### 9. Both Themes Must Work

Dark mode and light mode are both fully supported. Light mode leans into the warm gold / alpine blue palette; dark mode uses deep charcoal backgrounds with gold accents that glow. Always use semantic tokens (`bg-card`, `text-muted-foreground`) — never hard-coded hex/oklch values in components.

---

## Component Conventions

### Layout

- **Page max-width:** `max-w-7xl mx-auto` for content areas
- **Dashboard / Game:** Sidebar (`app-sidebar`) + header + scrollable main area
- **Public pages:** Full-width sections, `PublicHeader` with transparent-to-solid scroll effect
- **Auth pages:** Centered card with Gildi greeting on a neutral background
- **Landing page:** Full-bleed hero with Gildi, scroll-triggered sections, generous vertical spacing

### Cards

```
rounded-xl border bg-card text-card-foreground shadow-sm
```

- Internal padding: `p-6`
- Group related info in cards (portfolio summary, market events, leaderboard entries)
- For data cards: include a subtle gold top accent border or left accent stripe
- Hover: `hover:border-primary/30 transition-colors duration-200`
- Event cards: small icon + short text, optional Gildi mini-reaction

### Buttons

- **Primary action:** `<Button>` (solid gold)
- **Secondary action:** `<Button variant="outline">`
- **Destructive:** `<Button variant="destructive">`
- **Ghost / icon:** `<Button variant="ghost" size="icon">`
- Only one primary button per visible section
- Loading state: `disabled` + animated spinner icon replacing the label text
- Gamified: primary buttons can have a subtle glow or sparkle on important actions

### Forms

- Use shadcn `<Input>`, `<Label>`, `<Select>`, etc.
- Inline error messages below the field in `text-destructive text-sm`
- Labels always visible (no placeholder-only fields)
- Group related fields, add section headings for long forms
- Multi-step forms: use Framer Motion for step transitions with Gildi progress indicator

### Empty States

Never show a blank area. Provide:

- Gildi in idle animation or a subtle Lucide icon (`text-muted-foreground`, 48px)
- A short encouraging explanation (1–2 sentences, Gildi's voice)
- A call-to-action button

### Loading States

- **Page-level:** Full skeleton matching the layout shape
- **Component-level:** `Skeleton` component from shadcn/ui
- **Buttons:** `disabled` + spinner icon while loading
- **Data tables:** Skeleton rows matching expected column count
- **Page transitions:** Framer Motion `AnimatePresence` with fade/slide
- **Idle Gildi:** Show Gildi with gentle sparkle/bounce while content loads

### Tables & Data Grids

- Use shadcn `<Table>` with sticky headers
- Monospace font for numeric columns (`font-mono tabular-nums`)
- Portfolio values highlighted with green (gain) or red (loss) — always paired with arrow icon
- Alternating row shading optional — prefer clean divider lines
- Sortable columns indicated by icon, not just hover

---

## Motion & Animation Patterns

### Framer Motion (rich interactions)

| Pattern                | Implementation                                                         |
| ---------------------- | ---------------------------------------------------------------------- |
| Page transition        | `AnimatePresence` + `motion.div` fade/slide (`y: 10` to `0`, 300ms)   |
| Hero text entrance     | Staggered `motion.span` per word, slide-up + fade-in, 50ms stagger    |
| Scroll reveal          | `whileInView={{ opacity: 1, y: 0 }}` with `viewport={{ once: true }}` |
| Card hover lift        | `whileHover={{ y: -4, transition: { duration: 0.2 } }}`               |
| List item entrance     | `motion.li` with stagger via parent `staggerChildren: 0.06`           |
| Step transition        | `AnimatePresence mode="wait"` with slide-left/slide-right             |
| Number counter         | `motion.span` with `useSpring` or `animate` from value to value       |
| Button press           | `whileTap={{ scale: 0.97 }}`                                          |
| Modal/dialog entrance  | Scale from 0.95 + fade, 200ms, spring easing                          |
| Gildi idle             | `motion.div` gentle y-bounce (2px) + opacity pulse, infinite loop     |
| Gildi celebrate        | `motion.div` scale 1 to 1.2 to 1 + rotate + sparkle particles, 400ms |
| Gildi loss empathy     | `motion.div` slight tilt (-5deg) + subtle shake, 300ms                |
| Portfolio value change | `motion.span` color transition + number counter animation             |
| Achievement sparkle    | `motion.div` particle burst from center, fade out, 500ms              |
| Background gold glow   | CSS animation or subtle SVG with `motion.path` draw                   |

### CSS Transitions (simple states)

| Pattern            | Implementation                                      |
| ------------------ | --------------------------------------------------- |
| Hover color change | `hover:text-primary transition-colors duration-150` |
| Focus ring         | Tailwind defaults via Radix                         |
| Sidebar expand     | `transition-[width] duration-200 ease-in-out`       |
| Skeleton shimmer   | shadcn `<Skeleton>` (built-in pulse)                |
| Tooltip appear     | Radix built-in (no custom needed)                   |
| Gold glow pulse    | `@keyframes` gold box-shadow pulse, 2s infinite     |

---

## Landing Page Direction

### Hero Section

- Full-viewport with warm gradient background (dark charcoal to subtle gold glow)
- Large Gildi illustration/animation front and center
- Bold headline: game name + tagline
- Single primary CTA ("Start Playing" / "Join a Game")
- Subtle sparkle particle effect or floating coin animation

### Content Sections

- Alternate between neutral and slightly tinted `bg-card` bands
- Each section: illustration/Gildi visual on one side, text on the other (alternating)
- Scroll-triggered entrance animations
- Feature highlights: diversification, market events, risk management explained visually

### Social Proof / Metrics

- Animated number counters (players, games completed, total virtual invested)
- Gildi celebratory animation alongside stats

### Navigation

- Transparent on hero, solid with gold accent on scroll
- Minimal links, prominent gold CTA button
- Gildi icon/logo in the nav

### Footer

- Clean, minimal, structured columns
- Gold accent line at top
- No clutter

### Overall Feel

- **Professional yet playful** — bank-grade credibility with Gildi's warmth
- Gold establishes trust and wealth association
- Alpine blue provides calm professionalism
- Gamified elements (sparkles, reactions, achievements) make finance feel fun
- Not "startup playful" or "childish" — approachable but serious about education

---

## Story-Driven UX Constraints

These rules come from `STORY.md` and must shape the interface, content, and interaction design.

- The medieval metaphor is a core product device, not decorative flavor. UI copy, icon choices, event framing, and empty states should preserve it consistently.
- Finance concepts should be introduced through gameplay first and jargon second. Prefer labels and explanations that teach gently before exposing real-world terminology.
- The product should feel understandable, story-driven, and slightly playful, but never intimidating or overly technical.
- Interactions should be short, clear, and touch-friendly so the game works in small mobile time windows.

---

## Graphic & Branding Consistency

- **Gildi consistency:** Always maintain coin face, golden hue, and subtle facial expressions across all contexts
- **Cross-media:** Digital UI, print materials, workshop handouts, leaderboard displays, event signage
- **Backgrounds:** Neutral (white/charcoal) or Alpine-inspired; keep focus on Gildi and data charts
- **Gold usage:** Primary brand color appears on CTAs, key metrics, Gildi, and accent elements — never as large background fills
- **Alpine Blue usage:** Secondary calming color for backgrounds, info states, and breathing room

---

## Do NOT

- Use arbitrary color values (`bg-[#1a1a2e]`) in components — always use tokens
- Add external UI libraries (Material UI, Chakra, Ant, Mantine) — shadcn/ui + Radix only
- Create components outside the Atomic Design structure (`ui/` → `molecules/` → `organisms/`)
- Skip dark mode testing — both themes must work
- Use `any` in TypeScript — type all props, state, and API responses
- Add placeholder text like "Lorem ipsum" — use realistic financial / game copy
- Over-animate — if an animation doesn't aid comprehension or delight, remove it
- Use rounded-full on cards or large containers — prefer `rounded-xl` or `rounded-2xl`
- Use saturated background colors for large areas — backgrounds should be near-neutral (gold is for accents)
- Nest Framer Motion `AnimatePresence` more than 2 levels deep
- Make Gildi childish or cartoonish — keep the mascot warm but professionally styled
- Use gold on gold — always ensure sufficient contrast between gold elements and their backgrounds
- Use slang or overly casual humor — the tone is friendly but credible
