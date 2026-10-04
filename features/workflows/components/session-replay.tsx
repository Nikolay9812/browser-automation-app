"use client"

import { useEffect, useRef, useState } from "react"
import Hls from "hls.js"

import { Spinner } from "@/components/ui/spinner"

// How often to ask whether the recording is ready, and when to give up.
const POLL_INTERVAL_MS = 3_000
const POLL_TIMEOUT_MS = 5 * 60_000

type ReplayStatus = "waiting" | "ready" | "failed"

// Resolves after `ms`, or rejects as soon as `signal` aborts.
function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener("abort", () => {
      clearTimeout(timer)
      reject(signal.reason)
    })
  })
}

// Plays back a Browserbase session's recording. The recording lags the session
// closing, so the replay route answers 404 (or 429 when rate-limited) for a
// while; this polls it until the playlist is served, then hands it to hls.js.
export function SessionReplay({ sessionId }: { sessionId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  // Keyed by session, so switching sessions starts from "waiting" again
  // without resetting state inside the effect.
  const [result, setResult] = useState<{
    sessionId: string
    status: ReplayStatus
  } | null>(null)
  const status = result?.sessionId === sessionId ? result.status : "waiting"

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const src = `/api/replays/${encodeURIComponent(sessionId)}`
    const controller = new AbortController()
    const { signal } = controller
    const settle = (status: ReplayStatus) => {
      if (!signal.aborted) setResult({ sessionId, status })
    }
    let hls: Hls | undefined

    const waitForPlaylist = async () => {
      const deadline = Date.now() + POLL_TIMEOUT_MS
      while (Date.now() < deadline) {
        const response = await fetch(src, { signal, cache: "no-store" })
        if (response.ok) return true
        if (response.status !== 404 && response.status !== 429) return false
        await sleep(POLL_INTERVAL_MS, signal)
      }
      return false
    }

    const play = () => {
      if (Hls.isSupported()) {
        hls = new Hls()
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) settle("failed")
        })
        hls.loadSource(src)
        hls.attachMedia(video)
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari plays HLS natively.
        video.src = src
      } else {
        settle("failed")
        return
      }
      settle("ready")
    }

    waitForPlaylist()
      .then((ready) => (ready ? play() : settle("failed")))
      .catch(() => settle("failed"))

    return () => {
      controller.abort()
      hls?.destroy()
      video.removeAttribute("src")
      video.load()
    }
  }, [sessionId])

  return (
    <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-md bg-black">
      <video
        ref={videoRef}
        controls
        muted
        playsInline
        className={status === "ready" ? "size-full" : "hidden"}
      />
      {status === "waiting" && (
        <div className="flex items-center gap-2 text-sm text-white/70">
          <Spinner />
          Preparing the recording&hellip;
        </div>
      )}
      {status === "failed" && (
        <p className="text-sm text-white/70">
          This session&apos;s recording isn&apos;t available.
        </p>
      )}
    </div>
  )
}
