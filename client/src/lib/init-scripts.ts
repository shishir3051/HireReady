import { STORAGE_KEYS } from "@/lib/constants";

/**
 * Inline <head> scripts that run before first paint. Kept in a plain (non-"use client") module so the
 * root layout (a server component) can import the strings.
 */

export const DARK_QUERY = "(prefers-color-scheme: dark)";

/** Applies the stored theme (`hr-theme`: light | dark | system) as `<html class="dark">`. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  STORAGE_KEYS.theme,
)});var d=t==="dark"||(t!=="light"&&window.matchMedia(${JSON.stringify(
  DARK_QUERY,
)}).matches);var c=document.documentElement.classList;if(d){c.add("dark")}else{c.remove("dark")}}catch(e){}})();`;

/**
 * Marks `<html data-practice="on">` unless practice mode was turned off (it is on by default), so gated answers
 * never flash. If storage is blocked the store falls back to "on" as well.
 */
export const practiceInitScript = `(function(){var on=true;try{on=localStorage.getItem(${JSON.stringify(
  STORAGE_KEYS.practiceMode,
)})!=="false"}catch(e){}if(on){document.documentElement.setAttribute("data-practice","on")}})();`;

/** Marks `<html data-motion="off">` when the learner chose "Reduce animations", for the `motion-off:` CSS variant. */
export const motionInitScript = `(function(){try{if(localStorage.getItem(${JSON.stringify(
  STORAGE_KEYS.motion,
)})==="off"){document.documentElement.setAttribute("data-motion","off")}}catch(e){}})();`;

/** Applies the stored language (`hr-lang` cookie) to <html lang="..."> before first paint. */
export const langInitScript = `(function(){try{var m=document.cookie.match(/(?:^|; )hr-lang=([^;]+)/);if(m&&m[1]==="bn"){document.documentElement.lang="bn"}}catch(e){}})();`;

export const bootScript = themeInitScript + practiceInitScript + motionInitScript + langInitScript;
