import { useMemo } from "react";

import {
  CalendarClock,
  ChevronRight,
  Gauge,
  Grid2X2,
  LogOut,
  Menu,
  RadioTower,
  SunMedium,
  UsersRound,
  Zap
} from "lucide-react";

import {
  NavLink,
  Outlet,
  useLocation
} from "react-router-dom";

import { Button } from "@/components/ui/button";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";

import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const navigation = [
  {
    label: "Overview",
    to: "/",
    icon: Grid2X2
  },
  {
    label: "Users",
    to: "/users",
    icon: UsersRound
  },
  {
    label: "Prosumers",
    to: "/prosumers",
    icon: SunMedium
  },
  {
    label: "Microgrid Nodes",
    to: "/nodes",
    icon: RadioTower
  },
  {
    label: "Booking Slots",
    to: "/booking-slots",
    icon: CalendarClock,
    roles: ["Backoffice", "GridOperator"]
  },
  {
    label: "Reservations",
    to: "/reservations",
    icon: Zap,
    roles: ["Backoffice", "GridOperator"]
  },
  {
    label: "Operations",
    to: "/operations",
    icon: Gauge,
    roles: ["Backoffice", "GridOperator"]
  }
];

function Brand({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-400 via-brand-500 to-solar-500 text-white shadow-lg shadow-brand-900/30">
        <Zap
          size={20}
          aria-hidden="true"
          className="drop-shadow"
        />
      </div>

      {!compact && (
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-bold tracking-tight text-white">
            Smart Solar Microgrid
          </p>

          <p className="truncate text-xs text-white/50">
            Trading System
          </p>
        </div>
      )}
    </div>
  );
}

function Navigation({ items }) {
  return (
    <nav
      className="space-y-1"
      aria-label="Primary navigation"
    >
      {items.map(
        ({
          label,
          to,
          icon: Icon
        }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-md shadow-brand-950/40"
                  : "text-slate-300/85 hover:bg-white/[0.06] hover:text-white"
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={18}
                  aria-hidden="true"
                  className={cn(
                    "shrink-0 transition-transform duration-200",
                    isActive ? "text-white" : "text-slate-400 group-hover:text-solar-300"
                  )}
                />

                <span className="truncate">{label}</span>

                {isActive && (
                  <ChevronRight
                    size={15}
                    className="ml-auto shrink-0 text-white/80"
                    aria-hidden="true"
                  />
                )}
              </>
            )}
          </NavLink>
        )
      )}
    </nav>
  );
}

function UserCard({ session, signOut, tone = "dark" }) {
  const initials = (session?.name || "?")
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const isDark = tone === "dark";

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl p-3",
        isDark ? "bg-white/[0.06]" : "bg-slate-50"
      )}
    >
      <div className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-solar-400 to-solar-600 text-xs font-bold text-brand-950 shadow-sm">
        {initials || "U"}
      </div>

      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-semibold", isDark ? "text-white" : "text-slate-800")}>
          {session?.name}
        </p>

        <p className={cn("truncate text-xs", isDark ? "text-white/50" : "text-slate-500")}>
          {session?.role}
        </p>
      </div>

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={signOut}
        aria-label="Sign out"
        className={cn(
          "shrink-0 rounded-full",
          isDark ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-slate-500 hover:bg-slate-200"
        )}
      >
        <LogOut size={16} />
      </Button>
    </div>
  );
}

export function AppShell() {
  const {
    session,
    signOut
  } = useAuth();

  const location = useLocation();

  const navigationForRole = navigation.filter((item) => {
    if (["/users", "/prosumers"].includes(item.to)) return session?.role === "Backoffice";
    return !item.roles || item.roles.includes(session?.role);
  });

  const currentSection = useMemo(() => {
    const match = navigationForRole.find((item) =>
      item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to)
    );
    return match?.label ?? "Smart Solar Microgrid";
  }, [location.pathname, navigationForRole]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar: a true fixed-height vertical nav on the left */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-hidden bg-[linear-gradient(180deg,var(--color-brand-950)_0%,#0e2847_55%,var(--color-brand-950)_100%)] md:flex">
        <div
          aria-hidden="true"
          className="animate-glow-pulse pointer-events-none absolute -top-24 -left-16 size-64 rounded-full bg-solar-400/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -right-10 size-64 rounded-full bg-brand-400/20 blur-3xl"
        />

        <div className="relative z-10 flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <Brand />
        </div>

        <div className="sidebar-scroll relative z-10 flex-1 overflow-y-auto px-3 py-4">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/35">
            Menu
          </p>

          <Navigation items={navigationForRole} />
        </div>

        <div className="relative z-10 border-t border-white/10 p-3">
          <UserCard
            session={session}
            signOut={signOut}
            tone="dark"
          />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-brand-100/70 bg-white/85 px-4 shadow-sm backdrop-blur-md sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 md:hidden"
                  aria-label="Open navigation"
                >
                  <Menu size={20} />
                </Button>
              </SheetTrigger>

              <SheetContent
                side="left"
                className="flex w-[280px] flex-col gap-0 border-none bg-[linear-gradient(180deg,var(--color-brand-950)_0%,#0e2847_55%,var(--color-brand-950)_100%)] p-0 text-white [&_svg]:text-white"
              >
                <SheetHeader className="border-b border-white/10 px-5 py-5">
                  <SheetTitle className="sr-only">
                    Navigation
                  </SheetTitle>
                  <Brand />
                </SheetHeader>

                <div className="sidebar-scroll flex-1 overflow-y-auto p-3">
                  <Navigation items={navigationForRole} />
                </div>

                <div className="border-t border-white/10 p-3">
                  <UserCard
                    session={session}
                    signOut={signOut}
                    tone="dark"
                  />
                </div>
              </SheetContent>
            </Sheet>

            <div className="min-w-0 md:hidden">
              <Brand compact />
            </div>

            <div className="hidden min-w-0 md:block">
              <p className="text-[11px] font-medium uppercase tracking-wider text-brand-500/80">
                Smart Solar Microgrid
              </p>
              <h1 className="truncate font-display text-base font-semibold text-slate-900">
                {currentSection}
              </h1>
            </div>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              {session?.role}
            </span>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <div
            key={location.pathname}
            className="animate-page-in mx-auto w-full max-w-7xl"
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}