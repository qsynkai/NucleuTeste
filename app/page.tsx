import { BrandLogo } from "@/components/brand/brand-logo";
import { Ambient } from "@/components/ui/ambient";
import Link from "next/link";

export default function HomePage() {
  return (
    <>
    <Ambient />
    <main className="cover">
      <div className="cover__top">
        <BrandLogo variant="inline" priority />
        <span className="eyebrow">Sistema interno</span>
      </div>

      <div className="cover__main">
        <p className="eyebrow">Central de conteúdo</p>
        <h1 className="cover__headline">
          Comande todo o seu conteúdo com <mark>IA</mark>.
        </h1>
        <p className="cover__lede">
          Agendamento de postagens em redes sociais com calendário, filtros por
          canal e legendas geradas por inteligência artificial.
        </p>
        <div className="cover__actions">
          <Link href="/login" className="btn btn--primary">
            Entrar
          </Link>
          <Link href="/calendar" className="btn">
            Abrir agenda
          </Link>
        </div>
      </div>
    </main>
    </>
  );
}
