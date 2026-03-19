"use client"

import { Volume2Icon, VolumeXIcon } from "lucide-react"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"

export function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)

  useEffect(() => {
    // Attempt autoplay when the component mounts
    if (audioRef.current) {
      audioRef.current.volume = 0.3 // Set a comfortable volume
      const playPromise = audioRef.current.play()
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true)
            setIsMuted(false)
          })
          .catch(() => {
            // Autoplay was prevented; we'll keep it muted and wait for user interaction
            setIsPlaying(false)
            setIsMuted(true)
          })
      }
    }
  }, [])

  const toggleMute = () => {
    if (audioRef.current) {
      const nextMuted = !isMuted
      audioRef.current.muted = nextMuted
      setIsMuted(nextMuted)
      if (!isPlaying) {
        audioRef.current.play().then(() => setIsPlaying(true))
      }
    }
  }

  const pathname = usePathname()
  const isGameRoute = pathname?.includes("/dashboard/game")

  const prevRouteRef = useRef(isGameRoute)

  useEffect(() => {
    if (prevRouteRef.current !== isGameRoute) {
      prevRouteRef.current = isGameRoute

      // When the route changes, React updates the <audio src> automatically.
      // We explicitly call .load() to ensure the browser fetches the new track directly.
      if (audioRef.current) {
        audioRef.current.load()
        if (isPlaying && !isMuted) {
          audioRef.current.play().catch(() => setIsPlaying(false))
        }
      }
    }
  }, [isGameRoute, isPlaying, isMuted])

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <audio
        ref={audioRef}
        src={isGameRoute ? "/audio/game-music.mp3" : "/audio/background-music.mp3"}
        loop
        muted={isMuted}
        autoPlay={!isMuted}
      />
      <Button
        variant="outline"
        size="icon"
        onClick={toggleMute}
        className="size-10 rounded-full border-primary/20 bg-background/80 shadow-lg backdrop-blur hover:bg-primary/10"
        aria-label={isMuted ? "Unmute background music" : "Mute background music"}
      >
        {isMuted ? (
          <VolumeXIcon className="size-5 text-muted-foreground" />
        ) : (
          <Volume2Icon className="size-5 text-primary animate-pulse" />
        )}
      </Button>
    </div>
  )
}
