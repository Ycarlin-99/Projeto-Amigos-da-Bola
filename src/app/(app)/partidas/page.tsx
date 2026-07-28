import Link from "next/link";
import { sessao } from "@/lib/sessao";
import { dataLonga, hora, jaPassou, quandoEmPalavras } from "@/lib/datas";
import type { Partida, Presenca } from "@/lib/tipos";
import BotoesPresenca from "@/components/botoes-presenca";
import { BotaoLink, Etiqueta, Vazio } from "@/components/ui";

export const metadata = { title: "Jogos — Amigos da Bola" };

export default async function PaginaPartidas() {
  const { supabase, jogador } = await sessao();
  const agora = new Date().toISOString();

  const [{ data: proximas }, { data: passadas }] = await Promise.all([
    supabase
      .from("partidas")
      .select("*")
      .gte("inicio", agora)
      .order("inicio", { ascending: true }),
    supabase
      .from("partidas")
      .select("*")
      .lt("inicio", agora)
      .order("inicio", { ascending: false })
      .limit(8),
  ]);

  const partidas = [...(proximas ?? []), ...(passadas ?? [])] as Partida[];

  // Uma consulta só para todas as presenças das partidas em tela — evita o
  // clássico "uma consulta por card", que é o que faz lista de app travar.
  const { data: presencas } = await supabase
    .from("presencas")
    .select("partida_id, jogador_id, status")
    .in("partida_id", partidas.length ? partidas.map((p) => p.id) : ["-"]);

  const confirmadosPorPartida = new Map<string, number>();
  const minhaPresenca = new Map<string, Presenca["status"]>();

  for (const p of (presencas ?? []) as Presenca[]) {
    if (p.status === "vou") {
      confirmadosPorPartida.set(p.partida_id, (confirmadosPorPartida.get(p.partida_id) ?? 0) + 1);
    }
    if (p.jogador_id === jogador?.id) minhaPresenca.set(p.partida_id, p.status);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Jogos</h1>
        {jogador?.admin && (
          <BotaoLink href="/partidas/nova" className="px-4 py-2.5">
            + Novo jogo
          </BotaoLink>
        )}
      </div>

      <section aria-labelledby="proximos">
        <h2 id="proximos" className="mb-3 text-lg font-bold text-slate-700">
          Próximos
        </h2>

        {(proximas ?? []).length === 0 ? (
          <Vazio
            titulo="Nenhum jogo marcado"
            texto={
              jogador?.admin
                ? "Toque em “Novo jogo” para marcar a próxima pelada."
                : "Quando o organizador marcar a próxima pelada, ela aparece aqui."
            }
          />
        ) : (
          <ul className="space-y-3">
            {((proximas ?? []) as Partida[]).map((partida) => (
              <li key={partida.id}>
                <CartaoPartida
                  partida={partida}
                  confirmados={confirmadosPorPartida.get(partida.id) ?? 0}
                  meuStatus={minhaPresenca.get(partida.id) ?? null}
                  jogadorId={jogador!.id}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {(passadas ?? []).length > 0 && (
        <section aria-labelledby="anteriores">
          <h2 id="anteriores" className="mb-3 text-lg font-bold text-slate-700">
            Já rolaram
          </h2>
          <ul className="space-y-3">
            {((passadas ?? []) as Partida[]).map((partida) => (
              <li key={partida.id}>
                <Link
                  href={`/partidas/${partida.id}`}
                  className="cartao flex items-center gap-4 px-4 py-3.5 opacity-80 transition-opacity hover:opacity-100"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-800">{partida.titulo}</p>
                    <p className="truncate text-sm text-slate-500">
                      {dataLonga(partida.inicio)} · {partida.local}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-slate-500">
                    {confirmadosPorPartida.get(partida.id) ?? 0} jogadores
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function CartaoPartida({
  partida,
  confirmados,
  meuStatus,
  jogadorId,
}: {
  partida: Partida;
  confirmados: number;
  meuStatus: Presenca["status"] | null;
  jogadorId: string;
}) {
  const cancelada = partida.status === "cancelada";
  const prazoEncerrado = jaPassou(partida.prazo_confirmacao);
  const vagas = partida.qtd_times * partida.jogadores_por_time;

  return (
    <div className={`cartao overflow-hidden ${cancelada ? "opacity-70" : ""}`}>
      <Link href={`/partidas/${partida.id}`} className="block px-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold uppercase tracking-wide text-marinho-500">
              {quandoEmPalavras(partida.inicio)}
            </p>
            <h3 className="mt-0.5 truncate text-xl font-bold text-slate-900">
              {partida.titulo}
            </h3>
            <p className="mt-1 text-base text-slate-600">
              {dataLonga(partida.inicio)} às {hora(partida.inicio)}
            </p>
            <p className="text-base text-slate-600">{partida.local}</p>
          </div>
          {cancelada && <Etiqueta cor="vermelho">Cancelado</Etiqueta>}
        </div>

        <p className="mt-3 text-base font-semibold text-slate-700">
          {confirmados} de {vagas} confirmados
          {confirmados > vagas && " (com reservas)"}
        </p>
      </Link>

      {!cancelada && (
        <div className="mt-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3">
          <BotoesPresenca
            partidaId={partida.id}
            jogadorId={jogadorId}
            statusAtual={meuStatus}
            bloqueado={prazoEncerrado}
            motivoBloqueio="O prazo para confirmar já encerrou. Fale com o organizador."
          />
        </div>
      )}
    </div>
  );
}
