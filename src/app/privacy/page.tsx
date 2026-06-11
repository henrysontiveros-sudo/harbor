import Link from "next/link";

export const metadata = {
  title: "Privacy Policy · Harbor",
  description: "Privacy policy for Harbor, the space request and event scheduling tool for Mariners Church.",
};

const UPDATED = "June 10, 2026";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F7F9FB]">
      <header className="bg-imperial text-white">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center">
          <Link href="/" className="font-black text-lg tracking-tight">Harbor</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-black text-imperial tracking-tight">Privacy Policy</h1>
        <p className="text-sm text-ink/50 mt-2">Last updated {UPDATED}</p>

        <div className="mt-8 space-y-8 text-ink/80 leading-relaxed text-[15px]">
          <section className="space-y-3">
            <p>
              Harbor is an internal space-request and event-scheduling application
              operated for Mariners Church. This policy explains what information
              Harbor collects, how it is used, and the choices available to you.
              Harbor is intended for use by Mariners Church staff and authorized
              affiliates only.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-imperial">Information We Collect</h2>
            <p>When you sign in with Google, Harbor receives:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Your name, as provided by your Google or organizational account</li>
              <li>Your email address</li>
              <li>Your profile picture, if made available by Google</li>
            </ul>
            <p>
              Harbor also stores the event and space-request information you enter,
              including event titles, dates, requested spaces, setup details, and
              any notes you provide.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-imperial">How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>To authenticate you and maintain your session</li>
              <li>To create, display, and manage space requests and events</li>
              <li>To route requests to the appropriate campus administrators for approval</li>
              <li>To send transactional email notifications about your requests</li>
              <li>To restrict access to authorized Mariners Church accounts</li>
            </ul>
            <p>
              Harbor does not sell your information, use it for advertising, or share
              it with third parties for marketing purposes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-imperial">Google User Data</h2>
            <p>
              Harbor&apos;s use of information received from Google APIs adheres to the
              {" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                className="text-cerulean underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements. Harbor only requests basic
              profile and email information needed to sign you in. We do not access,
              store, or transfer your Google data beyond what is described here.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-imperial">Data Storage and Security</h2>
            <p>
              Account and application data is stored using Supabase and hosted on
              Vercel. Access is restricted to authenticated, authorized accounts.
              Email notifications are delivered through Resend. We take reasonable
              measures to protect your information, though no system can be
              guaranteed completely secure.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-imperial">Data Retention</h2>
            <p>
              We retain your account and request data for as long as your account
              remains active or as needed to operate the service. You may request
              deletion of your account and associated data by contacting us.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-imperial">Your Choices</h2>
            <p>
              You may request access to, correction of, or deletion of your personal
              information at any time. Because Harbor is an internal tool, signing in
              requires an authorized Mariners Church account.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-imperial">Contact</h2>
            <p>
              For questions about this policy or your data, contact the Harbor
              administrator at{" "}
              <a href="mailto:hontiveros@marinerschurch.org" className="text-cerulean underline">
                hontiveros@marinerschurch.org
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-ink/10 text-sm text-ink/40">
          <Link href="/terms" className="text-cerulean underline">Terms of Service</Link>
          <span className="mx-2">·</span>
          <Link href="/" className="text-cerulean underline">Return to Harbor</Link>
        </div>
      </main>
    </div>
  );
}
