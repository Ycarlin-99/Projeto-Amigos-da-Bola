import Image from "next/image";
import Link from "next/link";
import { sessao } from "@/lib/sessao";
import AoVivo from "./ao-vivo";
import Navegacao from "./navegacao";
import BotaoSair from "./sair";

export default async function LayoutApp({
  children,
}: {
  children: React.ReactNode;
}) {
  const { jogador } = await sessao();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-marinho-700 bg-marinho-600 text-white">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link href="/partidas" className="flex items-center gap-2.5">
            <Image
              src="/escudo.png"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 rounded-full"
            />
            <span className="text-lg font-bold">Amigos da Bola</span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            {jogador?.admin && (
              <span className="rounded-full bg-ouro-400 px-3 py-1 text-sm font-bold text-marinho-800">
                Organizador
              </span>
            )}
            <BotaoSair />
          </div>
        </div>
      </header>

      {/* pb generoso para o conteúdo não ficar embaixo da barra de navegação */}
      <main className="mx-auto max-w-2xl px-4 pb-28 pt-5">{children}</main>

      <Navegacao />
      <AoVivo />
    </div>
  );
}
