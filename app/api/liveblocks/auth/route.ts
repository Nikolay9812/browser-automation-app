import { auth, currentUser } from "@clerk/nextjs/server"
import * as Sentry from "@sentry/nextjs"

import { liveblocks } from "@/lib/liveblocks"

export async function POST() {
  const { userId, orgId } = await auth()

  if (!userId || !orgId) {
    return new Response("Unauthorized", { status: 401 })
  }

  const user = await currentUser()

  if (!user) {
    return new Response("Unauthorized", { status: 401 })
  }

  // Identify the user with an ID token. Permissions are resolved per-room
  // from the user's groups — scope access to their Clerk organization.
  const { status, body } = await liveblocks.identifyUser(
    {
      userId,
      groupIds: [orgId],
      organizationId: orgId,
    },
    {
      userInfo: {
        name:
          user.fullName ??
          user.username ??
          user.primaryEmailAddress?.emailAddress ??
          "Anonymous",
        avatar: user.imageUrl,
      },
    }
  )

  // A failure here leaves the canvas unable to connect to its room.
  if (status >= 400) {
    Sentry.logger.error("Liveblocks identifyUser failed", {
      "http.response.status_code": status,
      "org.id": orgId,
      "user.id": userId,
    })
  }

  return new Response(body, { status })
}
