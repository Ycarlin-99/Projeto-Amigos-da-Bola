import { sessao } from "@/lib/sessao";
import { ROTULO_PERNA, ROTULO_POSICAO, type Jogador } from "@/lib/tipos";
import { Etiqueta, Vazio } from "@/components/ui";
import SeletorNivel from "./seletor-nivel";

export const metadata = { title: "Elenco — Amigos da Bola" };

export default async function PaginaElenco() {
  const { supabase, jogador } = await sessao();

  const { data } = await supabase
    .from("jogadores")
    .select("*")
    .order("nome", { ascending: true });

  const elenco = (data ?? []) as Jogador[];
  const admin = jogador?.admin ?? false;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Elenco</h1>
        <p className="mt-1 text-base text-slate-600">
          {elenco.length} {elenco.length === 1 ? "jogador cadastrado" : "jogadores cadastrados"}
        </p>
      </div>

      {elenco.length === 0 ? (
        <Vazio titulo="Elenco vazio" texto="Assim que o pessoal criar conta, aparece aqui." />
      ) : (
        <ul className="cartao divide-y divide-slate-100">
          {elenco.map((j) => (
            <li key={j.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate font-semibold text-slate-900">
                  {j.nome}
                  {j.id === jogador?.id && <Etiqueta cor="azul">você</Etiqueta>}
                  {j.admin && <Etiqueta cor="ouro">organizador</Etiqueta>}
                </p>
                <p className="text-sm text-slate-500">
                  {ROTULO_POSICAO[j.posicao]} · {ROTULO_PERNA[j.perna]}
                </p>
              </div>

              {admin ? (
                <SeletorNivel jogadorId={j.id} nivelAtual={j.nivel} />
              ) : (
                <Estrelas nivel={j.nivel} />
              )}
            </li>
          ))}
        </ul>
      )}

      {admin && (
        <p className="text-sm text-slate-500">
          Como organizador, você pode ajustar o nível de cada um. É esse número
          que o sorteio usa para equilibrar os times.
        </p>
      )}
    </div>
  );
}

function Estrelas({ nivel }: { nivel: number }) {
  return (
    <span className="shrink-0 text-lg tracking-tight" aria-label={`Nível ${nivel} de 5`}>
      <span className="text-ouro-400">{"★".repeat(nivel)}</span>
      <span className="text-slate-300">{"★".repeat(5 - nivel)}</span>
    </span>
  );
}
