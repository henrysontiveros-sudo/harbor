import { sendDecisionEmail, sendPendingDigest, sendBypassUsedEmail } from "../src/lib/email";

const TO = process.env.SAMPLE_TO ?? "sdavid@marinerschurch.org";
const SPACE = "Blake's Office";
const CAMPUS = "Irvine";

async function main() {
  console.log("Sending CapEx sample emails to:", TO);

  // 1) APPROVED
  await sendDecisionEmail({
    to: TO,
    requesterName: "Stephen David",
    decision: "approved",
    eventTitle: "CapEx Committee Meeting",
    eventId: "00000000-0000-0000-0000-0000000000c1",
    spaceName: SPACE,
    buildingName: "Ministry Center",
    campusName: CAMPUS,
    scopeLabel: "Whole event (every occurrence)",
    whenLabel: "Thu, Aug 20, 2026 · 10:00–11:30 AM · Monthly on the third Thursday",
  });
  console.log("[1/4] approved ✓");

  // 2) DENIED
  await sendDecisionEmail({
    to: TO,
    requesterName: "Stephen David",
    decision: "denied",
    eventTitle: "CapEx Committee Meeting",
    eventId: "00000000-0000-0000-0000-0000000000c2",
    spaceName: SPACE,
    buildingName: "Ministry Center",
    campusName: CAMPUS,
    scopeLabel: "Single date",
    whenLabel: "Thu, Aug 27, 2026 · 10:00–11:30 AM",
    denialReason: "Blake's Office is booked for a donor meeting that morning — please pick an alternate time or room.",
  });
  console.log("[2/4] denied ✓");

  // 3) DAILY PENDING DIGEST
  await sendPendingDigest({
    to: TO,
    adminName: "Stephen David",
    dateLabel: "Wednesday, August 6, 2026",
    items: [
      {
        dateLabel: "Thu, Aug 20",
        timeLabel: "10:00–11:30a",
        eventTitle: "CapEx Committee Meeting",
        eventId: "00000000-0000-0000-0000-0000000000c1",
        location: `${SPACE} — Ministry Center, ${CAMPUS}`,
        ministry: "Finance / CapEx",
        submitter: "Stephen David",
        submittedAgo: "1 day ago",
      },
      {
        dateLabel: "Thu, Sep 17",
        timeLabel: "10:00–11:30a",
        eventTitle: "CapEx Committee Meeting",
        eventId: "00000000-0000-0000-0000-0000000000c3",
        location: `${SPACE} — Ministry Center, ${CAMPUS}`,
        ministry: "Finance / CapEx",
        submitter: "Stephen David",
        submittedAgo: "3 hours ago",
      },
    ],
  });
  console.log("[3/4] daily digest ✓");

  // 4) BYPASS CODE USED
  await sendBypassUsedEmail({
    to: TO,
    issuerName: "Stephen David",
    code: "CAPEX-ONCALL",
    codeLabel: "CapEx on-call override",
    usedByName: "Stephen David",
    usedByEmail: TO,
    eventTitle: "CapEx Committee Meeting",
    eventId: "00000000-0000-0000-0000-0000000000c4",
    spaceName: SPACE,
    buildingName: "Ministry Center",
    campusName: CAMPUS,
    whenLabel: "Fri, Aug 8, 2026 · 2:00–3:30 PM",
    usesRemaining: "4 of 5 remaining",
  });
  console.log("[4/4] bypass used ✓");

  console.log("\nAll CapEx sample emails sent.");
}

main().catch((e) => { console.error("FAILED:", e); process.exit(1); });
