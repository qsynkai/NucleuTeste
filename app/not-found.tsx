import { Ambient } from "@/components/ui/ambient";
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <>
    <Ambient />
    <main className="notice">
      <p className="eyebrow">404</p>
      <h1 className="notice__title">Página não encontrada</h1>
      <p className="notice__text">
        A rota que você tentou acessar não existe ou foi movida.
      </p>
      <div className="notice__actions">
        <Link href="/" className="btn">
          Início
        </Link>
        <Link href="/calendar" className="btn btn--primary">
          Abrir agenda
        </Link>
      </div>
    </main>
    </>
  );
}
