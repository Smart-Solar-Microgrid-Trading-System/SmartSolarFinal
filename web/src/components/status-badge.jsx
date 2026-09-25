import { cn } from "@/lib/utils";

const green = "bg-emerald-50 text-emerald-700 border-emerald-200";
const amber = "bg-amber-50 text-amber-700 border-amber-200";
const blue = "bg-brand-50 text-brand-700 border-brand-200";
const red = "bg-rose-50 text-rose-700 border-rose-200";
const violet = "bg-violet-50 text-violet-700 border-violet-200";

const badgeColors = {
    active: green,
    available: green,
    approved: green,
    completed: green,

    pending: amber,

    reserved: blue,
    current: blue,
    booked: blue,

    inactive: red,
    deactivated: red,
    cancelled: red,
    rejected: red,
    unavailable: red,

    gridoperator: blue,
    backoffice: violet
};

const dotColors = {
    active: "bg-emerald-500",
    available: "bg-emerald-500",
    approved: "bg-emerald-500",
    completed: "bg-emerald-500",
    pending: "bg-amber-500",
    reserved: "bg-brand-500",
    current: "bg-brand-500",
    booked: "bg-brand-500",
    inactive: "bg-rose-500",
    deactivated: "bg-rose-500",
    cancelled: "bg-rose-500",
    rejected: "bg-rose-500",
    unavailable: "bg-rose-500",
    gridoperator: "bg-brand-500",
    backoffice: "bg-violet-500"
};

// small coloured pill for statuses and roles, grey if the status is unknown
export function StatusBadge({ status, className }) {
    const key = String(status ?? "").toLowerCase();
    const color = badgeColors[key] ?? "bg-slate-100 text-slate-700 border-slate-200";
    const dot = dotColors[key] ?? "bg-slate-400";

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
                color,
                className
            )}
        >
            <span className={cn("size-1.5 shrink-0 rounded-full", dot)} aria-hidden="true" />
            {status ?? "—"}
        </span>
    );
}