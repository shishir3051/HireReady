import type { Transition } from "motion/react";

/** Shared timing: 250 ms ease-out for everything (spec: 200–300 ms). */
export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const T: Transition = { type: "tween", duration: 0.25, ease: EASE };
export const T_FAST: Transition = { type: "tween", duration: 0.18, ease: EASE };

export const POP = {
  initial: { opacity: 0, scale: 0.85 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.85 },
} as const;
