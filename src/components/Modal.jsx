import React, { useEffect, useId, useMemo, useRef } from "react";

const ICONS = {
  success: {
    bg: "bg-brand-500/15 text-brand-600 dark:text-brand-300",
    color: "text-brand-600 dark:text-brand-300",
    path: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z",
  },
  error: {
    bg: "bg-red-500/15",
    color: "text-red-500 dark:text-red-400",
    path: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z",
  },
  warning: {
    bg: "bg-amber-500/15",
    color: "text-amber-500 dark:text-amber-400",
    path: "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",
  },
  info: {
    bg: "bg-brand-500/15",
    color: "text-brand-600 dark:text-brand-300",
    path: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z",
  },
};

const BUTTON_VARIANTS = {
  success: "btn-primary",
  error: "btn-danger",
  warning: "btn-accent",
  info: "btn-primary",
};

const FOCUSABLE_SELECTORS =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export default function Modal({
  isOpen,
  onClose,
  title,
  message,
  type = "info",
  onConfirm,
  onCancel,
  confirmText = "OK",
  cancelText = "Cancel",
  showCancel = false,
  inputValue = "",
  setInputValue = () => {},
  placeholder = "Enter team name...",
  labelText = "Team Name:",
}) {
  const overlayRef = useRef(null);
  const dialogRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!isOpen) return undefined;
    const previouslyFocused = document.activeElement;

    const focusable = dialogRef.current?.querySelectorAll(FOCUSABLE_SELECTORS);
    (focusable && focusable.length ? focusable[0] : dialogRef.current)?.focus?.();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
      } else if (event.key === "Tab") {
        const elements = dialogRef.current?.querySelectorAll(FOCUSABLE_SELECTORS);
        if (!elements || elements.length === 0) {
          event.preventDefault();
          return;
        }
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (event.shiftKey) {
          if (document.activeElement === first) {
            event.preventDefault();
            last.focus();
          }
        } else if (document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose]);

  const icon = useMemo(() => ICONS[type] || ICONS.info, [type]);
  const confirmButtonClass = BUTTON_VARIANTS[type] || BUTTON_VARIANTS.info;

  if (!isOpen) return null;

  const handleOverlayClick = (event) => {
    if (event.target === overlayRef.current) {
      onClose?.();
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-3 sm:p-4 z-50 backdrop-blur-sm"
      onMouseDown={handleOverlayClick}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={message ? descriptionId : undefined}
        tabIndex={-1}
        className="card card-elevated w-full max-w-md p-5 sm:p-6 focus:outline-none"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={`w-14 h-14 ${icon.bg} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
          <svg className={`w-7 h-7 ${icon.color}`} fill="currentColor" viewBox="0 0 24 24">
            <path d={icon.path} />
          </svg>
        </div>

        <div className="text-center mb-5 sm:mb-6">
          <h3 id={titleId} className="text-lg sm:text-xl font-bold text-[var(--text-strong)] mb-1.5">
            {title}
          </h3>
          {type !== "input" && message && (
            <p id={descriptionId} className="text-sm sm:text-base text-[var(--text-muted)]">
              {message}
            </p>
          )}
        </div>

        {type === "input" && (
          <div className="mb-6 text-left">
            <label className="field-label">{labelText}</label>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={placeholder}
              className="input"
            />
          </div>
        )}

        <div className="flex gap-3">
          {showCancel && (
            <button
              type="button"
              onClick={onCancel || onClose}
              className="btn btn-secondary flex-1"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm || onClose}
            className={`btn flex-1 ${confirmButtonClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
