"use client";

import { useState, useTransition } from "react";
import { alternarAvaliador, alternarOrganizador } from "./acoes";

type Tipo = "organizador" | "avaliador";

const TEXTO: Record<Tipo, { ativar: string; remover: string }> = {
  organizador: { ativar: "Tornar organizador", remover: "Tirar organizador" },
  avaliador: { ativar: "Tornar avaliador", remover: "Tirar avaliador" },
};

/** Botão do organizador para dar/tirar uma função (organizador ou avaliador). */
export default function BotaoFuncao({
  jogadorId,
  tipo,
  ativo,
}: {
  jogadorId: string;
  tipo: Tipo;
  ativo: boolean;
}) {
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();

  function clicar() {
    setErro("");
    iniciar(async () => {
      const acao = tipo === "organizador" ? alternarOrganizador : alternarAvaliador;
      const resultado = await acao(jogadorId, !ativo);
      if (resultado?.erro) setErro(resultado.erro);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={clicar}
        disabled={pendente}
        className={`min-h-9 rounded-lg border px-3 py-1 text-sm font-semibold transition-colors disabled:opacity-50 ${
          ativo
            ? "border-red-200 bg-white text-red-700 hover:bg-red-50"
            : "border-marinho-200 bg-white text-marinho-700 hover:bg-marinho-50"
        }`}
      >
        {pendente ? "…" : ativo ? TEXTO[tipo].remover : TEXTO[tipo].ativar}
      </button>
      {erro && <span className="text-sm text-red-700">{erro}</span>}
    </div>
  );
}
