"use client";

import { useState, useTransition } from "react";
import { ajustarNivel } from "../perfil/acoes";
import { ROTULO_NIVEL } from "@/lib/tipos";

/** Ajuste rápido do nível de um jogador — só aparece para o organizador. */
export default function SeletorNivel({
  jogadorId,
  nivelAtual,
}: {
  jogadorId: string;
  nivelAtual: number;
}) {
  const [nivel, setNivel] = useState(nivelAtual);
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();

  return (
    <label className="flex items-center gap-2">
      <span className="sr-only">Nível do jogador</span>
      <select
        value={nivel}
        disabled={pendente}
        onChange={(e) => {
          const novo = Number(e.target.value);
          const anterior = nivel;
          setNivel(novo);
          setErro("");
          iniciar(async () => {
            const resultado = await ajustarNivel(jogadorId, novo);
            if (resultado?.erro) {
              setNivel(anterior);
              setErro(resultado.erro);
            }
          });
        }}
        className="min-h-11 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-semibold text-slate-700"
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>
            {n} — {ROTULO_NIVEL[n]}
          </option>
        ))}
      </select>
      {erro && <span className="text-sm text-red-700">{erro}</span>}
    </label>
  );
}
