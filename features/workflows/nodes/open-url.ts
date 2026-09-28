import type { Stagehand } from "@browserbasehq/stagehand"

export async function openUrl({
  stagehand,
  url,
}: {
  stagehand: Stagehand
  url: string
}) {
  const [page] = await stagehand.browser.context.pages()
  await page.goto(url, { waitUntil: "load", timeout: 30_000 })

  return { url: await page.url(), title: await page.title() }
}
