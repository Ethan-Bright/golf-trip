import React, { useEffect, useState } from "react";
import { isStandalonePWA } from "../utils/pwa";

const DISMISS_KEY = "golfTripInstallDismissedAt";
const DISMISS_DAYS = 7;

const wasRecentlyDismissed = () => {
  try {
    const ts = Number(localStorage.getItem(DISMISS_KEY));
    if (!ts) return false;
    const ageDays = (Date.now() - ts) / (1000 * 60 * 60 * 24);
    return ageDays < DISMISS_DAYS;
  } catch {
    return false;
  }
};

const isIos = () => {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent || "");
};

export default function InstallPrompt() {
  // `deferredPrompt` is the Chrome/Android beforeinstallprompt event.
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isStandalonePWA() || wasRecentlyDismissed()) return undefined;

    const onBeforeInstall = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    const onInstalled = () => {
      setDeferredPrompt(null);
      setShowIosHint(false);
    };
    window.addEventListener("appinstalled", onInstalled);

    // iOS Safari never fires beforeinstallprompt, so surface manual instructions
    // (only when running in a browser tab, not an installed PWA).
    if (isIos() && !isStandalonePWA()) {
      const timer = setTimeout(() => setShowIosHint(true), 2500);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", onBeforeInstall);
        window.removeEventListener("appinstalled", onInstalled);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore storage failures
    }
    setDismissed(true);
    setDeferredPrompt(null);
    setShowIosHint(false);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } catch {
      // user dismissed the native sheet
    }
    dismiss();
  };

  if (dismissed) return null;
  const showAndroid = Boolean(deferredPrompt);
  if (!showAndroid && !showIosHint) return null;

  return (
    <div
      className="fixed inset-x-0 z-40 px-4 pointer-events-none"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 5.5rem)" }}
    >
      <div className="card card-elevated pointer-events-auto mx-auto w-full max-w-md p-4 flex items-center gap-3">
        <div className="icon-tile bg-brand-500/15 text-brand-600 dark:text-brand-300 flex-none">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[var(--text-strong)] text-sm">
            Install Golf Trip
          </p>
          {showAndroid ? (
            <p className="text-xs text-[var(--text-muted)]">
              Add it to your home screen for a full-screen, app-like experience.
            </p>
          ) : (
            <p className="text-xs text-[var(--text-muted)]">
              Tap the Share icon, then “Add to Home Screen”.
            </p>
          )}
        </div>
        {showAndroid ? (
          <button onClick={handleInstall} className="btn btn-primary btn-sm flex-none">
            Install
          </button>
        ) : (
          <button onClick={dismiss} className="btn btn-secondary btn-sm flex-none">
            Got it
          </button>
        )}
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="btn btn-ghost btn-sm px-2 flex-none text-lg leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}
