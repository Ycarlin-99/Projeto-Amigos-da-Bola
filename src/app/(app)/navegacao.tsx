"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS = [
  { href: "/partidas", rotulo: "Jogos", icone: BolaIcone },
  { href: "/elenco", rotulo: "Elenco", icone: PessoasIcone },
  { href: "/perfil", rotulo: "Meu perfil", icone: PerfilIcone },
];

/**
 * Barra fixa embaixo, estilo aplicativo de celular. Só três destinos:
 * mais que isso já vira decisão demais para quem não usa app todo dia.
 */
export default function Navegacao() {
  const caminho = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-2xl">
        {ITENS.map(({ href, rotulo, icone: Icone }) => {
          const ativo = caminho === href || caminho.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={ativo ? "page" : undefined}
                className={`flex flex-col items-center gap-1 px-2 py-2.5 text-sm font-semibold transition-colors ${
                  ativo ? "text-marinho-600" : "text-slate-500"
                }`}
              >
                <Icone ativo={ativo} />
                {rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function BolaIcone({ ativo }: { ativo: boolean }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 7.2l3.2 2.3-1.2 3.8h-4l-1.2-3.8L12 7.2z"
        fill={ativo ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PessoasIcone({ ativo }: { ativo: boolean }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" fill={ativo ? "currentColor" : "none"} />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16 6.2a3 3 0 010 5.6M17 19c0-2.2-.7-3.9-1.9-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function PerfilIcone({ ativo }: { ativo: boolean }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8.5" r="3.6" stroke="currentColor" strokeWidth="1.8" fill={ativo ? "currentColor" : "none"} />
      <path d="M4.8 19.5c0-3.4 3.2-5.8 7.2-5.8s7.2 2.4 7.2 5.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
