"use client";

import { useEffect } from "react";

const GLOW_SELECTOR = ".panel, .hero, .calendar-toolbar, .login-card";

export function usePointerGlow(): void {
  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const onMove = (event: PointerEvent) => {
      const target = event.target as Element | null;
      const surface = target?.closest<HTMLElement>(GLOW_SELECTOR);
      if (!surface) return;
      const rect = surface.getBoundingClientRect();
      surface.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      surface.style.setProperty("--my", `${event.clientY - rect.top}px`);
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    return () => document.removeEventListener("pointermove", onMove);
  }, []);
}
