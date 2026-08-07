import { Resend } from "resend";

let _resend: Resend | null = null;
function resend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM = process.env.RESEND_FROM_EMAIL ?? "Harbor · Mariners Church <noreply@inov8-socal.tech>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://harbor-teal.vercel.app";

const IMPERIAL = "#124061";
const CERULEAN = "#2E6EB7";

function shell(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <style>
    body { margin:0; padding:0; -webkit-text-size-adjust:100%; }
    @media only screen and (max-width: 600px) {
      .outer { padding: 12px 8px !important; }
      .card { border-radius: 10px !important; }
      .header, .content, .footer { padding-left: 18px !important; padding-right: 18px !important; }
      .content { padding-top: 22px !important; padding-bottom: 22px !important; }
      .cta { display: block !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#F7F9FB;">
  <div class="outer" style="font-family:Helvetica,Arial,sans-serif;background:#F7F9FB;padding:32px 16px;">
    <div class="card" style="width:100%;max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e9ef;">
      <div class="header" style="background:${IMPERIAL};padding:20px 28px;">
        <table style="border-collapse:collapse;"><tr>
          <td style="padding-right:12px;vertical-align:middle;">
            <img src="${APP_URL}/mariners-m-header.png" width="36" height="36" alt="Mariners Church" style="display:block;border:0;" />
          </td>
          <td style="vertical-align:middle;">
            <p style="margin:0;color:#fff;font-size:18px;font-weight:bold;">Harbor</p>
            <p style="margin:2px 0 0;color:rgba(255,255,255,.75);font-size:11px;letter-spacing:2px;text-transform:uppercase;">Mariners Church</p>
          </td>
        </tr></table>
      </div>
      <div style="height:3px;background:${CERULEAN};"></div>
      <div class="content" style="padding:28px;">
        <h1 style="margin:0 0 16px;font-size:18px;line-height:1.35;color:${IMPERIAL};">${title}</h1>
        ${body}
      </div>
      <div class="footer" style="padding:16px 28px;border-top:1px solid #eef1f5;">
        <p style="margin:0;font-size:11px;line-height:1.5;color:#9aa5b1;">Harbor · Space requests &amp; event scheduling · Mariners Church</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function row(label: string, value: string) {
  return `<tr>
    <td style="padding:6px 12px 6px 0;font-size:12px;color:#7a8694;text-transform:uppercase;letter-spacing:1px;vertical-align:top;">${label}</td>
    <td style="padding:6px 0;font-size:14px;line-height:1.5;color:#1E1C1D;">${value}</td>
  </tr>`;
}

export interface DecisionEmailArgs {
  to: string;
  requesterName: string | null;
  decision: "approved" | "denied";
  eventTitle: string;
  eventId: string;
  spaceName: string;
  buildingName: string | null;
  campusName: string | null;
  scopeLabel: string;
  whenLabel: string;
  denialReason?: string | null;
}

export async function sendDecisionEmail(a: DecisionEmailArgs) {
  const approved = a.decision === "approved";
  const subject = approved
    ? `Approved: ${a.spaceName} for "${a.eventTitle}"`
    : `Denied: ${a.spaceName} for "${a.eventTitle}"`;

  const statusBanner = approved
    ? `<div style="background:#A6CE3A22;border:1px solid #A6CE3A66;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
         <p style="margin:0;font-size:14px;font-weight:bold;color:#5a7a10;">✓ Your space request was approved</p>
       </div>`
    : `<div style="background:#F3776822;border:1px solid #F3776866;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
         <p style="margin:0;font-size:14px;font-weight:bold;color:#c0392b;">Your space request was denied</p>
         ${a.denialReason ? `<p style="margin:6px 0 0;font-size:13px;color:#c0392b;">Reason: ${a.denialReason}</p>` : ""}
       </div>`;

  const body = `
    <p style="margin:0 0 16px;font-size:14px;color:#444;">Hi ${a.requesterName?.split(" ")[0] ?? "there"},</p>
    ${statusBanner}
    <table style="border-collapse:collapse;width:100%;margin-bottom:20px;">
      ${row("Event", a.eventTitle)}
      ${row("Space", `${a.spaceName}${a.buildingName ? ` — ${a.buildingName}` : ""}${a.campusName ? `, ${a.campusName}` : ""}`)}
      ${row("When", a.whenLabel)}
      ${row("Applies to", a.scopeLabel)}
    </table>
    <a class="cta" href="${APP_URL}/events/${a.eventId}"
       style="display:inline-block;background:${approved ? CERULEAN : IMPERIAL};color:#fff;text-decoration:none;font-size:13px;font-weight:bold;padding:10px 20px;border-radius:8px;">
      View event
    </a>
    ${!approved ? `<p style="margin:16px 0 0;font-size:13px;color:#7a8694;">You can request a different space or time from the event page.</p>` : ""}
  `;

  await resend().emails.send({
    from: FROM,
    to: a.to,
    subject,
    html: shell(subject, body),
  });
}

// ── Daily pending-approval digest to campus admins ───────────
export interface DigestItem {
  dateLabel: string;      // event date, e.g. "Sat, Jan 21"
  timeLabel: string;      // e.g. "8a–12:30p" or "Recurring"
  eventTitle: string;
  eventId: string;
  location: string;       // "Space — Building, Campus"
  ministry: string;       // ministry or "—"
  submitter: string;      // submitter name/email
  submittedAgo: string;   // e.g. "2 days ago"
}

export interface PendingDigestArgs {
  to: string;
  adminName: string | null;
  dateLabel: string;      // today's date, e.g. "Wednesday, August 6, 2026"
  items: DigestItem[];    // scoped to this recipient's campuses
}

export async function sendPendingDigest(a: PendingDigestArgs) {
  const n = a.items.length;
  const subject = `${n} space request${n === 1 ? "" : "s"} pending your review`;

  const rowsHtml = a.items
    .map(
      (it) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #eef1f5;font-size:13px;color:${IMPERIAL};font-weight:bold;white-space:nowrap;vertical-align:top;">
        ${it.dateLabel}<br/><span style="font-weight:normal;color:#7a8694;font-size:12px;">${it.timeLabel}</span>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #eef1f5;font-size:13px;color:#1E1C1D;vertical-align:top;">
        <strong>${it.eventTitle}</strong><br/>
        <span style="color:#7a8694;font-size:12px;">${it.location}</span>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #eef1f5;font-size:13px;color:#1E1C1D;vertical-align:top;">${it.ministry}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eef1f5;font-size:13px;color:#1E1C1D;vertical-align:top;">
        ${it.submitter}<br/><span style="color:#7a8694;font-size:12px;">${it.submittedAgo}</span>
      </td>
    </tr>`
    )
    .join("");

  const body = `
    <p style="margin:0 0 16px;font-size:14px;color:#444;">Hi ${a.adminName?.split(" ")[0] ?? "there"},</p>
    <p style="margin:0 0 20px;font-size:14px;color:#444;">
      You have <strong>${n}</strong> space request${n === 1 ? "" : "s"} awaiting review as of ${a.dateLabel}.
    </p>
    <table style="border-collapse:collapse;width:100%;margin-bottom:20px;border:1px solid #eef1f5;border-radius:8px;overflow:hidden;">
      <thead>
        <tr style="background:#F7F9FB;">
          <th align="left" style="padding:8px 12px;font-size:11px;color:#7a8694;text-transform:uppercase;letter-spacing:1px;">Event date</th>
          <th align="left" style="padding:8px 12px;font-size:11px;color:#7a8694;text-transform:uppercase;letter-spacing:1px;">Event &amp; location</th>
          <th align="left" style="padding:8px 12px;font-size:11px;color:#7a8694;text-transform:uppercase;letter-spacing:1px;">Ministry</th>
          <th align="left" style="padding:8px 12px;font-size:11px;color:#7a8694;text-transform:uppercase;letter-spacing:1px;">Submitted by</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <a class="cta" href="${APP_URL}/approvals"
       style="display:inline-block;background:${CERULEAN};color:#fff;text-decoration:none;font-size:13px;font-weight:bold;padding:10px 20px;border-radius:8px;">
      Review requests
    </a>
    <p style="margin:16px 0 0;font-size:12px;color:#9aa5b1;">You receive this because you're an approver for one or more Mariners congregations. It only sends on days with pending requests.</p>
  `;

  await resend().emails.send({
    from: FROM,
    to: a.to,
    subject,
    html: shell(subject, body),
  });
}

export interface BypassUsedEmailArgs {
  to: string;                 // the code issuer
  issuerName: string | null;
  code: string;
  codeLabel: string | null;
  usedByName: string | null;
  usedByEmail: string;
  eventTitle: string;
  eventId: string;
  spaceName: string;
  buildingName: string | null;
  campusName: string | null;
  whenLabel: string;
  usesRemaining: string;      // "3 of 5 remaining" or "unlimited"
}

export async function sendBypassUsedEmail(a: BypassUsedEmailArgs) {
  const subject = `Bypass code used: ${a.spaceName} for "${a.eventTitle}"`;

  const banner = `<div style="background:#F9C84622;border:1px solid #F9C84688;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
       <p style="margin:0;font-size:14px;font-weight:bold;color:#8a6320;">Your bypass code was used to approve a within-48h booking</p>
     </div>`;

  const body = `
    <p style="margin:0 0 16px;font-size:14px;color:#444;">Hi ${a.issuerName?.split(" ")[0] ?? "there"},</p>
    ${banner}
    <p style="margin:0 0 16px;font-size:14px;color:#444;">A booking was approved using a bypass code you issued. This is an on-call override that skips the 48-hour lead time and conflict checks.</p>
    <table style="border-collapse:collapse;width:100%;margin-bottom:20px;">
      ${row("Code", `<span style="font-family:monospace;font-weight:bold;">${a.code}</span>${a.codeLabel ? ` — ${a.codeLabel}` : ""}`)}
      ${row("Used by", `${a.usedByName ?? a.usedByEmail}${a.usedByName ? ` (${a.usedByEmail})` : ""}`)}
      ${row("Event", a.eventTitle)}
      ${row("Space", `${a.spaceName}${a.buildingName ? ` — ${a.buildingName}` : ""}${a.campusName ? `, ${a.campusName}` : ""}`)}
      ${row("When", a.whenLabel)}
      ${row("Uses", a.usesRemaining)}
    </table>
    <a class="cta" href="${APP_URL}/events/${a.eventId}"
       style="display:inline-block;background:${CERULEAN};color:#fff;text-decoration:none;font-size:13px;font-weight:bold;padding:10px 20px;border-radius:8px;">
      View event
    </a>
    <p style="margin:16px 0 0;font-size:13px;color:#7a8694;">If this wasn't expected, you can deactivate the code from the Bypass Codes page in Admin.</p>
  `;

  await resend().emails.send({
    from: FROM,
    to: a.to,
    subject,
    html: shell(subject, body),
  });
}
