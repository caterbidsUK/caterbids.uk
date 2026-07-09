const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://caterbids.uk"

const PERKS = [
  "Up to 30 live listings at a time",
  "1 free featured listing slot",
  "Founding Member badge on your profile",
  "Enhanced seller profile",
  "Early access to new features",
]

export function foundingMemberWelcome({ name }: { name?: string | null }) {
  const greeting = name ? `Hi ${name},` : "Hi,"

  const subject = "Welcome to CaterBids — you're a Founding Trade Member"

  const text = [
    greeting,
    "",
    "Welcome to CaterBids! You're officially one of the first 100 Founding Trade Members.",
    "",
    "Your membership is now active. Here's what you have:",
    "",
    ...PERKS.map((p) => `  • ${p}`),
    "",
    "Go to your account to get started:",
    `${SITE_URL}/account`,
    "",
    "Or create your first listing:",
    `${SITE_URL}/post-listing`,
    "",
    "Thank you for being part of the founding team.",
    "",
    "— The CaterBidsUK Team",
  ].join("\n")

  const perkRows = PERKS.map(
    (perk) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:12px;">
      <tr>
        <td width="28" valign="top" style="padding-right:10px;">
          <span style="display:inline-block;width:20px;height:20px;background:rgba(255,107,0,0.18);border-radius:50%;text-align:center;line-height:20px;font-size:11px;color:#FF6B00;font-weight:900;">&#10003;</span>
        </td>
        <td style="font-size:14px;font-weight:700;color:#ffffff;line-height:1.4;">${perk}</td>
      </tr>
    </table>`,
  ).join("")

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" style="padding:32px 16px;">

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;border-radius:16px;overflow:hidden;">

        <!-- Logo bar -->
        <tr>
          <td style="background:#001225;padding:18px 32px;text-align:center;border-bottom:1px solid rgba(255,107,0,0.28);">
            <span style="font-size:20px;font-weight:900;color:#FF6B00;letter-spacing:-0.3px;">CaterBidsUK</span>
          </td>
        </tr>

        <!-- Hero -->
        <tr>
          <td style="background:#002E5D;padding:44px 32px 28px;text-align:center;">
            <div style="margin-bottom:18px;">
              <span style="display:inline-block;background:#001a3a;border:1px solid rgba(255,107,0,0.4);border-radius:999px;padding:8px 18px;font-size:11px;font-weight:900;color:#FF6B00;text-transform:uppercase;letter-spacing:0.18em;">&#9733; Founding Member</span>
            </div>
            <h1 style="margin:0 0 12px;font-size:28px;font-weight:900;color:#ffffff;line-height:1.25;">Welcome to the<br>founding team</h1>
            <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.65);line-height:1.55;">You're officially one of the first 100 Founding Trade Members of CaterBidsUK.</p>
          </td>
        </tr>

        <!-- Perks box -->
        <tr>
          <td style="background:#002E5D;padding:0 32px 28px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(0,0,0,0.22);border-radius:10px;">
              <tr>
                <td style="padding:22px 24px;">
                  <p style="margin:0 0 16px;font-size:10px;font-weight:900;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.2em;">Your Founding Member perks</p>
                  ${perkRows}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="background:#002E5D;padding:0 32px 44px;text-align:center;">
            <a href="${SITE_URL}/account" style="display:inline-block;background:#FF6B00;color:#ffffff;font-size:15px;font-weight:900;padding:15px 36px;border-radius:10px;text-decoration:none;letter-spacing:0.01em;">Go to my account</a>
            <p style="margin:14px 0 0;font-size:13px;color:rgba(255,255,255,0.45);">
              Or <a href="${SITE_URL}/post-listing" style="color:#FF6B00;text-decoration:none;font-weight:700;">create your first listing</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#001225;padding:18px 32px;text-align:center;border-top:1px solid rgba(255,255,255,0.07);">
            <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.3);line-height:1.6;">
              CaterBidsUK &bull; The UK marketplace for catering equipment<br>
              <a href="${SITE_URL}" style="color:rgba(255,107,0,0.55);text-decoration:none;">caterbids.uk</a>
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>

</body>
</html>`

  return { subject, text, html }
}
