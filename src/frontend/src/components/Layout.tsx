import { SignInButton } from "@/components/InternetIdentity";
import { useCallerMentor, useIsCallerAdmin } from "@/hooks/useQueries";
import { cn } from "@/lib/utils";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  ClipboardList,
  FilePlus2,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Users,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
  /** Optional pathname prefix used for active-state detection. */
  match?: string;
  /** Stable data-ocid suffix; defaults to the route path. */
  ocid?: string;
};

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/assessments", label: "Daftar Asesmen", icon: ClipboardList },
  { to: "/assessments/new", label: "Buat Asesmen", icon: FilePlus2 },
  {
    to: "/assessments",
    label: "Hasil Asesmen",
    icon: GraduationCap,
    match: "/assessments/",
    ocid: "results",
  },
  { to: "/mentors", label: "Kelola Mentor", icon: Users, adminOnly: true },
];

function Wordmark() {
  return (
    <Link
      to="/"
      data-ocid="nav.home_link"
      className="flex items-center gap-2.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring"
    >
      <span className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
        <GraduationCap className="size-5" aria-hidden="true" />
      </span>
      <span className="font-display text-base font-bold tracking-tight text-sidebar-foreground">
        NURISH SMART
      </span>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { data: isAdmin } = useIsCallerAdmin();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  return (
    <nav aria-label="Navigasi utama" className="flex flex-col gap-1">
      {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => {
        const active =
          item.to === "/"
            ? pathname === "/"
            : item.match !== undefined
              ? pathname.startsWith(item.match)
              : pathname === item.to || pathname.startsWith(`${item.to}/`);
        const Icon = item.icon;
        const ocid =
          item.ocid ??
          (item.to === "/"
            ? "dashboard"
            : item.to.replace(/\//g, "_").replace(/^_/, ""));
        return (
          <Link
            key={ocid}
            to={item.to}
            onClick={onNavigate}
            data-ocid={`nav.${ocid}_link`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-smooth focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-subtle"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 bg-sidebar p-4">
      <div className="px-1.5 pt-1">
        <Wordmark />
      </div>
      <NavLinks onNavigate={onNavigate} />
      <div className="mt-auto rounded-xl border border-sidebar-border bg-sidebar-accent p-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-sidebar-foreground">
          Peran
        </p>
        <p className="mt-1 text-sm text-sidebar-accent-foreground">
          Pengajar &amp; pengelola asesmen
        </p>
      </div>
    </div>
  );
}

function HeaderUser() {
  const { data: mentor } = useCallerMentor();
  const { data: isAdmin } = useIsCallerAdmin();
  const name = mentor?.displayName ?? (isAdmin ? "Administrator" : "Pengguna");
  const role = isAdmin ? "Admin" : "Mentor";
  const initial = name.trim().charAt(0).toUpperCase() || "N";

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="text-sm font-semibold leading-tight text-foreground">
          {name}
        </p>
        <p className="text-xs text-muted-foreground">{role}</p>
      </div>
      <span
        aria-hidden="true"
        className="flex size-9 items-center justify-center rounded-full bg-primary font-display text-sm font-bold text-primary-foreground"
      >
        {initial}
      </span>
      <SignInButton className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-smooth hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60" />
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  useEffect(() => {
    // Close the mobile drawer whenever the route changes.
    void pathname;
    setDrawerOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-dvh bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border lg:block">
        <div className="sticky top-0 h-dvh">
          <SidebarBody />
        </div>
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Tutup menu navigasi"
            data-ocid="nav.drawer_backdrop"
            className="absolute inset-0 bg-sidebar opacity-60"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] animate-rise shadow-elevated">
            <button
              type="button"
              aria-label="Tutup menu navigasi"
              data-ocid="nav.drawer_close_button"
              className="absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-lg text-sidebar-foreground hover:bg-sidebar-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring"
              onClick={() => setDrawerOpen(false)}
            >
              <X className="size-5" aria-hidden="true" />
            </button>
            <SidebarBody onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-border bg-card shadow-subtle">
          <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                data-ocid="nav.drawer_open_button"
                aria-label="Buka menu navigasi"
                className="flex size-10 items-center justify-center rounded-lg border border-border text-foreground transition-smooth hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:hidden"
                onClick={() => setDrawerOpen(true)}
              >
                <Menu className="size-5" aria-hidden="true" />
              </button>
              <div className="lg:hidden">
                <Wordmark />
              </div>
              <p className="hidden font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground lg:block">
                Platform Asesmen
              </p>
            </div>
            <HeaderUser />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-6 md:py-8">
          <div className="mx-auto w-full max-w-6xl animate-rise">
            {children}
          </div>
        </main>

        <footer className="border-t border-border bg-muted/40 px-4 py-5 md:px-6">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
            <p className="font-display font-semibold tracking-tight text-muted-foreground">
              NURISH SMART
            </p>
            <p>
              © {new Date().getFullYear()}. Built with love using{" "}
              <a
                href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                caffeine.ai
              </a>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
