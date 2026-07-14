import 'server-only'
import type { ContactPageFormValues } from '@/lib/contact/schemas'

/**
 * Notifies the admin team of a new contact form submission.
 *
 * The project does not yet have an email provider wired up (no Resend /
 * SendGrid / SMTP credentials in the environment). When one is added, plug
 * it in here — the call site (`app/api/contact/route.ts`) already awaits
 * this function and treats a thrown error as non-fatal (the submission is
 * still persisted to `contact_messages`).
 *
 * Until then this is a documented no-op: the submission itself is the
 * durable record (stored server-side in `contact_messages`), which is what
 * "logs server-side" means here — we intentionally avoid `console.log`
 * per project hygiene rules.
 */
export async function notifyAdminOfContactMessage(
  message: Pick<ContactPageFormValues, 'name' | 'email' | 'subject'> & { id: string }
): Promise<void> {
  const webhookUrl = process.env.CONTACT_NOTIFY_WEBHOOK_URL
  if (!webhookUrl) {
    // No email/notification provider configured — the DB row is the record.
    return
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `New contact message (${message.subject}) from ${message.name} <${message.email}> — id ${message.id}`,
      }),
      // Don't let a slow/unreachable webhook hang the request.
      signal: AbortSignal.timeout(5000),
    })
  } catch {
    // Best-effort notification — never fail the contact submission because
    // the notification channel is down.
  }
}
