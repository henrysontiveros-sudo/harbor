/**
 * Swellworks print credit — shows ONLY when printing (hidden on screen).
 * Fixed to the bottom of the printed page so every printout (Setup Sheet,
 * or any browser print) carries a "Built by Swellworks" mark with the swell logo.
 * The on-screen studio credit (SwellworksCredit) stays print:hidden; this is its
 * print-time counterpart.
 */
export default function SwellworksPrintCredit() {
  return (
    <div
      className="hidden print:flex fixed bottom-0 left-0 right-0 items-center justify-center gap-2 py-2 text-ink/50"
      aria-hidden="true"
      style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
    >
      <svg viewBox="0 0 56 56" className="h-4 w-4 shrink-0" aria-hidden="true">
        <path d="M6 38 Q17 27 28 38 T50 38" stroke="#0E8F91" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <path d="M6 29 Q17 18 28 29 T50 29" stroke="#0E8F91" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.7" />
        <path d="M6 20 Q17 9 28 20 T50 20" stroke="#0E8F91" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.42" />
      </svg>
      <span className="text-[10px] font-medium tracking-wide">
        Built by <span className="font-semibold">Swellworks</span>
      </span>
    </div>
  );
}
