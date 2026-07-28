"use client";

import { useActionState } from "react";
import { Aviso, Botao, Campo, Entrada, Selecao } from "@/components/ui";
import {
  PERNAS,
  POSICOES,
  ROTULO_NIVEL,
  ROTULO_PERNA,
  ROTULO_POSICAO,
  type Jogador,
} from "@/lib/tipos";
import { salvarPerfil } from "./acoes";

export default function FormularioPerfil({ jogador }: { jogador: Jogador }) {
  const [estado, enviar, pendente] = useActionState(salvarPerfil, {});

  return (
    <form action={enviar} className="cartao space-y-5 p-5">
      <Campo rotulo="Nome">
        <Entrada name="nome" required defaultValue={jogador.nome} autoComplete="name" />
      </Campo>

      <Campo rotulo="Telefone (opcional)" dica="Serve para o organizador te achar no WhatsApp.">
        <Entrada
          name="telefone"
          type="tel"
          inputMode="tel"
          defaultValue={jogador.telefone ?? ""}
          placeholder="(11) 90000-0000"
          autoComplete="tel"
        />
      </Campo>

      <Campo rotulo="Posição que você joga">
        <Selecao name="posicao" defaultValue={jogador.posicao}>
          {POSICOES.map((p) => (
            <option key={p} value={p}>
              {ROTULO_POSICAO[p]}
            </option>
          ))}
        </Selecao>
      </Campo>

      <Campo rotulo="Perna boa">
        <Selecao name="perna" defaultValue={jogador.perna}>
          {PERNAS.map((p) => (
            <option key={p} value={p}>
              {ROTULO_PERNA[p]}
            </option>
          ))}
        </Selecao>
      </Campo>

      <Campo
        rotulo="Seu nível"
        dica="É o que o sorteio usa para deixar os times parelhos. Seja honesto — jogo equilibrado é mais divertido."
      >
        <Selecao name="nivel" defaultValue={String(jogador.nivel)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n} — {ROTULO_NIVEL[n]}
            </option>
          ))}
        </Selecao>
      </Campo>

      <Aviso>{estado.erro}</Aviso>
      {estado.salvo && !estado.erro && <Aviso tipo="info">Tudo certo, perfil salvo.</Aviso>}

      <Botao type="submit" disabled={pendente} className="w-full">
        {pendente ? "Salvando…" : "Salvar meu perfil"}
      </Botao>
    </form>
  );
}
