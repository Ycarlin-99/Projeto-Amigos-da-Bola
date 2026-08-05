"use client";

import { useState, useTransition } from "react";
import { alternarOrganizador } from "./acoes";

/** Botão para o organizador promover/rebaixar outra pessoa. */
export default function BotaoOrganizador({
  jogadorId,
  ehOrganizador,
}: {
  jogadorId: string;
  ehOrganizador: boolean;
}) {
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();

  function clicar() {
    setErro("");
    iniciar(async () => {
      const resultado = await alternarOrganizador(jogadorId, !ehOrganizador);
      if (resultado?.erro) setErro(resultado.erro);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={clicar}
        disabled={pendente}
        className={`min-h-11 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
          ehOrganizador
            ? "border-red-200 bg-white text-red-700 hover:bg-red-50"
            : "border-marinho-200 bg-white text-marinho-700 hover:bg-marinho-50"
        }`}
      >
        {pendente ? "…" : ehOrganizador ? "Remover organizador" : "Tornar organizador"}
      </button>
      {erro && <span className="text-sm text-red-700">{erro}</span>}
    </div>
  );
}
