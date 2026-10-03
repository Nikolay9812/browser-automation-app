import type { Stagehand } from "@browserbasehq/stagehand"

export async function observe({
  stagehand,
  instruction,
}: {
  stagehand: Stagehand
  instruction: string
}) {
  const [page] = stagehand.context.pages()
  const actions = await stagehand.observe(instruction, { page })

  const matches = actions.map(({ selector, description }) => ({
    selector,
    description,
  }))

  return { matches, count: matches.length, url: page.url() }
}
