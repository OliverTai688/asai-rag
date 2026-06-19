type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export function isTransactionalEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendTransactionalEmail(input: SendEmailInput) {
  if (!isTransactionalEmailConfigured()) {
    return {
      sent: false,
      provider: "resend",
      reason: "EMAIL_PROVIDER_NOT_CONFIGURED",
    } as const;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
  });

  if (!response.ok) {
    return {
      sent: false,
      provider: "resend",
      reason: "EMAIL_PROVIDER_REJECTED",
      status: response.status,
    } as const;
  }

  const body = (await response.json().catch(() => null)) as { id?: string } | null;

  return {
    sent: true,
    provider: "resend",
    messageId: body?.id ?? null,
  } as const;
}
