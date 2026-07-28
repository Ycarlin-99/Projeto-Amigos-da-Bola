"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Aviso, Botao } from "@/components/ui";
import {
  desfazerSorteio,
  excluirPartida,
  mudarStatusPartida,
  sortearPartida,
} from "../acoes";
import type { StatusPartida } from "@/lib/tipos";

export default function ControlesAdmin({
  partidaId,
  status,
  jaSorteado,
}: {
  partidaId: string;
  status: StatusPartida;
  jaSorteado: boolean;
}) {
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();

  function executar(acao: () => Promise<{ erro?: string } | void>) {
    setErro("");
    iniciar(async () => {
      const resultado = await acao();
      if (resultado?.erro) setErro(resultado.erro);
    });
  }

  return (
    <section className="cartao space-y-3 p-4">
      <h2 className="text-lg font-bold text-slate-800">Painel do organizador</h2>

      <div className="grid gap-2 sm:grid-cols-2">
        <Botao
          variante="sucesso"
          disabled={pendente || status === "cancelada"}
          onClick={() => executar(() => sortearPartida(partidaId))}
        >
          {jaSorteado ? "Sortear de novo" : "Sortear os times"}
        </Botao>

        <Link
          href={`/partidas/${partidaId}/editar`}
          className="botao inline-flex items-center justify-center rounded-xl border border-marinho-200 bg-white px-5 py-3 text-base font-semibold text-marinho-700 hover:bg-marinho-50"
        >
          Editar o jogo
        </Link>

        {jaSorteado && (
          <Botao
            variante="secundario"
            disabled={pendente}
            onClick={() => executar(() => desfazerSorteio(partidaId))}
          >
            Apagar os times
          </Botao>
        )}

        {status === "agendada" ? (
          <Botao
            variante="perigo"
            disabled={pendente}
            onClick={() => {
              if (confirm("Cancelar este jogo? Todo mundo vai ver que foi cancelado."))
                executar(() => mudarStatusPartida(partidaId, "cancelada"));
            }}
          >
            Cancelar o jogo
          </Botao>
        ) : (
          <Botao
            variante="secundario"
            disabled={pendente}
            onClick={() => executar(() => mudarStatusPartida(partidaId, "agendada"))}
          >
            Reativar o jogo
          </Botao>
        )}

        <Botao
          variante="perigo"
          disabled={pendente}
          onClick={() => {
            if (confirm("Apagar este jogo de vez? Isso não tem volta."))
              executar(() => excluirPartida(partidaId));
          }}
        >
          Apagar o jogo
        </Botao>
      </div>

      {pendente && <p className="text-sm text-slate-500">Salvando…</p>}
      <Aviso>{erro}</Aviso>
    </section>
  );
}
