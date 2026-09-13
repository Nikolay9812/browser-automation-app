import { OrganizationSwitcher } from "@clerk/nextjs"

export default function ChooseOrganizationPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <OrganizationSwitcher
        hidePersonal
        afterCreateOrganizationUrl="/"
        afterSelectOrganizationUrl="/"
      />
    </div>
  )
}