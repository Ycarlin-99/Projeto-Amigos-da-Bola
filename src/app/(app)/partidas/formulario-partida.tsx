"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Aviso, AreaTexto, Botao, Campo, Entrada, Selecao } from "@/components/ui";
import { isoParaLocal } from "@/lib/datas";
import { formacoesPara } from "@/lib/formacoes";
import type { Partida } from "@/lib/tipos";

type Acao = (anterior: { erro?: string }, dados: FormData) => Promise<{ erro?: string }>;

export default function FormularioPartida({
  acao,
  partida,
  rotuloEnvio,
}: {
  acao: Acao;
  partida?: Partida;
  rotuloEnvio: string;
}) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  const [inicio, setInicio] = useState(partida ? isoParaLocal(partida.inicio) : "");
  const [prazo, setPrazo] = useState(
    partida ? isoParaLocal(partida.prazo_confirmacao) : "",
  );

  // As táticas dependem do tamanho do time, então esses dois campos andam juntos.
  const [porTime, setPorTime] = useState(partida?.jogadores_por_time ?? 5);
  const [formacao, setFormacao] = useState(partida?.formacao ?? "");
  const taticas = formacoesPara(porTime);

  function aoMudarPorTime(valor: number) {
    setPorTime(valor);
    // A tática escolhida pode não existir no novo tamanho — volta ao automático.
    if (!formacoesPara(valor).some((t) => t.id === formacao)) setFormacao("");
  }

  /**
   * Ao escolher a data do jogo, sugere o prazo de confirmação para 3 horas antes.
   * O organizador pode mudar — mas assim ele não precisa nem pensar nisso, que é
   * o campo que mais gera dúvida no formulário.
   */
  function aoMudarInicio(valor: string) {
    setInicio(valor);
    if (!valor) return;
    if (prazo && partida) return;

    const sugestao = new Date(valor);
    sugestao.setHours(sugestao.getHours() - 3);
    setPrazo(isoParaLocal(sugestao.toISOString()));
  }

  return (
    <form action={enviar} className="cartao space-y-5 p-5">
      <Campo rotulo="Nome do jogo">
        <Entrada
          name="titulo"
          defaultValue={partida?.titulo ?? "Pelada de sábado"}
          maxLength={60}
        />
      </Campo>

      <Campo rotulo="Local" dica="Nome da quadra ou campo, do jeito que o pessoal conhece.">
        <Entrada
          name="local"
          required
          defaultValue={partida?.local ?? ""}
          placeholder="Society do Parque"
        />
      </Campo>

      <Campo rotulo="Dia e hora do jogo">
        <Entrada
          type="datetime-local"
          name="inicio"
          required
          value={inicio}
          onChange={(e) => aoMudarInicio(e.target.value)}
        />
      </Campo>

      <Campo
        rotulo="Confirmar presença até"
        dica="Depois desse horário ninguém muda mais a resposta."
      >
        <Entrada
          type="datetime-local"
          name="prazo_confirmacao"
          required
          value={prazo}
          onChange={(e) => setPrazo(e.target.value)}
        />
      </Campo>

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo rotulo="Quantos times">
          <Selecao name="qtd_times" defaultValue={String(partida?.qtd_times ?? 2)}>
            {[2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n} times
              </option>
            ))}
          </Selecao>
        </Campo>

        <Campo rotulo="Jogadores por time">
          <Selecao
            name="jogadores_por_time"
            value={String(porTime)}
            onChange={(e) => aoMudarPorTime(Number(e.target.value))}
          >
            {[3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => (
              <option key={n} value={n}>
                {n} por time
              </option>
            ))}
          </Selecao>
        </Campo>
      </div>

      <Campo
        rotulo="Tática do sorteio"
        dica="Define como os times são montados. No automático, o sorteio só equilibra os setores; numa tática, ele preenche exatamente aquele desenho."
      >
        <Selecao
          name="formacao"
          value={formacao}
          onChange={(e) => setFormacao(e.target.value)}
        >
          <option value="">Automático (só equilibra)</option>
          {taticas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome} — {t.descricao}
            </option>
          ))}
        </Selecao>
      </Campo>

      <Campo rotulo="Recado (opcional)" dica="Ex.: levar camisa branca, R$ 20 por cabeça.">
        <AreaTexto name="observacoes" rows={3} defaultValue={partida?.observacoes ?? ""} />
      </Campo>

      <Aviso>{estado.erro}</Aviso>

      <div className="flex gap-3">
        <Botao type="submit" disabled={pendente} className="flex-1">
          {pendente ? "Salvando…" : rotuloEnvio}
        </Botao>
        <Link
          href={partida ? `/partidas/${partida.id}` : "/partidas"}
          className="botao inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-base font-semibold text-slate-700 hover:bg-slate-50"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
