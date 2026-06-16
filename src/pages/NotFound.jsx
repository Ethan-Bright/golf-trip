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
      <section className="mobile-card p-6 max-w-lg w-full space-y-6 text-center">
        <p className="eyebrow">404</p>
        <p className="text-[var(--text-muted)]">
          The link you followed may be broken, or the page may have been removed. You can head back to your dashboard or return home.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="btn btn-primary flex-1"
          >
            Go to Dashboard
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="btn btn-secondary flex-1"
          >
            Back to Landing
          </button>
        </div>
      </section>
    </PageShell>
  );
}

