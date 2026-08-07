import { sendFacilitiesSetupSheet, type SetupSheetBuilding } from "../src/lib/email";

const TO = process.env.SAMPLE_TO ?? "hontiveros@marinerschurch.org";

// Today's real seeded Irvine setups (pulled from live DB), grouped by building.
const buildings: SetupSheetBuilding[] = [
  {
    building: "Chapel",
    rows: [
      {
        timeLabel: "9:00a–11:00a",
        spaceName: "Chapel Sanctuary",
        eventTitle: "Sunday Worship Service",
        ministry: "Worship",
        contact: "Daniel Ruiz",
        logistics: "2 tables · Theater",
        tech: "Full FOH — mics, IMAG, livestream, stage lighting",
        catering: null,
        notes: "Doors open 8:15a for team. Communion table stage-left; confirm elements delivered by 8:30a.",
      },
    ],
  },
  {
    building: "Community Center",
    rows: [
      {
        timeLabel: "9:30a–11:30a",
        spaceName: "Courtyard Room 3",
        eventTitle: "Women's Bible Study",
        ministry: "Women's Ministry",
        contact: "Karen Villanueva",
        logistics: "8 tables · 48 chairs · Rounds",
        tech: null,
        catering: "Coffee & pastries for 45; setup by 9:00a",
        notes: "Rounds of 6. Reserve one accessible seat near the door. Nursing room key at front desk.",
      },
      {
        timeLabel: "6:30p–9:00p",
        spaceName: "CC Auditorium",
        eventTitle: "Youth Group Night",
        ministry: "Student Ministry",
        contact: "Marcus Bell",
        logistics: "6 tables · 80 chairs · Rounds",
        tech: "Stage — wireless mics, worship band DI, house music, moving lights",
        catering: "Pizza for 80 (delivery ~6:00p) + drink station",
        notes: "Clear back third for games. Trash + recycling bins at both exits. Teardown same night by 9:45p.",
      },
    ],
  },
];

const totals = {
  setups: 3,
  tables: 2 + 8 + 6,
  chairs: 0 + 48 + 80,
};

async function main() {
  await sendFacilitiesSetupSheet({
    to: TO,
    recipientName: "Facilities Team",
    campusName: "Irvine",
    dateLabel: "Thursday, August 6, 2026",
    buildings,
    totals,
    sheetUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://harbor.inov8-socal.tech"}/setup-sheet?campus=irvine`,
  });
  console.log(`Setup sheet sample sent to ${TO}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
