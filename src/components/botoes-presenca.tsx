"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import type { StatusPresenca } from "@/lib/tipos";

const OPCOES: { valor: StatusPresenca; rotulo: string; ativo: string }[] = [
  { valor: "vou", rotulo: "Vou", ativo: "bg-campo-600 text-white border-campo-600" },
  { valor: "talvez", rotulo: "Talvez", ativo: "bg-ouro-400 text-marinho-900 border-ouro-400" },
  { valor: "nao_vou", rotulo: "Não vou", ativo: "bg-slate-600 text-white border-slate-600" },
];

/**
 * Três botões, um toque, resposta imediata.
 *
 * A escolha aparece marcada antes da resposta do servidor (atualização
 * otimista): no campo, com 4G ruim, esperar 800ms faz o jogador achar que não
 * funcionou e tocar de novo. Se der erro, volta para o estado anterior e avisa.
 */
export default function BotoesPresenca({
  partidaId,
  jogadorId,
  statusAtual,
  bloqueado,
  motivoBloqueio,
}: {
  partidaId: string;
  jogadorId: string;
  statusAtual: StatusPresenca | null;
  bloqueado?: boolean;
  motivoBloqueio?: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(statusAtual);
  const [erro, setErro] = useState("");
  const [, iniciarTransicao] = useTransition();

  async function responder(novo: StatusPresenca) {
    if (bloqueado || novo === status) return;

    const anterior = status;
    setStatus(novo);
    setErro("");

    const { error } = await criarClienteNavegador().from("presencas").upsert(
      {
        partida_id: partidaId,
        jogador_id: jogadorId,
        status: novo,
        atualizada_em: new Date().toISOString(),
      },
      { onConflict: "partida_id,jogador_id" },
    );

    if (error) {
      setStatus(anterior);
      setErro("Não deu para salvar. Verifique a internet e toque de novo.");
      return;
    }

    iniciarTransicao(() => router.refresh());
  }

  return (
    <div>
      <div role="group" aria-label="Você vai jogar?" className="grid grid-cols-3 gap-2">
        {OPCOES.map(({ valor, rotulo, ativo }) => {
          const marcado = status === valor;
          return (
            <button
              key={valor}
              type="button"
              onClick={() => responder(valor)}
              disabled={bloqueado}
              aria-pressed={marcado}
              className={`rounded-xl border-2 px-3 py-3 text-base font-bold transition-colors ${
                marcado
                  ? ativo
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              } ${bloqueado ? "cursor-not-allowed opacity-50" : ""}`}
            >
              {rotulo}
            </button>
          );
        })}
      </div>

      {bloqueado && motivoBloqueio && (
        <p className="mt-2 text-sm text-slate-500">{motivoBloqueio}</p>
      )}
      {erro && (
        <p role="alert" className="mt-2 text-sm font-semibold text-red-700">
          {erro}
        </p>
      )}
    </div>
  );
}
