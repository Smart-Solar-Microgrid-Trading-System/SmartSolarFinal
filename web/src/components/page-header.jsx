import { cn } from "@/lib/utils";

// header box shown at the top of each page
export function PageHeader({ eyebrow, title, description, icon: Icon, actions, className }) {
    return (
        <div
            className={cn(
                "relative overflow-hidden rounded-2xl border border-brand-100 bg-white p-5 shadow-sm sm:p-6",
                className
            )}
        >
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-400 via-brand-600 to-solar-400"
            />

            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-4">
                    {Icon && (
                        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600">
                            <Icon size={22} aria-hidden="true" />
                        </div>
                    )}

                    <div className="min-w-0">
                        {eyebrow && (
                            <p className="text-xs font-semibold tracking-wider text-brand-600 uppercase">
                                {eyebrow}
                            </p>
                        )}

                        <h1 className="mt-0.5 truncate font-display text-2xl font-bold text-slate-900">
                            {title}
                        </h1>

                        {description && (
                            <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>
                        )}
                    </div>
                </div>

                {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </div>
        </div>
    );
}