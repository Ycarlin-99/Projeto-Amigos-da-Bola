"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { criarClienteNavegador } from "@/lib/supabase/cliente";

const TABELAS = ["presencas", "partidas", "times", "times_jogadores"];

/**
 * Mantém o app atualizado sozinho.
 *
 * Fica montado no layout, então é UMA assinatura só para o app inteiro: quando
 * alguém confirma presença ou o organizador sorteia os times, o Supabase avisa
 * e o `router.refresh()` traz os Server Components já com o dado novo — sem
 * recarregar a página, sem perder o que o usuário estava fazendo.
 *
 * O agrupamento por tempo evita rajada de refresh quando cinco pessoas
 * confirmam ao mesmo tempo depois do lembrete no grupo do WhatsApp.
 */
export default function AoVivo() {
  const router = useRouter();
  const agendado = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = criarClienteNavegador();

    function agendarAtualizacao() {
      if (agendado.current) clearTimeout(agendado.current);
      agendado.current = setTimeout(() => router.refresh(), 400);
    }

    const canal = supabase.channel("amigos-da-bola");
    for (const table of TABELAS) {
      canal.on("postgres_changes", { event: "*", schema: "public", table }, agendarAtualizacao);
    }
    canal.subscribe();

    // Voltar de segundo plano (celular bloqueado, outra aba) pode ter perdido
    // eventos: ao reaparecer, busca o estado atual uma vez.
    function aoVoltar() {
      if (document.visibilityState === "visible") agendarAtualizacao();
    }
    document.addEventListener("visibilitychange", aoVoltar);

    return () => {
      if (agendado.current) clearTimeout(agendado.current);
      document.removeEventListener("visibilitychange", aoVoltar);
      supabase.removeChannel(canal);
    };
  }, [router]);

  return null;
}
