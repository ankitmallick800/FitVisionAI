import { Component, type ReactNode } from "react";

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="grid min-h-dvh place-items-center bg-bg px-6 text-ink">
        <div className="max-w-md">
          <p className="text-xs uppercase tracking-[0.18em] text-lime">FitVision AI</p>
          <h1 className="mt-3 text-3xl font-semibold">This screen hit an error</h1>
          <p className="mt-3 text-sm text-mute">{this.state.error.message}</p>
          <button className="mt-6 rounded-full bg-lime px-4 py-2 text-sm font-semibold text-bg" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </div>
    );
  }
}
