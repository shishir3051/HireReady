"use client";

import { Check } from "lucide-react";

// Only the 8-character minimum is enforced (same rule as the API); the rest is guidance.
const CHECKS = [
  { label: "8+ characters", test: (p: string) => p.length >= 8 },
  { label: "A number", test: (p: string) => /\d/.test(p) },
  { label: "Upper & lower case", test: (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { label: "A symbol", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];
const LEVELS = [
  { label: "Too short", color: "var(--viz-danger)" },
  { label: "Weak", color: "var(--viz-danger)" },
  { label: "Fair", color: "var(--viz-warning)" },
  { label: "Good", color: "var(--viz-info)" },
  { label: "Strong", color: "var(--viz-success)" },
];

function strength(p: string) {
  if (p.length < 8) return 0;
  const passed = CHECKS.filter((c) => c.test(p)).length; // 1..4, the length check always passes here
  return Math.min(4, passed + (p.length >= 12 ? 1 : 0));
}

/**
 * One-line meter: four segments plus "Fair · add a symbol" (the next missing ingredient), so the auth card keeps
 * fitting one screen while typing. Render it as the password field's hint (`id` = `${fieldId}-hint`).
 */
export function PasswordStrength({ id, password }: { id: string; password: string }) {
  const level = strength(password);
  const { label, color } = LEVELS[level]!;
  const missing = CHECKS.find((c) => !c.test(password));
  const tip = missing && level < 4 ? `add ${missing.label.toLowerCase()}` : null;
  return (
    <div id={id} className="flex items-center gap-2" aria-live="polite">
      <div className="grid flex-1 grid-cols-4 gap-1" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="h-1 rounded-full bg-surface-2 transition-colors duration-200"
            style={i <= Math.max(level, 1) ? { backgroundColor: color } : undefined}
          />
        ))}
      </div>
      <span className="flex shrink-0 items-center gap-1 text-xs">
        {level === 4 && <Check className="size-3.5" style={{ color }} aria-hidden />}
        <span className="font-medium" style={{ color }}>
          {label}
        </span>
        {tip && <span className="text-muted">· {tip}</span>}
      </span>
    </div>
  );
}
