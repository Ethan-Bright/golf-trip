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
      <div className="min-h-screen bg-green-100 dark:bg-gray-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            We hit an unexpected error while rendering this page. You can try again or head back to the dashboard.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-2xl font-semibold shadow-lg hover:bg-green-700 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={() => (window.location.href = "/dashboard")}
              className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-2xl font-semibold shadow-inner focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
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

