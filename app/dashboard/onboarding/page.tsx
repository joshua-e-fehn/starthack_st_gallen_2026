"use client"

import { useRouter } from "next/navigation"

import { StoryPlayer } from "@/components/organisms/story-player"
import type { StorySlide } from "@/lib/types/onboarding"

const onboardingStorySlides: StorySlide[] = [
  {
    id: "farmer",
    shortName: "Farmer",
    title: "You are a farmer and work on a farm",
    body: "You rise with the sun, tending your fields and animals at the king's court. Life is simple, but every harvest reminds you: hard work alone won't build the future you dream of.",
    imageSrc: "/onboarding/story1.webp",
  },
  {
    id: "merchant",
    shortName: "Merchant",
    title: "You want to diversify and become a merchant",
    body: "You begin to wonder, what if your gold could work as hard as you do? As whispers of trade and distant markets reach your ears, you decide to become more than a farmer: a merchant in the making.",
    imageSrc: "/onboarding/story2.webp",
  },
  {
    id: "first-gold",
    shortName: "First Gold",
    title: "The village elder gives you your first bag of gold",
    body: "Seeing your ambition, the village elder entrusts you with a small bag of gold. Use it wisely, he says. Fortunes are not only grown in fields, but in choices.",
    imageSrc: "/onboarding/story3.webp",
  },
  {
    id: "yearly-income",
    shortName: "Yearly Income",
    title: "You receive income every year",
    body: "Each year, your farm provides steady income. It's your foundation, reliable but limited. How you use it will decide whether you stay a farmer, or rise beyond.",
    imageSrc: "/onboarding/story4.webp",
  },
  {
    id: "build-future",
    shortName: "Build Future",
    title: "Trade, grow, and build your future",
    body: "Buy, sell, and adapt as seasons change and fortunes rise and fall. Some choices will reward you, others will test you. Stay patient, think long-term, and one day you may own your dream farm worked not by your hands alone, but by those you employ.",
    imageSrc: "/onboarding/story5.webp",
  },
]

export default function OnboardingPage() {
  const router = useRouter()

  return (
    <main className="relative min-h-screen overflow-hidden bg-linear-to-b from-slate-950 via-slate-900 to-zinc-950 p-4 text-foreground sm:p-8">
      <StoryPlayer
        slides={onboardingStorySlides}
        autoAdvanceMs={7000}
        previousAtStartLabel="Back"
        completeLabel="Start Main Game"
        onPreviousAtStart={() => router.push("/dashboard")}
        onComplete={() => router.push("/dashboard")}
      />
    </main>
  )
}
