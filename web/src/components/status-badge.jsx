import { cn } from "@/lib/utils";

const STATUS_STYLES = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    available: "bg-emerald-50 text-emerald-700 border-emerald-200",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",

    pending: "bg-amber-50 text-amber-700 border-amber-200",

    reserved: "bg-brand-50 text-brand-700 border-brand-200",
    current: "bg-brand-50 text-brand-700 border-brand-200",
    booked: "bg-brand-50 text-brand-700 border-brand-200",

    inactive: "bg-rose-50 text-rose-700 border-rose-200",
    deactivated: "bg-rose-50 text-rose-700 border-rose-200",
    cancelled: "bg-rose-50 text-rose-700 border-rose-200",
    rejected: "bg-rose-50 text-rose-700 border-rose-200",
    unavailable: "bg-rose-50 text-rose-700 border-rose-200",

    gridoperator: "bg-brand-50 text-brand-700 border-brand-200",
    backoffice: "bg-violet-50 text-violet-700 border-violet-200"
};

const DOT_STYLES = {
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

/**
 * A light, color-coded status pill. Purely presentational — pass the raw
 * status string from the API and it maps to a sensible color automatically,
 * falling back to a neutral slate style for anything unrecognized.
 */
export function StatusBadge({ status, className }) {
    const key = String(status ?? "").toLowerCase();
    const tone = STATUS_STYLES[key] ?? "bg-slate-100 text-slate-700 border-slate-200";
    const dot = DOT_STYLES[key] ?? "bg-slate-400";

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
                tone,
                className
            )}
        >
            <span className={cn("size-1.5 shrink-0 rounded-full", dot)} aria-hidden="true" />
            {status ?? "—"}
        </span>
    );
}