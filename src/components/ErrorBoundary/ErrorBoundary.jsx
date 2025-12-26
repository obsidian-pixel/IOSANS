/**
 * ErrorBoundary Component
 * Catches React render errors and displays fallback UI
 */
import { Component } from "react";
import "./ErrorBoundary.css";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-icon">💥</div>
            <h1>Something went wrong</h1>
            <p className="error-message">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <div className="error-actions">
              <button onClick={this.handleReset} className="btn-retry">
                Try Again
              </button>
              <button onClick={this.handleReload} className="btn-reload">
                Reload App
              </button>
            </div>
            {this.state.errorInfo && (
              <details className="error-details">
                <summary>Error Details</summary>
                <pre>{this.state.error?.stack}</pre>
                <pre>{this.state.errorInfo.componentStack}</pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
