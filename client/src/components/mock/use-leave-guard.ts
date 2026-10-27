"use client";

import { useEffect } from "react";

/**
 * While `active`, warn before the user leaves the page:
 * - reload / close tab / external links → the browser's native "Leave site?" prompt (beforeunload)
 * - in-app <a>/<Link> clicks → a confirm() dialog; cancelling stops the client-side navigation
 * Router pushes that don't come from a link click (e.g. the command palette) and the browser back button
 * are not intercepted.
 */
export function useLeaveGuard(active: boolean, message: string) {
  useEffect(() => {
    if (!active) return;

    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      // legacy browsers need returnValue to be set
      e.returnValue = "";
    }

    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if ((anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return;
      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return; // full page load → beforeunload handles it
      if (url.pathname === window.location.pathname && url.search === window.location.search) return; // same page / hash
      if (!window.confirm(message)) {
        e.preventDefault();
        e.stopPropagation();
      }
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    // capture on window runs before React's delegated handlers (next/link checks defaultPrevented)
    window.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("click", onClick, true);
    };
  }, [active, message]);
}
