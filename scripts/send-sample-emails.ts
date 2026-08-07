import { sendDecisionEmail, sendPendingDigest, sendBypassUsedEmail } from "../src/lib/email";

const TO = process.env.SAMPLE_TO ?? "hontiveros@marinerschurch.org";

async function main() {
  console.log("Sending sample workflow emails to:", TO);
  console.log("FROM:", process.env.RESEND_FROM_EMAIL);
  console.log("APP_URL:", process.env.NEXT_PUBLIC_APP_URL);

  // 1) APPROVED decision
  await sendDecisionEmail({
    to: TO,
    requesterName: "Henry Ontiveros",
    decision: "approved",
    eventTitle: "Sample — Youth Group Night",
    eventId: "00000000-0000-0000-0000-000000000001",
    spaceName: "Chapel Sanctuary",
    buildingName: "Chapel",
    campusName: "Irvine",
    scopeLabel: "Whole event (every occurrence)",
    whenLabel: "Sat, Aug 22, 2026 · 6:00–9:00 PM · Weekly on Saturday",
  });
  console.log("[1/5] approved ✓");

  // 2) DENIED decision (with reason)
  await sendDecisionEmail({
    to: TO,
    requesterName: "Henry Ontiveros",
    decision: "denied",
    eventTitle: "Sample — Ministry Leaders Lunch",
    eventId: "00000000-0000-0000-0000-000000000002",
    spaceName: "Fellowship Hall",
    buildingName: "Commons",
    campusName: "Irvine",
    scopeLabel: "Single date",
    whenLabel: "Wed, Aug 19, 2026 · 12:00–1:30 PM",
    denialReason: "Room is already reserved for the Marriage Ministry retreat that day — please pick an alternate space or time.",
  });
  console.log("[2/5] denied ✓");

  // 3) DAILY PENDING DIGEST (to approvers)
  await sendPendingDigest({
    to: TO,
    adminName: "Henry Ontiveros",
    dateLabel: "Wednesday, August 6, 2026",
    items: [
      {
        dateLabel: "Sat, Aug 22",
        timeLabel: "6:00–9:00p",
        eventTitle: "Youth Group Night",
        eventId: "00000000-0000-0000-0000-000000000001",
        location: "Chapel Sanctuary — Chapel, Irvine",
        ministry: "Student Ministries",
        submitter: "Jordan Lee",
        submittedAgo: "2 days ago",
      },
      {
        dateLabel: "Sun, Aug 23",
        timeLabel: "Recurring",
        eventTitle: "Prayer & Worship",
        eventId: "00000000-0000-0000-0000-000000000003",
        location: "Prayer Room — Commons, Irvine",
        ministry: "Prayer Ministry",
        submitter: "Casey Nguyen",
        submittedAgo: "5 hours ago",
      },
      {
        dateLabel: "Fri, Aug 28",
        timeLabel: "9:00a–12:30p",
        eventTitle: "Volunteer Training",
        eventId: "00000000-0000-0000-0000-000000000004",
        location: "Room 210 — Education, Irvine",
        ministry: "Operations",
        submitter: "Sam Rivera",
        submittedAgo: "1 day ago",
      },
    ],
  });
  console.log("[3/5] daily digest ✓");

  // 4) BYPASS CODE USED (to code issuer)
  await sendBypassUsedEmail({
    to: TO,
    issuerName: "Henry Ontiveros",
    code: "ONCALL-4821",
    codeLabel: "Weekend on-call override",
    usedByName: "Jordan Lee",
    usedByEmail: "jlee@marinerschurch.org",
    eventTitle: "Sample — Emergency Memorial Service",
    eventId: "00000000-0000-0000-0000-000000000005",
    spaceName: "Chapel Sanctuary",
    buildingName: "Chapel",
    campusName: "Irvine",
    whenLabel: "Sun, Aug 10, 2026 · 2:00–4:00 PM",
    usesRemaining: "3 of 5 remaining",
  });
  console.log("[4/5] bypass used ✓");

  console.log("\nAll sample emails sent.");
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
