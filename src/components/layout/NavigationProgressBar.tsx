"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type ProgressState = "idle" | "loading" | "completing";

// Global helper for programmatic triggers
export function triggerNavigationStart() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("taskflow:navigation-start"));
  }
}

// Global helper to manually end progress
export function triggerNavigationEnd() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("taskflow:navigation-end"));
  }
}

function ProgressCore() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [state, setState] = useState<ProgressState>("idle");
  const [scale, setScale] = useState(0);
  const [opacity, setOpacity] = useState(0);

  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fadeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRender = useRef(true);

  const startProgress = () => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);

    // Defer state update to next macrotask to prevent React 19 / useInsertionEffect conflicts
    setTimeout(() => {
      setState("loading");
      setOpacity(1);
      setScale(0.08);

      // Smoothly glide towards 80% with ease-out curve
      requestAnimationFrame(() => {
        setScale(0.78);
      });
    }, 0);
  };

  const completeProgress = () => {
    setTimeout(() => {
      setState("completing");
      setScale(1);

      // Fade out after reaching 100%
      fadeTimerRef.current = setTimeout(() => {
        setOpacity(0);
        
        // Reset back to idle
        resetTimerRef.current = setTimeout(() => {
          setState("idle");
          setScale(0);
        }, 200);
      }, 250);
    }, 0);
  };

  // Complete progress on route changes (skip initial mount)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    completeProgress();
  }, [pathname, searchParams]);

  // Intercept internal link clicks and programmatic history.pushState
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const clickedEl = e.target as HTMLElement | null;
      if (!clickedEl) return;

      // If click originated from a button, input, or interactive component inside an anchor (e.g. dropdown menu trigger on a card), ignore it
      const interactive = clickedEl.closest(
        "button, [role='button'], input, select, textarea, [data-state], [data-radix-collection-item]"
      );
      const target = clickedEl.closest("a");
      if (!target) return;

      if (interactive && target.contains(interactive)) {
        return;
      }

      const href = target.getAttribute("href");
      const targetAttr = target.getAttribute("target");
      const download = target.getAttribute("download");

      // Ignore non-navigation links
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:") ||
        targetAttr === "_blank" ||
        download !== null ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey ||
        e.defaultPrevented
      ) {
        return;
      }

      try {
        const targetUrl = new URL(href, window.location.href);
        const currentUrl = new URL(window.location.href);

        // Skip if same pathname and query
        if (
          targetUrl.origin === currentUrl.origin &&
          targetUrl.pathname === currentUrl.pathname &&
          targetUrl.search === currentUrl.search
        ) {
          return;
        }

        if (targetUrl.origin === currentUrl.origin) {
          startProgress();
        }
      } catch {
        // Ignore invalid URL strings
      }
    };

    // Intercept programmatic router.push / router.replace calls asynchronously
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function (...args) {
      const url = args[2];
      if (url) {
        try {
          const targetUrl = new URL(url.toString(), window.location.href);
          if (
            targetUrl.origin === window.location.origin &&
            (targetUrl.pathname !== window.location.pathname || targetUrl.search !== window.location.search)
          ) {
            setTimeout(() => {
              startProgress();
            }, 0);
          }
        } catch {
          // Ignore parse errors
        }
      }
      return originalPushState.apply(this, args);
    };

    window.history.replaceState = function (...args) {
      const url = args[2];
      if (url) {
        try {
          const targetUrl = new URL(url.toString(), window.location.href);
          if (
            targetUrl.origin === window.location.origin &&
            (targetUrl.pathname !== window.location.pathname || targetUrl.search !== window.location.search)
          ) {
            setTimeout(() => {
              startProgress();
            }, 0);
          }
        } catch {
          // Ignore parse errors
        }
      }
      return originalReplaceState.apply(this, args);
    };

    const handleStartEvent = () => startProgress();
    const handleCompleteEvent = () => completeProgress();

    document.addEventListener("click", handleDocumentClick, true);
    window.addEventListener("taskflow:navigation-start", handleStartEvent);
    window.addEventListener("taskflow:navigation-end", handleCompleteEvent);

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      document.removeEventListener("click", handleDocumentClick, true);
      window.removeEventListener("taskflow:navigation-start", handleStartEvent);
      window.removeEventListener("taskflow:navigation-end", handleCompleteEvent);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, []);

  if (state === "idle" && opacity === 0) return null;

  const getTransition = () => {
    if (state === "completing") {
      return "transform 250ms cubic-bezier(0.4, 0, 0.2, 1), opacity 180ms ease-out";
    }
    if (state === "loading") {
      return "transform 4200ms cubic-bezier(0.1, 0.85, 0.2, 1), opacity 100ms ease-in";
    }
    return "none";
  };

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none h-[2.5px] overflow-hidden"
      aria-hidden="true"
    >
      <div
        className="w-full h-full bg-gradient-to-r from-primary via-emerald-400 to-teal-300 relative"
        style={{
          transform: `scaleX(${scale})`,
          transformOrigin: "left",
          opacity,
          transition: getTransition(),
          willChange: "transform, opacity",
          boxShadow: "0 0 10px rgba(78, 222, 163, 0.7), 0 0 5px rgba(78, 222, 163, 0.4)",
        }}
      >
        {/* Trailing Ambient Laser Glow */}
        <div className="absolute right-0 top-0 bottom-0 w-28 bg-gradient-to-r from-transparent via-white/40 to-white/90 shadow-[0_0_14px_#4edea3,0_0_6px_#4edea3]" />
      </div>
    </div>
  );
}

export default function NavigationProgressBar() {
  return (
    <Suspense fallback={null}>
      <ProgressCore />
    </Suspense>
  );
}
