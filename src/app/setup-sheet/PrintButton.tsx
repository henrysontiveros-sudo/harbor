"use client";

export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn-primary px-3 py-1.5 text-sm">
      🖨 Print
    </button>
  );
}
