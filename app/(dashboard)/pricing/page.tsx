import { PricingTable } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

// Only same-origin paths — never send someone off-site after checkout.
function safeReturnTo(value: string | string[] | undefined) {
  if (typeof value !== "string") return "/"
  // Browsers read "/\" like "//", a protocol-relative URL to another host.
  return /^\/(?![/\\])/.test(value) ? value : "/"
}

export default async function Page(props: PageProps<"/pricing">) {
  const { orgId } = await auth()
  if (!orgId) redirect("/choose-organization")

  // useProPlan's upgrade() passes the page the user came from, so checkout's
  // "Continue" button takes them straight back to what they were unlocking.
  const { returnTo } = await props.searchParams

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Plans</h1>
        <p className="text-muted-foreground">
          Pick the plan that fits your organization. You can change or cancel it
          anytime.
        </p>
      </div>
      <PricingTable
        for="organization"
        highlightedPlan="pro"
        newSubscriptionRedirectUrl={safeReturnTo(returnTo)}
      />
    </main>
  )
}
