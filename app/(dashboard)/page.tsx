import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Button } from "@/components/ui/button"
import { Plus, Workflow } from "lucide-react"

export default function Page() {
  return (
    <div className="flex flex-1">
      <Empty className="gap-10 rounded-none border-0 px-6 py-16">
        <EmptyHeader className="max-w-3xl gap-9">
          <EmptyMedia className="mb-2 size-24 rounded-[18px] bg-muted text-foreground">
            <Workflow className="size-10 stroke-[2.5]" aria-hidden="true" />
          </EmptyMedia>
          <div className="flex flex-col items-center gap-7">
            <EmptyTitle className="text-4xl font-medium leading-none tracking-normal">
              No workflow selected
            </EmptyTitle>
            <EmptyDescription className="max-w-3xl text-[2.5rem] leading-[1.7] text-muted-foreground">
              Select a workflow from the sidebar
              <br />
              or create a new one to get started.
            </EmptyDescription>
          </div>
        </EmptyHeader>
        <EmptyContent className="max-w-none">
          <Button className="h-[90px] gap-6 rounded-xl px-10 text-[2.5rem] font-medium tracking-normal">
            <Plus className="size-10 stroke-[2.25]" aria-hidden="true" />
            New workflow
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  )
}
