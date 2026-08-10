/**
 * Swellworks studio credit — subtle, centered footer mark at the bottom of the app.
 * Sits in normal flow below page content; the fixed version/feedback pills live in the
 * bottom corners and do not overlap this centered credit. Hidden when printing.
 */
export default function SwellworksCredit() {
  return (
    <footer className="print:hidden w-full flex justify-center px-4 pt-8 pb-6">
      <a
        href="https://swellworks.io"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Built by Swellworks"
        className="group inline-flex items-center gap-2 text-ink/35 hover:text-ink/60 transition-colors"
      >
        <svg
          viewBox="0 0 56 56"
          className="h-4 w-4 shrink-0"
          aria-hidden="true"
        >
          <path d="M6 38 Q17 27 28 38 T50 38" stroke="#0E8F91" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <path d="M6 29 Q17 18 28 29 T50 29" stroke="#0E8F91" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.7" />
          <path d="M6 20 Q17 9 28 20 T50 20" stroke="#0E8F91" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.42" />
        </svg>
        <span className="text-[11px] font-medium tracking-wide">
          Built by <span className="font-semibold">Swellworks</span>
        </span>
      </a>
    </footer>
  );
}
