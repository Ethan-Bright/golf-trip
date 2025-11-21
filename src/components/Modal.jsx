import React, { useEffect, useId, useMemo, useRef } from "react";

const ICONS = {
  success: {
    bg: "bg-green-100 dark:bg-green-900/30",
    color: "text-green-600 dark:text-green-400",
    path: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z",
  },
  error: {
    bg: "bg-red-100 dark:bg-red-900/30",
    color: "text-red-600 dark:text-red-400",
    path: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z",
  },
  warning: {
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    color: "text-yellow-600 dark:text-yellow-400",
    path: "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",
  },
  info: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    color: "text-blue-600 dark:text-blue-400",
    path: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z",
  },
};

const BUTTON_VARIANTS = {
  success: "bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600",
  error: "bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600",
  warning: "bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600",
  info: "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600",
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
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-2 sm:p-4 z-50 backdrop-blur-[1px]"
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
        className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-md w-full p-4 sm:p-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={`w-12 h-12 ${icon.bg} rounded-full flex items-center justify-center mx-auto mb-4`}>
          <svg className={`w-6 h-6 ${icon.color}`} fill="currentColor" viewBox="0 0 24 24">
            <path d={icon.path} />
          </svg>
        </div>

        <div className="text-center mb-4 sm:mb-6">
          <h3 id={titleId} className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">
            {title}
          </h3>
          {type !== "input" && message && (
            <p id={descriptionId} className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
              {message}
            </p>
          )}
        </div>

        {type === "input" && (
          <div className="mb-6 text-left">
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">
              {labelText}
            </label>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={placeholder}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        <div className="flex gap-3">
          {showCancel && (
            <button
              type="button"
              onClick={onCancel || onClose}
              className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl sm:rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-gray-400 dark:focus:ring-offset-gray-900 transition-all duration-200 min-h-[44px]"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm || onClose}
            className={`flex-1 py-3 px-4 text-white font-semibold rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all duration-200 min-h-[44px] ${confirmButtonClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
