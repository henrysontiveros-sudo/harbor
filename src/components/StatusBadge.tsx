import { RequestStatus } from "@/lib/types";

const styles: Record<RequestStatus, string> = {
  draft: "bg-ink/10 text-ink/60",
  pending: "bg-sand text-[#8a6320]",
  approved: "bg-radiant/20 text-[#5a7a10]",
  denied: "bg-coral/15 text-coral",
  cancelled: "bg-ink/10 text-ink/40 line-through",
};

const labels: Record<RequestStatus, string> = {
  draft: "Draft",
  pending: "Pending",
  approved: "Approved",
  denied: "Denied",
  cancelled: "Cancelled",
};

export default function StatusBadge({ status }: { status: RequestStatus }) {
  return <span className={`badge ${styles[status]}`}>{labels[status]}</span>;
}
