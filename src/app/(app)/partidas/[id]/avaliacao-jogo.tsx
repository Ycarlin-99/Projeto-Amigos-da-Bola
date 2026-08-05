"use client";

import { useState, useTransition } from "react";
import { marcarComparecimento, salvarNota } from "./avaliacao-acoes";

export type ItemAvaliacao = {
  id: string;
  nome: string;
  compareceu: boolean | null;
  nota: number | null;
};

/** Painel do avaliador: marca quem veio e dá a nota de cada um. */
export default function AvaliacaoJogo({
  partidaId,
  jogadores,
}: {
  partidaId: string;
  jogadores: ItemAvaliacao[];
}) {
  return (
    <section className="cartao p-5">
      <h2 className="text-lg font-bold text-slate-800">Avaliação do jogo</h2>
      <p className="mb-4 mt-1 text-sm text-slate-500">
        Marque quem apareceu e dê a nota (0 a 10). O nível de cada jogador é
        recalculado sozinho pela média das notas.
      </p>
      <ul className="divide-y divide-slate-100">
        {jogadores.map((j) => (
          <LinhaAvaliacao key={j.id} partidaId={partidaId} item={j} />
        ))}
      </ul>
    </section>
  );
}

function LinhaAvaliacao({ partidaId, item }: { partidaId: string; item: ItemAvaliacao }) {
  const [compareceu, setCompareceu] = useState(item.compareceu);
  const [nota, setNota] = useState<number | "">(item.nota ?? "");
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();

  function alternarPresenca(valor: boolean) {
    const anterior = compareceu;
    setCompareceu(valor);
    setErro("");
    iniciar(async () => {
      const r = await marcarComparecimento(partidaId, item.id, valor);
      if (r?.erro) {
        setCompareceu(anterior);
        setErro(r.erro);
      }
    });
  }

  function mudarNota(valor: string) {
    if (valor === "") {
      setNota("");
      return;
    }
    const n = Number(valor);
    const anterior = nota;
    setNota(n);
    setErro("");
    iniciar(async () => {
      const r = await salvarNota(partidaId, item.id, n);
      if (r?.erro) {
        setNota(anterior);
        setErro(r.erro);
      }
    });
  }

  const botao = (ativo: boolean, cor: string) =>
    `min-h-9 rounded-lg border px-3 py-1 text-sm font-semibold transition-colors disabled:opacity-50 ${
      ativo ? cor : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
    }`;

  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <span className="min-w-0 flex-1 truncate font-semibold text-slate-800">{item.nome}</span>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => alternarPresenca(true)}
          disabled={pendente}
          className={botao(compareceu === true, "border-campo-600 bg-campo-600 text-white")}
        >
          Veio
        </button>
        <button
          type="button"
          onClick={() => alternarPresenca(false)}
          disabled={pendente}
          className={botao(compareceu === false, "border-red-500 bg-red-500 text-white")}
        >
          Faltou
        </button>
      </div>

      <label className="flex items-center gap-1">
        <span className="text-sm text-slate-500">Nota</span>
        <select
          value={nota}
          onChange={(e) => mudarNota(e.target.value)}
          disabled={pendente}
          className="min-h-9 rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm font-semibold text-slate-700"
        >
          <option value="">—</option>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>

      {erro && <span className="w-full text-sm text-red-700">{erro}</span>}
    </li>
  );
}
