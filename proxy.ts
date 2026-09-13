import { clerkMiddleware } from "@clerk/nextjs/server"

const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/__clerk"]

export default clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl

  if (!PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
}