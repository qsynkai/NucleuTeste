"use client";

import { Ambient } from "@/components/ui/ambient";
import { notifyError } from "@/lib/notify";
import { useEffect } from "react";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
    notifyError("Ocorreu um erro inesperado na aplicação.");
  }, [error]);

  return (
    <>
    <Ambient />
    <main className="notice">
      <p className="eyebrow">Erro</p>
      <h1 className="notice__title">Algo deu errado</h1>
      <p className="notice__text">
        Não foi possível concluir a operação. Você pode tentar novamente ou
        voltar para a agenda.
      </p>
      {error.digest ? (
        <p className="eyebrow">Referência: {error.digest}</p>
      ) : null}
      <div className="notice__actions">
        <button type="button" onClick={reset} className="btn btn--primary">
          Tentar novamente
        </button>
        <a href="/calendar" className="btn">
          Ir para agenda
        </a>
      </div>
    </main>
    </>
  );
}
