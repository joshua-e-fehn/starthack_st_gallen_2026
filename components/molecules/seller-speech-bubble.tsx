import Image from "next/image"

import { cn } from "@/lib/utils"

const SELLER_CONTENT = {
  fish: {
    name: "Fish seller",
    description:
      "Fish can bring great profit, but they spoil quickly and the catch is never certain. Some years are rich, others leave you with nothing.",
    imageSrc: "/characters/fish_seller.webp",
    imageAlt: "A cheerful fish seller holding a large fish",
    bubbleClassName:
      "border-sky-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(227,242,253,0.94)_100%)]",
    accentClassName: "bg-sky-500/12 text-sky-900 ring-sky-300/70",
  },
  wood: {
    name: "Wood seller",
    description:
      "Wood is a reliable good. It rarely brings big surprises, but it keeps its value well and helps you grow steadily over the years.",
    imageSrc: "/characters/wood_seller.webp",
    imageAlt: "A smiling wood seller holding an axe",
    bubbleClassName:
      "border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.98)_0%,rgba(255,243,224,0.94)_100%)]",
    accentClassName: "bg-amber-500/12 text-amber-950 ring-amber-300/70",
  },
  potato: {
    name: "Potato seller",
    description:
      "Potatoes are a steady trade. Prices may rise and fall with the seasons, but people will always need them, so over time they tend to grow your wealth.",
    imageSrc: "/characters/potato_seller.webp",
    imageAlt: "A happy potato seller carrying a sack of potatoes",
    bubbleClassName:
      "border-emerald-200/80 bg-[linear-gradient(180deg,rgba(248,255,250,0.98)_0%,rgba(232,245,233,0.94)_100%)]",
    accentClassName: "bg-emerald-500/12 text-emerald-950 ring-emerald-300/70",
  },
} as const

export type SellerSpeechBubbleSeller = keyof typeof SELLER_CONTENT

type SellerSpeechBubbleProps = {
  seller: SellerSpeechBubbleSeller
  className?: string
  textClassName?: string
  priority?: boolean
}

export function SellerSpeechBubble({
  seller,
  className,
  textClassName,
  priority = false,
}: SellerSpeechBubbleProps) {
  const content = SELLER_CONTENT[seller]

  return (
    <section
      className={cn(
        "flex w-full max-w-3xl flex-col items-center gap-4 md:flex-row md:items-end md:gap-6",
        className,
      )}
    >
      <div className="relative shrink-0">
        <div className="absolute inset-x-6 bottom-4 h-6 rounded-full bg-black/10 blur-xl" />
        <Image
          src={content.imageSrc}
          alt={content.imageAlt}
          width={220}
          height={320}
          priority={priority}
          className="relative h-auto w-[148px] drop-shadow-[0_18px_28px_rgba(72,38,10,0.22)] sm:w-[176px] md:w-[220px]"
        />
      </div>

      <div
        className={cn(
          "relative w-full rounded-[28px] border px-5 py-4 text-card-foreground shadow-[0_18px_50px_rgba(166,108,0,0.14)] backdrop-blur-sm sm:px-6 sm:py-5",
          content.bubbleClassName,
        )}
      >
        <div
          aria-hidden="true"
          className={cn(
            "absolute -top-2 left-10 size-4 rotate-45 rounded-[4px] border-l border-t md:bottom-8 md:left-[-9px] md:top-auto md:rotate-[225deg]",
            content.bubbleClassName,
          )}
        />

        <div
          className={cn(
            "mb-3 inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ring-1",
            content.accentClassName,
          )}
        >
          {content.name}
        </div>

        <p
          className={cn(
            "text-pretty text-sm leading-relaxed font-medium italic text-foreground/90 sm:text-base",
            textClassName,
          )}
        >
          {content.description}
        </p>
      </div>
    </section>
  )
}

export { SELLER_CONTENT }
