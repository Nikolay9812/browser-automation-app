import { auth, currentUser } from "@clerk/nextjs/server"

import { liveblocks } from "@/lib/liveblock"

export async function POST() {
  const { userId, orgId } = await auth()
  if (!userId) {
    return new Response("Unauthorized", { status: 401 })
  }

  const user = await currentUser()
  if (!user) {
    return new Response("Unauthorized", { status: 401 })
  }

  const name =
    user.fullName ??
    user.username ??
    user.primaryEmailAddress?.emailAddress ??
    "Anonymous"

  // Rooms grant access to the org via `groupsAccesses: { [orgId]: [...] }`
  const { status, body } = await liveblocks.identifyUser(
    {
      userId,
      groupIds: orgId ? [orgId] : [],
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

  return new Response(body, { status })
}
