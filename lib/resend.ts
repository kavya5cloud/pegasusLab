import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM ?? "Pegasus Lab <onboarding@resend.dev>";
const INBOX = process.env.RESEND_INBOX ?? "kavyax888@gmail.com";

// ─── Welcome email ────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string) {
  const first = name.split(" ")[0];
  return resend.emails.send({
    from: FROM,
    to,
    subject: "Welcome to Pegasus Lab ✦",
    html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f3;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <div style="max-width:540px;margin:40px auto;background:#fff;border-radius:20px;overflow:hidden;border:1px solid #e5e5e3;">
    <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);padding:40px 40px 32px;text-align:center;">
      <img src="https://pegasuslab.ai/pegasuslogo.png" alt="pegasus lab." width="120" style="height:auto;filter:brightness(0) invert(1);opacity:0.9;" />
    </div>
    <div style="padding:36px 40px;">
      <h1 style="margin:0 0 12px;font-size:26px;font-weight:600;color:#0a0a0a;">Hey ${first} 👋</h1>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#4a4a4a;">
        Welcome to <strong>Pegasus Lab</strong> — the intelligence layer between your ideas and working software.
      </p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#4a4a4a;">
        Here's what you can do right now:
      </p>
      <ul style="margin:0 0 24px;padding-left:20px;font-size:14px;line-height:1.8;color:#4a4a4a;">
        <li>Drop an idea, repo, or Figma link on your whiteboard</li>
        <li>Generate a living Product Blueprint in seconds</li>
        <li>Let Pegasus find the gaps — and write the code to close them</li>
        <li>Preview each fix live in your browser, no deploy needed</li>
      </ul>
      <div style="text-align:center;margin:32px 0;">
        <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? "https://pegasuslab.ai"}/projects"
           style="display:inline-block;background:#0a0a0a;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:100px;">
          Open my workspace →
        </a>
      </div>
      <p style="margin:0;font-size:13px;color:#8a8a8a;line-height:1.6;">
        You're on the free plan — 2 new projects per week, unlimited blueprints and chat.
        Add your <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? "https://pegasuslab.ai"}/settings?setup=1" style="color:#0a0a0a;">Gemini API key</a> to activate the AI engine for free.
      </p>
    </div>
    <div style="border-top:1px solid #e5e5e3;padding:20px 40px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#a0a0a0;">
        pegasus lab. · the intelligence layer between ideas and software
      </p>
    </div>
  </div>
</body>
</html>`,
  });
}

// ─── Contact / sales inquiry ──────────────────────────────────────────────────

export async function sendContactEmail(opts: {
  name: string;
  email: string;
  company?: string;
  teamSize?: string;
  message?: string;
}) {
  // Notify the inbox
  await resend.emails.send({
    from: FROM,
    to: INBOX,
    replyTo: opts.email,
    subject: `New contact: ${opts.name}${opts.company ? ` · ${opts.company}` : ""}`,
    html: `
<div style="font-family:monospace;font-size:14px;line-height:1.7;white-space:pre-wrap;padding:24px;">
<strong>Name:</strong>    ${opts.name}
<strong>Email:</strong>   ${opts.email}
<strong>Company:</strong> ${opts.company || "—"}
<strong>Team:</strong>    ${opts.teamSize || "—"}

<strong>Message:</strong>
${opts.message || "(no message)"}
</div>`,
  });

  // Auto-reply to the sender
  return resend.emails.send({
    from: FROM,
    to: opts.email,
    subject: "We got your message — Pegasus Lab",
    html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f3;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <div style="max-width:540px;margin:40px auto;background:#fff;border-radius:20px;overflow:hidden;border:1px solid #e5e5e3;">
    <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);padding:40px;text-align:center;">
      <img src="https://pegasuslab.ai/pegasuslogo.png" alt="pegasus lab." width="120" style="height:auto;filter:brightness(0) invert(1);opacity:0.9;" />
    </div>
    <div style="padding:36px 40px;">
      <h1 style="margin:0 0 12px;font-size:24px;font-weight:600;color:#0a0a0a;">Thanks, ${opts.name.split(" ")[0]}.</h1>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#4a4a4a;">
        Your message landed safely. We'll get back to you at <strong>${opts.email}</strong> — usually within one business day.
      </p>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#4a4a4a;">
        While you wait, you can <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? "https://pegasuslab.ai"}/projects" style="color:#0a0a0a;font-weight:600;">start building for free</a> — no credit card, just drop your idea.
      </p>
    </div>
    <div style="border-top:1px solid #e5e5e3;padding:20px 40px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#a0a0a0;">pegasus lab. · the intelligence layer between ideas and software</p>
    </div>
  </div>
</body>
</html>`,
  });
}
