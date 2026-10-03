import type { Stagehand } from "@browserbasehq/stagehand"

export async function agent({
  stagehand,
  instruction,
}: {
  stagehand: Stagehand
  instruction: string
}) {
  const [page] = stagehand.context.pages()
  const { success, message, completed } = await stagehand
    .agent()
    .execute({ instruction, page, maxSteps: 20 })

  return { success, message, completed }
}
