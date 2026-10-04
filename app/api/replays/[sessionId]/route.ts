import { auth } from "@clerk/nextjs/server"
import { APIError } from "@browserbasehq/sdk"

import { browserbase } from "@/lib/browserbase"

// Proxies a Browserbase session's replay as an HLS playlist, since fetching it
// needs the secret API key. The playlist's segment URLs are pre-signed, so the
// player loads those straight from Browserbase's CDN.
//
// Browserbase answers 404 until the recording has been processed, and that 404
// is passed through so the player can keep polling.
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/replays/[sessionId]">
) {
  const { orgId } = await auth()
  if (!orgId) return new Response("Unauthorized", { status: 401 })

  const { sessionId } = await ctx.params

  try {
    // Runs tag their session with the org that ran them. Anyone else's session
    // is reported as missing rather than forbidden, so ids can't be probed.
    const session = await browserbase.sessions.retrieve(sessionId)
    if (session.userMetadata?.orgId !== orgId) {
      return new Response("Not found", { status: 404 })
    }

    // A run drives a single tab, so its recording is the first page.
    const { pages } = await browserbase.sessions.replays.retrieve(sessionId)
    const [page] = pages
    if (!page) return new Response("Replay not ready", { status: 404 })

    const playlist = await browserbase.sessions.replays.retrievePage(
      sessionId,
      page.pageId
    )
    return new Response(await playlist.text(), {
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        // The segment URLs are pre-signed and expire, so never reuse a copy.
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    // Not processed yet (or gone), and rate-limited: both worth retrying.
    if (
      error instanceof APIError &&
      (error.status === 404 || error.status === 429)
    ) {
      return new Response(error.message, { status: error.status })
    }
    throw error
  }
}
