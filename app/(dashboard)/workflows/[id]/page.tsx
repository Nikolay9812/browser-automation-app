import { WorkflowShell } from "@/feature/workflows/components/workflow-shell"

export default async function Page(props: PageProps<"/workflows/[id]">) {
  const { id } = await props.params

  return <WorkflowShell workflowId={id} />
}
