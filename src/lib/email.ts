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
  return `
  <div style="font-family:Helvetica,Arial,sans-serif;background:#F7F9FB;padding:32px 16px;">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e9ef;">
      <div style="background:${IMPERIAL};padding:20px 28px;">
        <table style="border-collapse:collapse;"><tr>
          <td style="padding-right:12px;vertical-align:middle;">
            <img src="${APP_URL}/mariners-m-white.png" width="36" height="36" alt="Mariners Church" style="display:block;" />
          </td>
          <td style="vertical-align:middle;">
            <p style="margin:0;color:#fff;font-size:18px;font-weight:bold;">Harbor</p>
            <p style="margin:2px 0 0;color:rgba(255,255,255,.55);font-size:11px;letter-spacing:2px;text-transform:uppercase;">Mariners Church</p>
          </td>
        </tr></table>
      </div>
      <div style="height:3px;background:${CERULEAN};"></div>
      <div style="padding:28px;">
        <h1 style="margin:0 0 16px;font-size:18px;color:${IMPERIAL};">${title}</h1>
        ${body}
      </div>
      <div style="padding:16px 28px;border-top:1px solid #eef1f5;">
        <p style="margin:0;font-size:11px;color:#9aa5b1;">Harbor · Space requests &amp; event scheduling · Mariners Church</p>
      </div>
    </div>
  </div>`;
}

function row(label: string, value: string) {
  return `<tr>
    <td style="padding:6px 12px 6px 0;font-size:12px;color:#7a8694;text-transform:uppercase;letter-spacing:1px;vertical-align:top;white-space:nowrap;">${label}</td>
    <td style="padding:6px 0;font-size:14px;color:#1E1C1D;">${value}</td>
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
    <a href="${APP_URL}/events/${a.eventId}"
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
