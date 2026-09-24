import { CalendarDays, Grid2X2, LogOut, Menu, RadioTower, SunMedium, UsersRound, Zap } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "Overview", to: "/", icon: Grid2X2 },
  { label: "Users", to: "/users", icon: UsersRound, roles: ["Backoffice"] },
  { label: "Prosumers", to: "/prosumers", icon: SunMedium, roles: ["Backoffice"] },
  { label: "Microgrid Nodes", to: "/nodes", icon: RadioTower },
  { label: "Reservations", to: "/reservations", icon: CalendarDays, roles: ["Prosumer"] }
];

function Navigation({ items }) {
  return <nav className="space-y-1" aria-label="Primary navigation">{items.map(({ label, to, icon: Icon }) => <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors", isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50 hover:text-brand-700")}><Icon size={18} aria-hidden="true" />{label}</NavLink>)}</nav>;
}

export function AppShell() {
  const { session, signOut } = useAuth();
  const navigationForRole = navigation.filter((item) => !item.roles || item.roles.includes(session?.role));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-brand-100 bg-white px-4 shadow-sm sm:px-6">
        <div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-lg bg-brand-600 text-white"><Zap size={20} aria-hidden="true" /></div><div><p className="text-sm font-bold text-brand-700">Smart Solar Microgrid</p><p className="text-xs text-slate-500">Trading System</p></div></div>
        <Sheet>
          <SheetTrigger asChild><Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation"><Menu size={20} /></Button></SheetTrigger>
          <SheetContent side="left" className="flex w-[280px] flex-col p-0"><SheetHeader className="border-b border-brand-100"><SheetTitle className="text-brand-700">Navigation</SheetTitle></SheetHeader><div className="flex-1 p-3"><Navigation items={navigationForRole} /></div><div className="border-t border-brand-100 p-3"><p className="text-sm font-medium">{session?.name}</p><p className="mb-3 text-xs text-slate-500">{session?.role}</p><Button variant="outline" className="w-full" onClick={signOut}><LogOut size={17} /> Sign out</Button></div></SheetContent>
        </Sheet>
        <div className="hidden items-center gap-4 md:flex"><div className="text-right"><p className="text-sm font-medium">{session?.name}</p><p className="text-xs text-slate-500">{session?.role}</p></div><Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out"><LogOut size={19} /></Button></div>
      </header>
      <div className="mx-auto flex max-w-7xl"><aside className="hidden w-60 shrink-0 border-r border-brand-100 bg-white p-3 md:block"><Navigation items={navigationForRole} /></aside><main className="min-w-0 flex-1 p-4 sm:p-6"><Outlet /></main></div>
    </div>
  );
}
