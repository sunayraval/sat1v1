import React from "react";

interface State {
  hasError: boolean;
  error?: Error | null;
  info?: string;
}

export default class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, State> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false, error: null, info: undefined };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to console — this makes the error visible in server logs
    console.error("Uncaught error in React tree:", error, info);
    this.setState({ info: info.componentStack || undefined });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-3xl w-full bg-white shadow rounded p-6">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-sm text-muted-foreground mb-4">An unexpected error occurred — details are shown below.</p>
            <pre className="whitespace-pre-wrap text-xs overflow-auto max-h-64 bg-gray-100 p-3 rounded">
              {String(this.state.error)}
              {this.state.info && "\n\n"}
              {this.state.info}
            </pre>
            <div className="mt-4">
              <button
                className="px-3 py-1 border rounded"
                onClick={() => window.location.reload()}
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children as React.ReactElement;
  }
}
