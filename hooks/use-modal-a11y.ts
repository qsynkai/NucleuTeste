"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE_SELECTOR =
  'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

export function useModalA11y(
  open: boolean,
  onClose: () => void,
  panelRef: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusFirstField = () => {
      const first = panel?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      first?.focus();
    };

    focusFirstField();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose, panelRef]);
}
