import { resend } from "@/lib/resend"

export async function sendEmail({
  to,
  subject,
  body,
}: {
  to: string
  subject: string
  body: string
}) {
  const { data, error } = await resend.emails.send({
    from: "onboarding@resend.dev",
    to,
    subject,
    text: body,
  })

  // Resend returns API errors instead of throwing — rethrow so the step fails.
  if (error) throw new Error(`Failed to send email: ${error.message}`)

  return { id: data.id }
}
