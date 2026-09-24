import { WorkflowShell } from "@/features/workflows/components/workflow-shell"

export default async function Page(props: PageProps<"/workflows/[id]">) {
  const { id } = await props.params

  return <WorkflowShell workflowId={id} />
}
