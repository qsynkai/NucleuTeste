"use client";

import { usePointerGlow } from "@/hooks/use-pointer-glow";
import { notifyError, notifySuccess } from "@/lib/notify";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

export function LoginForm() {
  const router = useRouter();
  usePointerGlow();
  const searchParams = useSearchParams();
  const emailId = useId();
  const passwordId = useId();
  const titleId = useId();
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Falha ao entrar.");
      }

      notifySuccess("Login realizado com sucesso.");
      const rawNext = searchParams.get("next") ?? "";
      const next =
        rawNext.startsWith("/") && !rawNext.startsWith("//")
          ? rawNext
          : "/dashboard";
      router.replace(next);
      router.refresh();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Erro ao autenticar.";
      notifyError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-card">
      <p className="eyebrow">Acesso</p>
      <h1 id={titleId} className="login-card__title">
        Entrar
      </h1>
      <p className="login-card__subtitle">
        Acesse o painel de agendamento de postagens.
      </p>

      <form
        className="login-card__form"
        onSubmit={(event) => void handleSubmit(event)}
        aria-labelledby={titleId}
      >
        <label className="field" htmlFor={emailId}>
          <span className="field__label">Login</span>
          <input
            ref={emailRef}
            id={emailId}
            type="text"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="field__input"
            placeholder="admin"
          />
        </label>

        <label className="field" htmlFor={passwordId}>
          <span className="field__label">Senha</span>
          <input
            id={passwordId}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="field__input"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          aria-busy={submitting}
          className="btn btn--primary login-card__submit"
        >
          {submitting ? "Entrando…" : "Entrar"}
        </button>
      </form>

    </div>
  );
}
