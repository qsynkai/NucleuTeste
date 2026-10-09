"use client";

import { BrandMark } from "@/components/brand/brand-mark";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Ambient } from "@/components/ui/ambient";
import { usePointerGlow } from "@/hooks/use-pointer-glow";
import { APP_NAME, BRAND_MODULE, BRAND_WORDMARK } from "@/lib/constants/brand";
import { notifySuccess } from "@/lib/notify";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const iconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 18 18",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const OverviewIcon = () => (
  <svg {...iconProps}>
    <rect x="2" y="2" width="5.5" height="7" rx="1.2" />
    <rect x="10.5" y="2" width="5.5" height="4" rx="1.2" />
    <rect x="2" y="12" width="5.5" height="4" rx="1.2" />
    <rect x="10.5" y="9" width="5.5" height="7" rx="1.2" />
  </svg>
);

const CalendarIcon = () => (
  <svg {...iconProps}>
    <rect x="2" y="3.5" width="14" height="12.5" rx="2" />
    <path d="M2 7.5h14M6 2v3M12 2v3" />
  </svg>
);

const ProjectsIcon = () => (
  <svg {...iconProps}>
    <path d="M2 5.5A1.5 1.5 0 0 1 3.5 4h3l1.5 2h6.5A1.5 1.5 0 0 1 16 7.5v6A1.5 1.5 0 0 1 14.5 15h-11A1.5 1.5 0 0 1 2 13.5z" />
  </svg>
);

const LogoutIcon = () => (
  <svg {...iconProps}>
    <path d="M7 15.5H4.5A1.5 1.5 0 0 1 3 14V4a1.5 1.5 0 0 1 1.5-1.5H7" />
    <path d="M11.5 12.5 15 9l-3.5-3.5M15 9H7" />
  </svg>
);

const NAV = [
  { href: "/dashboard", label: "Visão geral", icon: <OverviewIcon /> },
  { href: "/calendar", label: "Agenda", icon: <CalendarIcon /> },
  { href: "/projects", label: "Projetos", icon: <ProjectsIcon /> },
];

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  usePointerGlow();

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    notifySuccess("Sessão encerrada.");
    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="shell">
      <Ambient />
      <aside className="sidebar">
        <Link href="/dashboard" className="brand" aria-label={`${APP_NAME} — início`}>
          <BrandMark />
          <span className="brand__copy">
            <span className="brand__name">{BRAND_WORDMARK}</span>
            <span className="brand__sub">{BRAND_MODULE}</span>
          </span>
        </Link>

        <nav className="sidebar__nav" aria-label="Principal">
          <span className="eyebrow sidebar__label">Navegação</span>
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="nav-link"
                aria-current={active ? "page" : undefined}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar__foot">
          <button type="button" className="nav-link nav-btn" onClick={() => void logout()}>
            <LogoutIcon />
            Sair
          </button>
        </div>
      </aside>

      <div className="shell__main">
        <header className="topbar">
          <Link href="/dashboard" className="wordmark" aria-label={APP_NAME}>
            <BrandMark />
            <span>{BRAND_WORDMARK}</span>
          </Link>
        </header>
        <main className="page">{children}</main>
      </div>
    </div>
  );
}
