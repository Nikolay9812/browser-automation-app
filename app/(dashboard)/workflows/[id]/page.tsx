export default async function Page(props: PageProps<"/workflows/[id]">) {
  const { id } = await props.params

  return (
    <div className="p-6">
      <h1 className="font-heading text-lg font-medium tracking-tight">
        Workflow {id}
      </h1>
    </div>
  )
}
