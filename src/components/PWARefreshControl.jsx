import React, { useEffect, useState } from "react";
import { isStandalonePWA } from "../utils/pwa";

export default function PWARefreshControl() {
  const [enabled, setEnabled] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    setEnabled(isStandalonePWA());
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let startY = 0;
    let pulling = false;
    const threshold = 70;

    const onTouchStart = (event) => {
      if (window.scrollY === 0) {
        pulling = true;
        startY = event.touches?.[0]?.clientY ?? 0;
      }
    };

    const onTouchMove = (event) => {
      if (!pulling) return;
      const currentY = event.touches?.[0]?.clientY ?? 0;
      const delta = currentY - startY;
      if (delta > 10) {
        setShowHint(true);
      }
      if (delta > threshold) {
        window.location.reload();
      }
    };

    const onTouchEnd = () => {
      pulling = false;
      setShowHint(false);
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none transition-opacity duration-150">
      <div className="mx-auto max-w-5xl px-4 flex justify-center">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className={`mt-2 inline-flex items-center gap-2 rounded-full bg-gray-900/80 px-4 py-2 text-xs font-semibold text-white shadow-lg pointer-events-auto transition ${
            showHint ? "opacity-100" : "opacity-60"
          }`}
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
              d="M4 4v6h6M20 20v-6h-6M5 19a9 9 0 0114-7"
            />
          </svg>
          <span>Pull down or tap to refresh</span>
        </button>
      </div>
    </div>
  );
}

