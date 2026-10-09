"use client";

import { Toaster } from "sonner";

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <>
      {children}
      <Toaster
        closeButton
        duration={4000}
        position="bottom-right"
        toastOptions={{
          style: {
            background: "var(--glass-strong)",
            color: "var(--text)",
            border: "1px solid var(--border-strong)",
            borderTopColor: "rgba(255, 255, 255, 0.28)",
            borderRadius: "var(--radius)",
            boxShadow: "0 18px 40px -12px rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(20px) saturate(150%)",
            WebkitBackdropFilter: "blur(20px) saturate(150%)",
            fontFamily: "var(--f-sans)",
          },
        }}
      />
    </>
  );
}
