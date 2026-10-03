import type { Stagehand } from "@browserbasehq/stagehand"

export async function extract({
  stagehand,
  instruction,
}: {
  stagehand: Stagehand
  instruction: string
}) {
  const [page] = stagehand.context.pages()
  const { extraction } = await stagehand.extract(instruction, { page })

  return { extraction, url: page.url() }
}
