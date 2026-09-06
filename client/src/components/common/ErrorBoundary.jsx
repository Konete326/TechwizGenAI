import React from "react";
import { WarningCircle, ArrowCounterClockwise } from "@phosphor-icons/react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.href = "/dashboard";
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[320px] w-full flex items-center justify-center p-6 bg-background">
          <div className="w-full max-w-md p-6 rounded-[var(--radius-md)] bg-surface-card border border-border shadow-xl text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center">
              <WarningCircle size={28} weight="fill" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-text-primary">
                Application Rendering Interrupted
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                An unexpected view exception was caught safely by resilience boundaries. You can reset the interface below.
              </p>
            </div>
            {this.state.error?.message && (
              <div className="p-2.5 rounded-[var(--radius-sm)] bg-surface border border-border text-left overflow-x-auto max-h-24">
                <code className="text-[11px] font-mono text-rose-400 block break-all">
                  {this.state.error.message}
                </code>
              </div>
            )}
            <div className="pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[var(--radius-sm)] bg-accent hover:bg-accent-hover text-accent-foreground text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                <ArrowCounterClockwise size={15} weight="bold" />
                <span>Reset View</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
