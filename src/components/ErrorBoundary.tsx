import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface State {
  error?: Error;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = {};

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  reset = () => this.setState({ error: undefined });

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center surface-base px-6">
          <div className="flex max-w-md flex-col items-start gap-5 rounded-2xl surface-section p-8 ghost-border shadow-ambient-lg">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-error-container text-error">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div className="flex flex-col gap-2">
              <h1 className="text-headline-md font-display text-on-surface">Something broke.</h1>
              <p className="text-body-md text-on-surface-variant">
                The interface hit an unexpected error. Your wallet and funds are safe — no
                transaction was broadcast.
              </p>
            </div>
            <pre className="w-full overflow-x-auto rounded-lg bg-white/[0.04] px-3 py-2 font-mono text-body-sm text-on-surface-variant">
              {this.state.error.message}
            </pre>
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="md"
                leading={<RotateCcw className="h-4 w-4" />}
                onClick={this.reset}
              >
                Try again
              </Button>
              <Button variant="glass" size="md" onClick={() => window.location.reload()}>
                Reload
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
