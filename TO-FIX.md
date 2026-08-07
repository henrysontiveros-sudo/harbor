# Harbor — To-Fix / To-Do List

_Draft for Henry's approval. Status as of v2.0 (last push June 10, 2026). Nothing here is started yet._

Legend: 🔴 blocker for real rollout · 🟡 important · 🟢 polish · ❓ needs live-DB verification

---

## 1. Content & data
- [ ] 🔴 **Seed the other 5 campuses.** Only Irvine has buildings/spaces (~115). Mission Viejo, Santa Ana, Trabuco Canyon, Huntington Beach, and Anaheim are empty campus rows — Find-a-Space, events, and requests can't work there. Need each campus's building/room list (eSpace export).
- [ ] ❓ **Remove QA test accounts** (`qa-staff@`, `qa-admin@marinerschurch.org`) before real staff onboard. _Needs DB check to confirm they still exist._

## 2. Reliability
- [ ] 🔴 **Supabase free-tier auto-pause.** DB sleeps after ~7 days idle → all DB actions fail until restored. Add a lightweight keep-alive cron ping (or move to a paid plan — needs your approval on cost).
- [ ] ❓ **Confirm DB is currently ACTIVE_HEALTHY**, not paused. _Needs Management API check._

## 3. Access & rollout
- [ ] 🟡 **Staff onboarding flow.** Everyone signs in as `viewer` (read-only) and must be manually promoted. Need a plan: who gets promoted, how, and whether there's a bulk/invite path.
- [ ] 🟡 **Campus-admin assignment UI.** `campus_admins` is table-only — no admin page to set who approves for which campus. Today only super_admin can approve anything. Build an assignment screen (or seed the table).
- [ ] 🟢 **In-app help / "how to use" page.** No guidance for first-time staff.

## 4. Quality & docs
- [ ] 🟡 **No automated tests.** Zero test coverage in the repo. At minimum, smoke tests for the request→approval flow, conflict detection, and 48h lead-time trigger.
- [ ] 🟢 **README is still create-next-app boilerplate.** Rewrite for Harbor (what it is, stack, deploy, env vars).

## 5. Open questions for you
- [ ] Are the other 5 campuses actually going live, or is Harbor Irvine-only for now?
- [ ] Is a paid Supabase plan acceptable, or do you want the free-tier keep-alive workaround?
- [ ] Any features you already know are missing that aren't listed above?

---

_Approve, edit, or reprioritize and I'll turn the approved items into version-bumped commits one at a time._
