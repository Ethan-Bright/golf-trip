import React from "react";
import { useNavigate } from "react-router-dom";

const join = (...classes) => classes.filter(Boolean).join(" ");

export default function PageShell({
  title,
  eyebrow,
  description,
  children,
  backText = "Back",
  backHref = -1,
  onBack,
  showBackButton = true,
  actions,
  maxWidthClass = "",
  backgroundClass = "bg-gradient-to-b from-green-50 via-white to-green-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-900",
  bodyClassName = "mobile-section",
  className = "",
  contentClassName = "",
  headerClassName = "",
}) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (!showBackButton) return;
    if (onBack) {
      onBack();
      return;
    }

    if (typeof backHref === "number") {
      navigate(backHref);
    } else {
      navigate(backHref);
    }
  };

  return (
    <div
      className={join(
        "min-h-screen px-3 sm:px-4 pt-safe pb-safe-lg",
        backgroundClass
      )}
    >
      <div className={join("page-shell", maxWidthClass, className)}>
        {(showBackButton || actions) && (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {showBackButton && (
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 bg-white/80 dark:bg-gray-900/60 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                {backText}
              </button>
            )}

            {actions && (
              <div className="flex items-center gap-2 flex-wrap">{actions}</div>
            )}
          </div>
        )}

        {(eyebrow || title || description) && (
          <div className={join("space-y-2", headerClassName)}>
            {eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-500">
                {eyebrow}
              </p>
            )}
            {title && (
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
                {title}
              </h1>
            )}
            {description && (
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                {description}
              </p>
            )}
          </div>
        )}

        <div className={join(bodyClassName, contentClassName)}>{children}</div>
      </div>
    </div>
  );
}


