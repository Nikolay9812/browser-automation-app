import { useCallback } from "react"
import { useAuth } from "@clerk/nextjs"
import { usePathname, useRouter } from "next/navigation"

export const PRICING_PATH = "/pricing"

// Whether the active org is subscribed to the Pro plan, plus a way to send the
// user to the pricing page to upgrade. Wait for `isLoaded` before showing an
// upgrade prompt, or Pro orgs see it flash while Clerk loads.
//
// Client-side only — it's for UI. Anything that must actually be locked behind
// Pro has to check `has({ plan: "org:pro" })` from `auth()` on the server too.
export function useProPlan() {
  const { isLoaded, orgId, has } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // The `org:` scope matches only an org subscription, never a personal one.
  const isPro = isLoaded && !!orgId && has({ plan: "org:pro" })

  // Carries the current page along so checkout can return the user to it.
  const upgradeHref = `${PRICING_PATH}?returnTo=${encodeURIComponent(pathname)}`
  const upgrade = useCallback(
    () => router.push(upgradeHref),
    [router, upgradeHref]
  )

  return { isLoaded, isPro, upgradeHref, upgrade }
}
