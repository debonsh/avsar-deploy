// Route error boundary: a render crash becomes a readable screen with a way
// home, never a black page. Resets on navigation so one bad route can't
// trap the app.
import { Component } from "react";
import { Link } from "react-router";

export class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, path: props.path };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  static getDerivedStateFromProps(props, state) {
    if (props.path !== state.path) return { error: null, path: props.path };
    return null;
  }

  componentDidCatch(error, info) {
    try {
      console.error("[avsar] route crash:", error, info?.componentStack);
      this.setState({ stack: (info?.componentStack || "").split("\n").slice(0, 6).join("\n") });
    } catch {
      /* logging must never throw */
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6" role="alert">
          <div className="border border-red-900 bg-red-950 px-6 py-8">
            <p className="font-mono text-[11px] uppercase tracking-widest text-red-400">
              {"// something broke on this route"}
            </p>
            <p className="mt-2 font-mono text-sm leading-6 text-red-200">
              {String(this.state.error?.message || this.state.error)}
            </p>
            {this.state.stack && (
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-5 text-red-300/80">
                {this.state.stack}
              </pre>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                to="/"
                className="inline-flex min-h-[40px] items-center border border-zinc-700 bg-zinc-950 px-4 py-2 font-mono text-xs uppercase tracking-widest text-zinc-200 hover:border-zinc-500"
              >
                [back home]
              </Link>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex min-h-[40px] items-center border border-zinc-700 bg-zinc-950 px-4 py-2 font-mono text-xs uppercase tracking-widest text-zinc-200 hover:border-zinc-500"
              >
                [reload]
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
