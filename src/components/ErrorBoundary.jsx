import React from "react";
import { useNavigate } from "react-router-dom";

class ErrorBoundaryInner extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    if (typeof window !== "undefined") {
      console.error("ErrorBoundary caught an error:", error, info);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof this.props.onReset === "function") {
      this.props.onReset();
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card card-elevated max-w-md w-full p-6 text-center">
          <h2 className="text-2xl font-bold text-[var(--text-strong)] mb-2">
            Something went wrong
          </h2>
          <p className="text-[var(--text-muted)] mb-6">
            We hit an unexpected error while rendering this page. You can try again or head back to the dashboard.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="btn btn-primary flex-1"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={() => (window.location.href = "/dashboard")}
              className="btn btn-secondary flex-1"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default function ErrorBoundary({ children }) {
  const navigate = useNavigate();
  return (
    <ErrorBoundaryInner
      onReset={() => {
        navigate(0);
      }}
    >
      {children}
    </ErrorBoundaryInner>
  );
}

