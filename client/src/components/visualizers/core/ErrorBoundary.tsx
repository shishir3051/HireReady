"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { cn, errorMessage } from "../lib/utils";

interface Props {
  children: ReactNode;
  /** when this value changes, a caught error is cleared and children re-render */
  resetKey?: unknown;
  /** label shown in the error card, e.g. the visual type */
  label?: string;
  onError?: (error: unknown, info: ErrorInfo) => void;
  /** custom fallback; receives the error message */
  fallback?: (message: string) => ReactNode;
  className?: string;
}

interface State {
  error: unknown;
  hasError: boolean;
  resetKey: unknown;
}

/** Catches render errors of a single visual so one bad step never takes down the page. */
export class VisualErrorBoundary extends Component<Props, State> {
  state: State = { error: null, hasError: false, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { error, hasError: true };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    if (!Object.is(props.resetKey, state.resetKey)) {
      return { resetKey: props.resetKey, error: null, hasError: false };
    }
    return null;
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    this.props.onError?.(error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    const message = errorMessage(this.state.error);
    if (this.props.fallback) return this.props.fallback(message);
    return <VisualErrorCard label={this.props.label} message={message} className={this.props.className} />;
  }
}

export function VisualErrorCard({
  label,
  message,
  className,
  children,
}: {
  label?: string;
  message: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex min-w-0 flex-col gap-2 rounded-xl border border-viz-danger/40 bg-viz-danger/10 p-3 text-sm",
        className,
      )}
    >
      <div className="flex items-center gap-2 font-medium">
        <TriangleAlert aria-hidden className="size-4 shrink-0 text-viz-danger" />
        <span>{label ? `Could not render this ${label}` : "Could not render this visual"}</span>
      </div>
      <p className="break-words font-mono text-xs text-muted">{message}</p>
      {children}
    </div>
  );
}
