import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const navItems = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: (active) => (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 11l9-9 9 9M4 10v10a1 1 0 001 1h4a1 1 0 001-1v-4h4v4a1 1 0 001 1h4a1 1 0 001-1V10"
          className={active ? "text-green-500" : "text-current"}
        />
      </svg>
    ),
  },
  {
    label: "Enter Scores",
    path: "/scores",
    icon: (active) => (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect
          x="3"
          y="4"
          width="18"
          height="16"
          rx="2"
          className={active ? "text-green-500" : "text-current"}
        />
        <path
          strokeLinecap="round"
          d="M7 8h10M7 12h6M7 16h4"
          className={active ? "text-green-500" : "text-current"}
        />
      </svg>
    ),
  },
  {
    label: "New Match",
    path: "/create-game",
    icon: (active) => (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle
          cx="12"
          cy="12"
          r="9"
          className={active ? "text-green-500" : "text-current"}
        />
        <path
          strokeLinecap="round"
          d="M12 8v8M8 12h8"
          className={active ? "text-green-500" : "text-current"}
        />
      </svg>
    ),
  },
  {
    label: "Leaderboard",
    path: "/leaderboard",
    icon: (active) => (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          d="M8 18h8M4 10h4v8H4zM10 6h4v12h-4zM16 13h4v5h-4z"
          className={active ? "text-green-500" : "text-current"}
        />
      </svg>
    ),
  },
  {
    label: "My Stats",
    path: "/my-stats",
    icon: (active) => (
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          d="M12 12a5 5 0 10-5-5 5 5 0 005 5zm0 2c-5 0-9 2.5-9 5v1h18v-1c0-2.5-4-5-9-5z"
          className={active ? "text-green-500" : "text-current"}
        />
      </svg>
    ),
  },
];

const HIDDEN_PATHS = new Set(["/", "/login", "/register"]);

export default function MobileNav() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return null;

  const pathname = location.pathname?.toLowerCase() || "/";

  if (HIDDEN_PATHS.has(pathname)) return null;

  return (
    <div
      className="fixed inset-x-0 z-40 md:hidden pointer-events-none"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
    >
      <div
        className="w-full px-4 pointer-events-auto"
        style={{ maxWidth: "var(--page-shell-max)" }}
      >
        <nav className="floating-nav mx-auto flex items-stretch justify-between gap-1 p-1.5">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.path);

            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[10.5px] font-semibold transition ${
                  isActive
                    ? "bg-brand-500/15 text-brand-600 dark:text-brand-300"
                    : "text-[var(--text-muted)] hover:text-[var(--text-strong)]"
                }`}
              >
                {isActive && (
                  <span className="absolute -top-px left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-gradient-to-r from-brand-400 to-accent-400" />
                )}
                <span className={isActive ? "text-brand-500 dark:text-brand-300" : ""}>
                  {item.icon(isActive)}
                </span>
                <span className="leading-none">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}


