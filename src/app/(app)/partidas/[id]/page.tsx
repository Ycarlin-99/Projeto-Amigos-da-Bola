import Link from "next/link";
import { notFound } from "next/navigation";
import { sessao } from "@/lib/sessao";
import { dataHora, dataLonga, hora, jaPassou } from "@/lib/datas";
import { ROTULO_POSICAO, type Jogador, type Partida, type StatusPresenca } from "@/lib/tipos";
import {
  acharFormacao,
  ROTULO_SETOR,
  SETOR_DA_POSICAO,
  SETORES,
  type Setor,
} from "@/lib/formacoes";
import BotoesPresenca from "@/components/botoes-presenca";
import { Etiqueta } from "@/components/ui";
import ControlesAdmin from "./controles-admin";

type PresencaComJogador = { status: StatusPresenca; jogadores: Jogador };
type TimeComJogadores = {
  id: string;
  numero: number;
  nome: string;
  cor: string;
  times_jogadores: { papel: Setor; jogadores: Jogador }[];
};

export default async function PaginaPartida({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, jogador } = await sessao();

  const { data } = await supabase.from("partidas").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const partida = data as Partida;

  const [{ data: presencas }, { data: times }] = await Promise.all([
    supabase
      .from("presencas")
      .select("status, jogadores(*)")
      .eq("partida_id", id)
      .order("atualizada_em", { ascending: true }),
    supabase
      .from("times")
      .select("id, numero, nome, cor, times_jogadores(papel, jogadores(*))")
      .eq("partida_id", id)
      .order("numero", { ascending: true }),
  ]);

  const formacao = acharFormacao(partida.jogadores_por_time, partida.formacao);

  const lista = (presencas ?? []) as unknown as PresencaComJogador[];
  const porStatus = (status: StatusPresenca) =>
    lista.filter((p) => p.status === status).map((p) => p.jogadores);

  const confirmados = porStatus("vou");
  const talvez = porStatus("talvez");
  const ausentes = porStatus("nao_vou");

  const meuStatus = lista.find((p) => p.jogadores?.id === jogador?.id)?.status ?? null;
  const vagas = partida.qtd_times * partida.jogadores_por_time;
  const cancelada = partida.status === "cancelada";
  const prazoEncerrado = jaPassou(partida.prazo_confirmacao);
  const timesSorteados = (times ?? []) as unknown as TimeComJogadores[];

  return (
    <div className="space-y-6">
      <Link href="/partidas" className="inline-block text-base font-semibold text-marinho-600">
        ← Todos os jogos
      </Link>

      <header className="cartao p-5">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-900">{partida.titulo}</h1>
          {cancelada && <Etiqueta cor="vermelho">Cancelado</Etiqueta>}
        </div>

        <dl className="mt-4 space-y-2 text-base">
          <Linha rotulo="Quando">
            {dataLonga(partida.inicio)} às {hora(partida.inicio)}
          </Linha>
          <Linha rotulo="Onde">{partida.local}</Linha>
          <Linha rotulo="Formato">
            {partida.qtd_times} times de {partida.jogadores_por_time}
            {formacao ? ` · ${formacao.nome}` : ""}
          </Linha>
          <Linha rotulo="Confirmar até">{dataHora(partida.prazo_confirmacao)}</Linha>
        </dl>

        {partida.observacoes && (
          <p className="mt-4 rounded-xl bg-ouro-100 px-4 py-3 text-base text-slate-800">
            {partida.observacoes}
          </p>
        )}
      </header>

      {!cancelada && (
        <section className="cartao p-5">
          <h2 className="mb-3 text-lg font-bold text-slate-800">Você vai?</h2>
          <BotoesPresenca
            partidaId={partida.id}
            jogadorId={jogador!.id}
            statusAtual={meuStatus}
            bloqueado={prazoEncerrado}
            motivoBloqueio={`O prazo encerrou em ${dataHora(partida.prazo_confirmacao)}. Fale com o organizador.`}
          />
        </section>
      )}

      {timesSorteados.length > 0 && (
        <section aria-labelledby="times">
          <h2 id="times" className="mb-3 text-lg font-bold text-slate-700">
            Times sorteados
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {timesSorteados.map((time) => (
              <CartaoTime key={time.id} time={time} />
            ))}
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {formacao
              ? `Times montados na formação ${formacao.nome} e equilibrados por nível. Quem está fora da posição de origem aparece com o papel deste jogo.`
              : "Times equilibrados por nível e posição."}{" "}
            Sortear de novo gera uma divisão diferente.
          </p>
        </section>
      )}

      <ListaJogadores
        titulo={`Confirmados (${confirmados.length}${confirmados.length > vagas ? `, ${vagas} escalados` : ""})`}
        jogadores={confirmados}
        vagas={vagas}
        vazio="Ninguém confirmou ainda. Seja o primeiro."
        cor="verde"
      />

      {talvez.length > 0 && (
        <ListaJogadores titulo={`Talvez (${talvez.length})`} jogadores={talvez} cor="ouro" />
      )}
      {ausentes.length > 0 && (
        <ListaJogadores titulo={`Não vão (${ausentes.length})`} jogadores={ausentes} cor="cinza" />
      )}

      {jogador?.admin && (
        <ControlesAdmin
          partidaId={partida.id}
          status={partida.status}
          jaSorteado={timesSorteados.length > 0}
        />
      )}
    </div>
  );
}

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-32 shrink-0 text-slate-500">{rotulo}</dt>
      <dd className="font-semibold text-slate-800">{children}</dd>
    </div>
  );
}

/**
 * Um time, com os jogadores separados por linha (Goleiro, Defesa, Meio, Ataque).
 * Se alguém foi escalado fora da posição de cadastro, mostra a posição original
 * em cinza — o organizador sabe na hora que precisa avisar "hoje você é zaga".
 */
function CartaoTime({ time }: { time: TimeComJogadores }) {
  const escalados = time.times_jogadores.filter((tj) => tj.jogadores);
  const texto = corDoTexto(time.cor);

  return (
    <article className="cartao overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3" style={{ backgroundColor: time.cor }}>
        <h3 className={`font-bold ${texto}`}>{time.nome}</h3>
        <span className={`ml-auto text-sm font-semibold ${texto} opacity-90`}>
          {escalados.length} jogadores
        </span>
      </div>

      <div className="divide-y divide-slate-100">
        {SETORES.map((setor) => {
          const doSetor = escalados.filter((tj) => tj.papel === setor);
          if (doSetor.length === 0) return null;

          return (
            <div key={setor} className="px-4 py-2.5">
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                {ROTULO_SETOR[setor]}
              </p>
              <ul className="space-y-1">
                {doSetor.map(({ jogadores: j, papel }) => {
                  const foraDePosicao = papel !== SETOR_DA_POSICAO[j.posicao];
                  return (
                    <li key={j.id} className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{j.nome}</span>
                      {foraDePosicao && (
                        <span className="text-xs text-slate-400">
                          (é {ROTULO_POSICAO[j.posicao].toLowerCase()})
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function ListaJogadores({
  titulo,
  jogadores,
  vagas,
  vazio,
  cor,
}: {
  titulo: string;
  jogadores: Jogador[];
  vagas?: number;
  vazio?: string;
  cor: "verde" | "ouro" | "cinza";
}) {
  const pontos = { verde: "bg-campo-500", ouro: "bg-ouro-400", cinza: "bg-slate-300" };

  return (
    <section>
      <h2 className="mb-3 text-lg font-bold text-slate-700">{titulo}</h2>
      {jogadores.length === 0 ? (
        <p className="cartao px-4 py-6 text-center text-base text-slate-500">{vazio}</p>
      ) : (
        <ul className="cartao divide-y divide-slate-100">
          {jogadores.map((j, indice) => {
            const reserva = vagas !== undefined && indice >= vagas;
            return (
              <li key={j.id} className="flex items-center gap-3 px-4 py-3">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${pontos[cor]}`} />
                <span className="truncate font-semibold text-slate-800">{j.nome}</span>
                {reserva && <Etiqueta cor="cinza">Reserva</Etiqueta>}
                <span className="ml-auto shrink-0 text-sm text-slate-500">
                  {ROTULO_POSICAO[j.posicao]}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Faixa clara pede texto escuro; faixa escura pede texto branco. */
function corDoTexto(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminancia > 0.6 ? "text-slate-900" : "text-white";
}
