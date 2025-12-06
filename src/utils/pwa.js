// Detect if the app is running in an installed/standalone (PWA) context
export function isStandalonePWA() {
  if (typeof window === "undefined") return false;
  const displayModeStandalone =
    window.matchMedia &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)")?.matches;
  const iosStandalone = typeof navigator !== "undefined" && navigator.standalone;
  return Boolean(displayModeStandalone || iosStandalone);
}

