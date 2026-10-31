import { NavLink, Outlet } from "react-router-dom";
import { Dumbbell, History, House, LineChart, Salad, UserRound, Library } from "lucide-react";
import { Disclaimer } from "./ui";

const LINKS = [
  { to: "/app", label: "Home", icon: House, end: true },
  { to: "/app/workouts", label: "Plan", icon: Dumbbell, end: false },
  { to: "/app/library", label: "Library", icon: Library, end: false },
  { to: "/app/diet", label: "Diet", icon: Salad, end: false },
  { to: "/app/history", label: "History", icon: History, end: false },
  { to: "/app/progress", label: "Progress", icon: LineChart, end: false },
  { to: "/app/profile", label: "Profile", icon: UserRound, end: false },
];

function itemClass(active: boolean): string {
  return `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium ${active ? "bg-lime text-bg" : "text-mute hover:bg-white/5 hover:text-ink"}`;
}

export function Layout() {
  return (
    <div className="min-h-dvh bg-bg text-ink lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-lime focus:px-4 focus:py-2 focus:text-bg">
        Skip to content
      </a>
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface/80 px-4 py-6 lg:flex">
        <Brand />
        <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="Primary">
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => itemClass(isActive)}>
              <link.icon size={18} aria-hidden />
              {link.label}
            </NavLink>
          ))}
        </nav>
        <Disclaimer />
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Brand />
          </div>
          <nav className="flex gap-2 overflow-x-auto px-4 pb-3" aria-label="Primary">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `shrink-0 rounded-full px-3 py-1.5 text-sm ${isActive ? "bg-lime text-bg" : "bg-surface text-mute"}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-9 w-9 place-items-center rounded-2xl bg-lime font-mono text-sm font-semibold text-bg">FV</span>
      <div>
        <div className="text-sm font-semibold leading-none">FitVision AI</div>
        <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-mute">On-device trainer</div>
      </div>
    </div>
  );
}
