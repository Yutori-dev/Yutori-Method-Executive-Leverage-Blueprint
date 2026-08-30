import Link from "next/link";
import type { ReactNode } from "react";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

interface LinkItem {
  href: string;
  label: string;
  icon: ReactNode;
}

const LINKS: LinkItem[] = [
  {
    href: "/admin/analytics",
    label: "Analytics (all sessions)",
    icon: (
      <Icon>
        <path d="M4 20V13" />
        <path d="M12 20V7" />
        <path d="M20 20V11" />
      </Icon>
    ),
  },
  {
    href: "/admin/diagnostic-config",
    label: "Executive Leverage Diagnostic",
    icon: (
      <Icon>
        <line x1="4" y1="7" x2="20" y2="7" />
        <circle cx="9" cy="7" r="2" />
        <line x1="4" y1="13" x2="20" y2="13" />
        <circle cx="15" cy="13" r="2" />
        <line x1="4" y1="19" x2="20" y2="19" />
        <circle cx="8" cy="19" r="2" />
      </Icon>
    ),
  },
  {
    href: "/admin/zone-of-investment-config",
    label: "Zone of Investment",
    icon: (
      <Icon>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </Icon>
    ),
  },
  {
    href: "/admin/operating-altitude-config",
    label: "White Whale / Leadership Wiring",
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="9" />
        <path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" />
      </Icon>
    ),
  },
  {
    href: "/admin/delegation-beliefs-config",
    label: "Delegation Beliefs",
    icon: (
      <Icon>
        <path d="M20.8 7.6a4.5 4.5 0 00-7.6-3.3l-1.2 1.2-1.2-1.2A4.5 4.5 0 003.2 10l1.2 1.2L12 18.8l7.6-7.6 1.2-1.2a4.4 4.4 0 000-2.4z" />
      </Icon>
    ),
  },
  {
    href: "/admin/priority-delegation-config",
    label: "Priority Delegation",
    icon: (
      <Icon>
        <path d="M3 6l1.5 1.5L7 5" />
        <line x1="10" y1="6" x2="21" y2="6" />
        <path d="M3 12l1.5 1.5L7 11" />
        <line x1="10" y1="12" x2="21" y2="12" />
        <path d="M3 18l1.5 1.5L7 17" />
        <line x1="10" y1="18" x2="21" y2="18" />
      </Icon>
    ),
  },
  {
    href: "/admin/executive-support-audit-config",
    label: "Executive Support Audit",
    icon: (
      <Icon>
        <rect x="5" y="4" width="14" height="17" rx="2" />
        <path d="M9 3.5h6a1 1 0 011 1V6H8V4.5a1 1 0 011-1z" />
        <path d="M9 13l2 2 4-4" />
      </Icon>
    ),
  },
  {
    href: "/admin/priority-leverage-reveal-config",
    label: "Priority Leverage Reveal",
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="8.5" />
        <circle cx="12" cy="12" r="4.5" />
        <circle cx="12" cy="12" r="0.75" fill="currentColor" />
      </Icon>
    ),
  },
  {
    href: "/admin/executive-support-architecture-config",
    label: "Executive Support Architecture",
    icon: (
      <Icon>
        <path d="M12 3l9 4.5-9 4.5-9-4.5L12 3z" />
        <path d="M3 15.5l9 4.5 9-4.5" />
        <path d="M3 11.5l9 4.5 9-4.5" />
      </Icon>
    ),
  },
  {
    href: "/admin/workshop-feedback-settings",
    label: "Workshop Feedback Settings",
    icon: (
      <Icon>
        <path d="M4 4h16v11H8l-4 4V4z" />
      </Icon>
    ),
  },
];

/** Every activity's admin config screen plus cross-session Analytics, as
 * icon + label + chevron row cards -- replaces a flat row of underlined
 * text links that kept growing (and wrapping badly on mobile) as new
 * activities shipped. One column on mobile, two from `sm:` up. */
export function AdminQuickLinks() {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="flex items-center gap-3 rounded-2xl border border-(--color-hairline) bg-(--color-paper-raised) px-4 py-3.5 transition-colors hover:border-(--color-accent)"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--color-accent-soft) text-(--color-accent)">
            {link.icon}
          </span>
          <span className="flex-1 text-sm font-medium text-(--color-ink)">{link.label}</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 text-(--color-ink-muted)"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </Link>
      ))}
    </div>
  );
}
