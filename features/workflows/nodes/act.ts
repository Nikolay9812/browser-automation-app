import type { Stagehand } from "@browserbasehq/stagehand"

export async function act({
  stagehand,
  instruction,
}: {
  stagehand: Stagehand
  instruction: string
}) {
  const [page] = stagehand.context.pages()
  const { success, message } = await stagehand.act(instruction, { page })

  return { success, message, url: page.url() }
}
