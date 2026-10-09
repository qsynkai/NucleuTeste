import { BrandLogo } from "@/components/brand/brand-logo";
import { LoginForm } from "@/components/login/login-form";
import { Ambient } from "@/components/ui/ambient";
import { APP_NAME } from "@/lib/constants/brand";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <>
    <Ambient />
    <main className="login">
      <section className="login__cover" aria-label={APP_NAME}>
        <div className="login__brand">
          <BrandLogo variant="hero" priority />
        </div>
        <div>
          <h2 className="login__headline">
            Central de comando de conteúdo com <mark>IA</mark>.
          </h2>
          <p className="login__lede">
            Planeje, organize e acompanhe cada postagem das suas redes em uma
            única agenda, com legendas assistidas por inteligência artificial.
          </p>
          <div className="login__chips" aria-hidden>
            <span className="login__chip">Agenda</span>
            <span className="login__chip">Multicanal</span>
            <span className="login__chip">Legendas com IA</span>
          </div>
        </div>
        <p className="login__colophon">Uso interno · Planejamento de conteúdo</p>
      </section>

      <section className="login__panel">
        <Suspense fallback={<p className="field__hint">Carregando…</p>}>
          <LoginForm />
        </Suspense>
      </section>
    </main>
    </>
  );
}
