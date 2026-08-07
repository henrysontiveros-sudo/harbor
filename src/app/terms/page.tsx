import Link from "next/link";

export const metadata = {
  title: "Terms of Service · Harbor",
  description: "Terms of service for Harbor, the space request and event scheduling tool for Mariners Church.",
};

const UPDATED = "June 10, 2026";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#F7F9FB]">
      <header className="bg-imperial text-white">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center">
          <Link href="/" className="font-black text-lg tracking-tight">Harbor</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-black text-imperial tracking-tight">Terms of Service</h1>
        <p className="text-sm text-ink/50 mt-2">Last updated {UPDATED}</p>

        <div className="mt-8 space-y-8 text-ink/80 leading-relaxed text-[15px]">
          <section className="space-y-3">
            <p>
              Harbor is an internal tool provided for Mariners Church staff and
              authorized affiliates to request spaces and schedule events. By
              accessing or using Harbor, you agree to these terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-imperial">Eligibility and Access</h2>
            <p>
              Access to Harbor is limited to users with an authorized Mariners
              Church or affiliated account. You are responsible for maintaining the
              confidentiality of your account and for all activity that occurs under
              it. Access may be granted, restricted, or revoked at the discretion of
              Mariners Church.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-imperial">Acceptable Use</h2>
            <p>You agree to use Harbor only for its intended purpose. You will not:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Submit false, misleading, or unauthorized requests</li>
              <li>Attempt to access data or accounts that are not yours</li>
              <li>Interfere with or disrupt the operation of the service</li>
              <li>Use the service in violation of any applicable law or policy</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-imperial">Bookings and Approvals</h2>
            <p>
              Submitting a space request does not guarantee a reservation. Requests
              are subject to review and approval by congregation administrators. Mariners
              Church reserves the right to modify, reschedule, or cancel any booking.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-imperial">Service Availability</h2>
            <p>
              Harbor is provided on an &quot;as is&quot; and &quot;as available&quot;
              basis. We do not warrant that the service will be uninterrupted,
              error-free, or secure. Features may change or be discontinued at any
              time.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-imperial">Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, Harbor and Mariners Church will
              not be liable for any indirect, incidental, or consequential damages
              arising from your use of the service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-imperial">Changes to These Terms</h2>
            <p>
              We may update these terms from time to time. Continued use of Harbor
              after changes take effect constitutes acceptance of the revised terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-imperial">Contact</h2>
            <p>
              Questions about these terms may be directed to the Harbor administrator
              at{" "}
              <a href="mailto:hontiveros@marinerschurch.org" className="text-cerulean underline">
                hontiveros@marinerschurch.org
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-ink/10 text-sm text-ink/40">
          <Link href="/privacy" className="text-cerulean underline">Privacy Policy</Link>
          <span className="mx-2">·</span>
          <Link href="/" className="text-cerulean underline">Return to Harbor</Link>
        </div>
      </main>
    </div>
  );
}
