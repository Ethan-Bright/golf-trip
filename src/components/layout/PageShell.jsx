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
  backgroundClass = "",
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
                className="btn btn-secondary btn-sm"
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
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            {title && (
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[var(--text-strong)] text-balance">
                {title}
              </h1>
            )}
            {description && (
              <p className="text-sm sm:text-base text-[var(--text-muted)] text-balance">
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


