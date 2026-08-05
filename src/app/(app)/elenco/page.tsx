import { sessao } from "@/lib/sessao";
import { nivelEfetivo, ROTULO_PERNA, ROTULO_POSICAO, type Jogador } from "@/lib/tipos";
import { Etiqueta, Vazio } from "@/components/ui";
import BotaoFuncao from "./botao-funcao";

export const metadata = { title: "Elenco — Amigos da Bola" };

export default async function PaginaElenco() {
  const { supabase, jogador } = await sessao();

  const [{ data }, { data: presencas }] = await Promise.all([
    supabase.from("jogadores").select("*").order("nome", { ascending: true }),
    supabase.from("presencas").select("jogador_id, compareceu"),
  ]);

  const elenco = (data ?? []) as Jogador[];
  const admin = jogador?.admin ?? false;

  // Presença = das vezes em que o check-in foi feito, quantas o jogador apareceu.
  const presenca = new Map<string, { apareceu: number; total: number }>();
  for (const p of (presencas ?? []) as { jogador_id: string; compareceu: boolean | null }[]) {
    if (p.compareceu === null) continue;
    const atual = presenca.get(p.jogador_id) ?? { apareceu: 0, total: 0 };
    atual.total += 1;
    if (p.compareceu) atual.apareceu += 1;
    presenca.set(p.jogador_id, atual);
  }
  const percentPresenca = (id: string) => {
    const p = presenca.get(id);
    if (!p || p.total === 0) return null;
    return Math.round((p.apareceu / p.total) * 100);
  };

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
                <p className="flex flex-wrap items-center gap-2 font-semibold text-slate-900">
                  <span className="truncate">{j.nome}</span>
                  {j.id === jogador?.id && <Etiqueta cor="azul">você</Etiqueta>}
                  {j.admin && <Etiqueta cor="ouro">organizador</Etiqueta>}
                  {j.avaliador && <Etiqueta cor="verde">avaliador</Etiqueta>}
                </p>
                <p className="text-sm text-slate-500">
                  {(j.posicoes ?? [j.posicao]).map((p) => ROTULO_POSICAO[p]).join(", ")} ·{" "}
                  {ROTULO_PERNA[j.perna]}
                  {percentPresenca(j.id) !== null && ` · ${percentPresenca(j.id)}% presença`}
                </p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <Estrelas nivel={nivelEfetivo(j)} calculado={j.nivel_calculado !== null} />
                {admin && j.id !== jogador?.id && (
                  <div className="flex flex-col items-end gap-1">
                    <BotaoFuncao jogadorId={j.id} tipo="organizador" ativo={j.admin} />
                    <BotaoFuncao jogadorId={j.id} tipo="avaliador" ativo={j.avaliador} />
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {admin && (
        <p className="text-sm text-slate-500">
          Como organizador, você define quem é <strong>organizador</strong> (cria
          e sorteia jogos) e quem é <strong>avaliador</strong> (dá as notas nos
          jogos e marca quem apareceu). O nível sai sozinho da média das notas;
          sem notas ainda, vale a auto-avaliação do perfil.
        </p>
      )}
    </div>
  );
}

function Estrelas({ nivel, calculado }: { nivel: number; calculado?: boolean }) {
  return (
    <span
      className="flex shrink-0 items-center gap-1 text-lg tracking-tight"
      aria-label={`Nível ${nivel} de 5${calculado ? ", calculado pelas notas" : ""}`}
    >
      <span className="text-ouro-400">{"★".repeat(nivel)}</span>
      <span className="text-slate-300">{"★".repeat(5 - nivel)}</span>
      {calculado && (
        <span className="text-xs font-semibold text-campo-600" title="Calculado pelas notas">
          auto
        </span>
      )}
    </span>
  );
}
