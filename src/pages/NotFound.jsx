import React from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../components/layout/PageShell";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <PageShell
      title="Page not found"
      eyebrow="404"
      description="The link you followed may be broken, or the page may have been removed."
      showBackButton={false}
      bodyClassName="items-center justify-center text-center"
    >
      <section className="mobile-card max-w-lg w-full space-y-6 text-center">
        <p className="text-sm font-semibold text-green-600 uppercase tracking-wide">404</p>
        <p className="text-gray-600 dark:text-gray-300">
          The link you followed may be broken, or the page may have been removed. You can head back to your dashboard or return home.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex-1 px-4 py-3 rounded-2xl font-semibold shadow-lg bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Go to Dashboard
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex-1 px-4 py-3 rounded-2xl font-semibold bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Back to Landing
          </button>
        </div>
      </section>
    </PageShell>
  );
}

